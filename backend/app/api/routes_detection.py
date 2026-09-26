from fastapi import APIRouter, HTTPException, Request
from app.models.schemas import SpillDetectionResult
from app.services.case_manager import case_manager

router = APIRouter(prefix="/detection", tags=["Detection"])

@router.get("/{case_id}", response_model=SpillDetectionResult)
async def get_spill_detection(case_id: str, request: Request):
    """Returns SAR segmentation results, polygon geometry, and class probabilities."""
    detection = case_manager.get_detection(case_id)
    if not detection:
        raise HTTPException(status_code=404, detail=f"No detection found for case '{case_id}'.")
    
    # Inject encoder statuses from app.state (if populated by lifespan)
    if hasattr(request.app.state, "encoder_init_eo"):
        detection.eo_encoder_init = request.app.state.encoder_init_eo
    
    return detection
