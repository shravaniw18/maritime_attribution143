"""
detector_startup.py — Three-Tier Model Loading (SAR + EO)
============================================================
Called once during FastAPI lifespan startup. For EACH modality (sar, eo)
tries, in priority order:

  1. Fine-tuned full checkpoint  (FINETUNED_MODEL_PATH / FINETUNED_MODEL_PATH_EO)
  2. DeCUR backbone checkpoint   (DECUR_CHECKPOINT / DECUR_CHECKPOINT_EO)
  3. ImageNet pre-trained         (torchvision default weights)

Returns a dict: {"sar": (detector, encoder_init), "eo": (detector, encoder_init)}

load_all_detectors() is the new entry point. load_detector() is kept as a
thin backwards-compatible wrapper that returns only the SAR result.
"""

from __future__ import annotations

import logging
from typing import Dict, Tuple

logger = logging.getLogger("polaris.detector_startup")


def _load_one(settings, modality: str) -> Tuple[object, str]:
    from app.services.unet_detector import UNetDetector, EODetector, build_deeplab

    device = getattr(settings, "DEVICE", None) or "cpu"
    detector_cls = UNetDetector if modality == "sar" else EODetector
    in_channels = 1 if modality == "sar" else 3

    finetuned_path = getattr(settings, "FINETUNED_MODEL_PATH", "") if modality == "sar" \
        else getattr(settings, "FINETUNED_MODEL_PATH_EO", "")
    decur_path = getattr(settings, "DECUR_CHECKPOINT", "") if modality == "sar" \
        else getattr(settings, "DECUR_CHECKPOINT_EO", "")

    if finetuned_path:
        logger.info("[%s] Tier 1 - Loading fine-tuned DeepLabv3 from: %s", modality, finetuned_path)
        try:
            det = detector_cls(model_path=finetuned_path, device=device)
            if det.encoder_init == "finetuned":
                logger.info("[%s] Tier 1 SUCCESS - encoder_init=finetuned", modality)
                return det, "finetuned"
            logger.warning("[%s] Tier 1 checkpoint loaded but encoder_init=%s; continuing to Tier 2.",
                            modality, det.encoder_init)
        except Exception as exc:
            logger.warning("[%s] Tier 1 failed (%s). Trying Tier 2.", modality, exc)

    if decur_path:
        logger.info("[%s] Tier 2 - Loading DeCUR backbone from: %s", modality, decur_path)
        try:
            from app.services.decur_loader import load_decur_backbone

            model = build_deeplab(pretrained_backbone=False, in_channels=in_channels)
            model, enc_init = load_decur_backbone(model, decur_path, device=device, modality=modality)
            model = model.to(device)
            model.eval()

            det = detector_cls(device=device, encoder_init=enc_init)
            det.model = model
            logger.info("[%s] Tier 2 %s - encoder_init=%s", modality,
                        "SUCCESS" if enc_init == "decur" else "FELL THROUGH", enc_init)
            if enc_init == "decur":
                return det, enc_init
        except Exception as exc:
            logger.warning("[%s] Tier 2 failed (%s). Falling back to Tier 3.", modality, exc)

    logger.info("[%s] Tier 3 - Building DeepLabv3-ResNet50 with ImageNet backbone weights.", modality)
    try:
        model = build_deeplab(pretrained_backbone=True, in_channels=in_channels)
        model = model.to(device)
        model.eval()

        det = detector_cls(device=device, encoder_init="imagenet")
        det.model = model
        logger.info("[%s] Tier 3 SUCCESS - encoder_init=imagenet", modality)
        return det, "imagenet"
    except Exception as exc:
        logger.warning("[%s] Tier 3 also failed (%s). Detector will use threshold fallback.", modality, exc)

    det = detector_cls(device=device, encoder_init="random")
    det.model = None
    logger.error("[%s] ALL loading tiers failed. Detector is using the adaptive-threshold "
                 "fallback kernel. encoder_init=random.", modality)
    return det, "random"


def load_all_detectors(settings) -> Dict[str, Tuple[object, str]]:
    return {
        "sar": _load_one(settings, "sar"),
        "eo": _load_one(settings, "eo"),
    }


def load_detector(settings) -> Tuple[object, str]:
    """Backwards-compatible: SAR-only, matches the original single-branch API."""
    return _load_one(settings, "sar")
