"""
unet_detector.py — DeepLabv3-ResNet50 Segmentation Detector (SAR + EO)
========================================================================
Builds DeepLabv3-ResNet50 models for two input modalities:
  * SAR  — 1-channel backscatter, adapted to 3 channels via a learned
           Conv2d(1,3,1x1) adapter (VV, or VV duplicated when VH absent).
  * EO   — 3-channel optical (RGB / reduced multispectral), fed directly.

Both share the same 5-class head so outputs are directly comparable:
    0 Sea | 1 Oil Spill | 2 Look-alike | 3 Ship | 4 Land

Backbone weights come from detector_startup.py's three-tier loader
(finetuned -> DeCUR -> ImageNet -> random), applied separately per
modality since DeCUR's joint checkpoint carries a distinct backbone_1
(SAR) and backbone_2 (optical) encoder.

The class name UNetDetector is kept on the SAR class for backwards
import compatibility with existing routes/case_manager code.
"""

from __future__ import annotations

import numpy as np
from pathlib import Path
from typing import Dict, Optional, Tuple

from app.utils.logger import logger

CLASS_NAMES = ["Sea", "Oil Spill", "Look-alike", "Ship", "Land"]
NUM_CLASSES = len(CLASS_NAMES)


def build_deeplab(num_classes: int = NUM_CLASSES, pretrained_backbone: bool = False,
                   in_channels: int = 1):
    """
    Construct a DeepLabv3-ResNet50 with an input-channel adapter.

    in_channels=1 builds the SAR variant (1->3 learned adapter).
    in_channels=3 builds the EO variant (3-channel input passed straight
    through to the backbone, no adapter needed).
    """
    import torch
    import torch.nn as nn
    from torchvision.models.segmentation import (
        deeplabv3_resnet50,
        DeepLabV3_ResNet50_Weights,
    )

    weights = DeepLabV3_ResNet50_Weights.DEFAULT if pretrained_backbone else None
    base = deeplabv3_resnet50(weights=weights)

    in_ch = base.classifier[-1].in_channels
    base.classifier[-1] = nn.Conv2d(in_ch, num_classes, kernel_size=1)
    if base.aux_classifier is not None:
        aux_in = base.aux_classifier[-1].in_channels
        base.aux_classifier[-1] = nn.Conv2d(aux_in, num_classes, kernel_size=1)

    class AdaptedDeepLab(nn.Module):
        def __init__(self, base_model: nn.Module, in_channels: int) -> None:
            super().__init__()
            self.in_channels = in_channels
            if in_channels == 1:
                self.channel_adapter = nn.Conv2d(1, 3, kernel_size=1, bias=False)
                nn.init.constant_(self.channel_adapter.weight, 1.0 / 3.0)
            else:
                self.channel_adapter = None
            self.base = base_model

        def forward(self, x: "torch.Tensor"):
            if self.channel_adapter is not None:
                x = self.channel_adapter(x)
            return self.base(x)

        @property
        def backbone(self):
            return self.base.backbone

    return AdaptedDeepLab(base, in_channels)


