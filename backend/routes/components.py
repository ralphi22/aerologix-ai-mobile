"""
Component Settings Routes for AeroLogix AI
Manages aircraft component maintenance intervals
Transport Canada RAC 605 / Standard 625 compliant (INFORMATIONAL ONLY)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
import logging

from models.component_settings import (
    ComponentSettingsCreate,
    ComponentSettingsUpdate,
    CANADIAN_REGULATIONS
)
from models.user import User
from services.auth_deps import get_current_user
from database.mongodb import get_database

router = APIRouter(prefix="/api/components", tags=["components"])
logger = logging.getLogger(__name__)

@router.get("/aircraft/{aircraft_id}")
async def get_component_settings(
    aircraft_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get component settings for an aircraft"""
    # Verify aircraft belongs to user
    aircraft = await db.aircraft.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    settings = await db.component_settings.find_one({
        "aircraft_id": aircraft_id,
        "user_id": current_user.id
    })
    
    if not settings:
        # Return defaults
        return {
            "aircraft_id": aircraft_id,
            "engine_model": None,
            "engine_tbo_hours": 2000.0,
            "engine_hours_since_overhaul": None,
            "engine_last_overhaul_date": None,
            "propeller_type": "fixed",
            "propeller_model": None,
            "propeller_manufacturer_interval_years": None,
            "propeller_hours_since_inspection": None,
            "propeller_last_inspection_date": None,
            "avionics_last_certification_date": None,
            "avionics_certification_interval_months": 24,
            "magnetos_model": None,
            "magnetos_interval_hours": 500.0,
            "magnetos_hours_since_inspection": None,
            "magnetos_last_inspection_date": None,
            "vacuum_pump_model": None,
            "vacuum_pump_interval_hours": 400.0,
            "vacuum_pump_hours_since_replacement": None,
            "vacuum_pump_last_replacement_date": None,
            "airframe_last_annual_date": None,
            "airframe_hours_since_annual": None,
            "regulations": CANADIAN_REGULATIONS
        }
    
    settings["_id"] = str(settings["_id"])
    settings["regulations"] = CANADIAN_REGULATIONS
    return settings

@router.post("/aircraft/{aircraft_id}")
async def create_component_settings(
    aircraft_id: str,
    data: ComponentSettingsCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create or update component settings"""
    # Verify aircraft belongs to user
    aircraft = await db.aircraft.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    now = datetime.utcnow()
    settings_doc = {
        "aircraft_id": aircraft_id,
        "user_id": current_user.id,
        **data.model_dump(exclude_none=True),
        "updated_at": now
    }
    
    # Upsert
    result = await db.component_settings.update_one(
        {"aircraft_id": aircraft_id, "user_id": current_user.id},
        {"$set": settings_doc, "$setOnInsert": {"created_at": now}},
        upsert=True
    )
    
    logger.info(f"Component settings saved for aircraft {aircraft_id}")
    return {"message": "Settings saved", "aircraft_id": aircraft_id}

@router.put("/aircraft/{aircraft_id}")
async def update_component_settings(
    aircraft_id: str,
    data: ComponentSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update component settings"""
    # Verify aircraft belongs to user
    aircraft = await db.aircraft.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.component_settings.update_one(
        {"aircraft_id": aircraft_id, "user_id": current_user.id},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Component settings updated for aircraft {aircraft_id}")
    return {"message": "Settings updated", "aircraft_id": aircraft_id}

@router.get("/regulations")
async def get_regulations():
    """Get Canadian regulations reference values (INFORMATIONAL ONLY)"""
    return {
        "disclaimer": "Ces valeurs sont INFORMATIVES uniquement. Consultez toujours les documents officiels et un AME certifié.",
        "regulations": CANADIAN_REGULATIONS,
        "sources": [
            "Transport Canada RAC 605",
            "Transport Canada Standard 625"
        ]
    }
