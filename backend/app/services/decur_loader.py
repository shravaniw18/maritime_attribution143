"""
decur_loader.py — DeCUR checkpoint loader (SAR + EO branches)
================================================================
Loads a DeCUR-pretrained ResNet-50 encoder into a DeepLabv3 model's
backbone. DeCUR (zhu-xlab/DeCUR, Apache-2.0) publishes:
  * A SAR-only backbone checkpoint (plain ResNet-50 keys).
  * A joint SAR+optical checkpoint with two encoders:
      backbone_1.*  -> SAR   (2-channel, VV/VH)
      backbone_2.*  -> optical (13-channel Sentinel-2, or reduced RGB)
    possibly wrapped in module.* (DDP training wrapper).

load_decur_backbone(..., modality="sar")  loads backbone_1 / a
    backbone-only checkpoint into a SAR-branch model's backbone.
load_decur_backbone(..., modality="eo")   loads backbone_2 from a joint
    checkpoint into an EO-branch model's backbone. A modality="eo" call
    against a SAR-only checkpoint will correctly fail the match-ratio
    check and fall back to random, since no backbone_2 keys exist there.
"""

import logging
import torch

logger = logging.getLogger("polaris.decur_loader")

_DROP_PREFIXES = ("fc.", "projector.", "predictor.", "head.", "classifier.", "aux_classifier.")
_MATCH_THRESHOLD = 0.95


def _clean_keys(state: dict, modality: str) -> dict:
    own_prefix = "backbone_1." if modality == "sar" else "backbone_2."
    other_prefix = "backbone_2." if modality == "sar" else "backbone_1."

    cleaned = {}
    for k, v in state.items():
        key = k
        if key.startswith("module."):
            key = key[len("module."):]

        if own_prefix in key:
            key = key.split(own_prefix, 1)[1]
        elif other_prefix in key:
            continue

        if any(key.startswith(p) for p in _DROP_PREFIXES):
            continue

        cleaned[key] = v
    return cleaned


def load_decur_backbone(model, checkpoint_path: str, device: str = "cpu",
                         modality: str = "sar"):
    if modality not in ("sar", "eo"):
        raise ValueError(f"modality must be 'sar' or 'eo', got {modality!r}")

    raw = torch.load(checkpoint_path, map_location=device, weights_only=False)
    state = raw.get("state_dict", raw) if isinstance(raw, dict) else raw

    cleaned = _clean_keys(state, modality)

    target_state = model.backbone.state_dict()
    matched = {
        k: v for k, v in cleaned.items()
        if k in target_state and v.shape == target_state[k].shape
    }

    match_ratio = len(matched) / max(len(target_state), 1)
    logger.info(
        "DeCUR checkpoint [%s]: %d/%d backbone keys matched (%.1f%%)",
        modality, len(matched), len(target_state), match_ratio * 100,
    )

    if match_ratio < _MATCH_THRESHOLD:
        logger.warning(
            "DeCUR checkpoint [%s] key match below %.0f%% (%.1f%%) - "
            "this checkpoint likely does not contain a %s encoder. "
            "Falling back to random init.",
            modality, _MATCH_THRESHOLD * 100, match_ratio * 100, modality,
        )
        return model, "random"

    missing, unexpected = model.backbone.load_state_dict(matched, strict=False)
    if missing:
        logger.warning("[%s] Missing keys after DeCUR load: %s", modality, missing[:5])
    if unexpected:
        logger.warning("[%s] Unexpected keys after DeCUR load: %s", modality, unexpected[:5])

    return model, "decur"