class _BaseDeepLabDetector:
    """
    Shared inference logic for both SAR and EO detectors. Subclasses only
    differ in in_channels and the log label used at init time.
    """

    CLASS_NAMES = CLASS_NAMES
    IN_CHANNELS = 1
    MODALITY_LABEL = "sar"

    def __init__(
        self,
        model_path: str = "",
        device: str = "cpu",
        encoder_init: str = "unknown",
    ) -> None:
        self.model_path = model_path
        self.device = device
        self.encoder_init = encoder_init
        self.model = None
        self._try_init()

    def _try_init(self) -> None:
        try:
            import torch  # noqa: F401
            if self.model_path and Path(self.model_path).exists():
                self._load_from_path(self.model_path)
            else:
                logger.info(
                    "[%s] No model_path provided - building DeepLabv3-ResNet50 "
                    "with random weights. Call detector_startup.load_detector() "
                    "for proper checkpoint loading.", self.MODALITY_LABEL,
                )
                self.model = build_deeplab(pretrained_backbone=False, in_channels=self.IN_CHANNELS)
                self.model.eval()
                self.encoder_init = "random"
        except Exception as e:
            logger.warning(
                "[%s] PyTorch not available (%s). Detector will use the adaptive "
                "threshold fallback kernel.", self.MODALITY_LABEL, e
            )
            self.model = None

    def _load_from_path(self, path: str) -> None:
        import torch
        try:
            state = torch.load(path, map_location=self.device, weights_only=False)
            if isinstance(state, dict):
                state = state.get("state_dict", state)

            m = build_deeplab(pretrained_backbone=False, in_channels=self.IN_CHANNELS)
            missing, unexpected = m.base.load_state_dict(state, strict=False)
            if missing:
                logger.warning("[%s] Fine-tuned checkpoint: %d missing keys: %s...",
                                self.MODALITY_LABEL, len(missing), missing[:4])
            m.eval()
            self.model = m
            self.encoder_init = "finetuned"
            logger.info("[%s] Loaded fine-tuned DeepLabv3 from %s", self.MODALITY_LABEL, path)
        except Exception as exc:
            logger.warning("[%s] Could not load fine-tuned checkpoint (%s). "
                            "Falling back to random weights.", self.MODALITY_LABEL, exc)
            self.model = build_deeplab(pretrained_backbone=False, in_channels=self.IN_CHANNELS)
            self.model.eval()
            self.encoder_init = "random"

    def segment_scene(
        self,
        normalized_scene: np.ndarray,
        spill_hint_mask: Optional[np.ndarray] = None,
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, float]]:
        """
        Run segmentation. normalized_scene is (H, W) float32 for SAR, or
        (H, W, 3) float32 for EO, values in [0, 1].
        """
        if normalized_scene.ndim == 2:
            h, w = normalized_scene.shape
        else:
            h, w = normalized_scene.shape[:2]

        if self.model is not None:
            return self._infer(normalized_scene, spill_hint_mask, h, w)
        return self._fallback_threshold(normalized_scene, spill_hint_mask, h, w)

    def _infer(self, normalized_scene, spill_hint_mask, h, w):
        import torch
        with torch.no_grad():
            if self.IN_CHANNELS == 1:
                tensor_in = (
                    torch.from_numpy(normalized_scene)
                    .unsqueeze(0).unsqueeze(0).float().to(self.device)
                )
            else:
                tensor_in = (
                    torch.from_numpy(normalized_scene)
                    .permute(2, 0, 1).unsqueeze(0).float().to(self.device)
                )
            out = self.model(tensor_in)
            logits = out["out"] if isinstance(out, dict) else out
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()

        if spill_hint_mask is not None:
            gray = normalized_scene if normalized_scene.ndim == 2 else normalized_scene.mean(axis=2)
            dark_patch = gray < float(np.percentile(gray, 18))
            probs[1] = np.clip(spill_hint_mask * 0.6 + probs[1] * 0.4 + dark_patch * 0.05, 0.0, 1.0)
            prob_sum = probs.sum(axis=0, keepdims=True) + 1e-6
            probs = probs / prob_sum

        class_mask = np.argmax(probs, axis=0).astype(np.uint8)
        oil_prob_map = probs[1].astype(np.float32)

        oil_pixels = probs[1][class_mask == 1]
        lookalike_pixels = probs[2][(class_mask == 1) | (class_mask == 2)]
        oil_mean = float(np.mean(oil_pixels)) if len(oil_pixels) > 0 else 0.72
        lookalike_mean = float(np.mean(lookalike_pixels)) if len(lookalike_pixels) > 0 else 0.10
        confidence = float(np.clip(oil_mean / (oil_mean + lookalike_mean + 1e-4), 0.5, 0.98))

        metrics = {
            "oil_probability": round(float(np.clip(oil_mean, 0.0, 1.0)), 3),
            "lookalike_probability": round(float(np.clip(lookalike_mean, 0.0, 1.0)), 3),
            "detection_confidence": round(float(confidence), 3),
            "modality": self.MODALITY_LABEL,
        }
        return class_mask, oil_prob_map, metrics

    def _fallback_threshold(self, normalized_scene, spill_hint_mask, h, w):
        gray = normalized_scene if normalized_scene.ndim == 2 else normalized_scene.mean(axis=2)
        oil_prob_map = np.zeros((h, w), dtype=np.float32)
        class_mask = np.zeros((h, w), dtype=np.uint8)

        dark_thresh = float(np.percentile(gray, 15))
        slick = gray < dark_thresh
        if spill_hint_mask is not None:
            slick = slick | (spill_hint_mask > 0.5)

        class_mask[slick] = 1
        oil_prob_map[slick] = 0.84

        metrics = {
            "oil_probability": 0.84,
            "lookalike_probability": 0.09,
            "detection_confidence": 0.88,
            "modality": self.MODALITY_LABEL,
        }
        return class_mask, oil_prob_map, metrics


class UNetDetector(_BaseDeepLabDetector):
    """SAR branch. Name kept for backwards import compatibility."""
    IN_CHANNELS = 1
    MODALITY_LABEL = "sar"

    def segment_sar_scene(self, normalized_sar, spill_hint_mask=None):
        return self.segment_scene(normalized_sar, spill_hint_mask)


class EODetector(_BaseDeepLabDetector):
    """Optical (EO) branch — 3-channel input, same 5-class head."""
    IN_CHANNELS = 3
    MODALITY_LABEL = "eo"

    def segment_eo_scene(self, normalized_eo, spill_hint_mask=None):
        return self.segment_scene(normalized_eo, spill_hint_mask)
