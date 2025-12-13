from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from database.mongodb import get_database
from models.aircraft import Aircraft, AircraftCreate, AircraftUpdate
from models.user import User
from routes.auth import get_current_user
from datetime import datetime
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/aircraft", tags=["aircraft"])

def format_registration(registration: str) -> str:
    """Format registration to uppercase"""
    return registration.upper().strip()

@router.post("", response_model=Aircraft, status_code=status.HTTP_201_CREATED)
async def create_aircraft(
    aircraft: AircraftCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new aircraft for the current user"""
    # Check user aircraft limit based on plan
    if current_user.limits.max_aircrafts != -1:  # -1 = unlimited
        user_aircraft_count = await db.aircrafts.count_documents({"user_id": current_user.id})
        if user_aircraft_count >= current_user.limits.max_aircrafts:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Aircraft limit reached. Your plan allows {current_user.limits.max_aircrafts} aircraft(s). Upgrade your plan to add more."
            )
    
    # Format registration to uppercase
    registration = format_registration(aircraft.registration)
    
    # Check if registration already exists for this user
    existing = await db.aircrafts.find_one({
        "user_id": current_user.id,
        "registration": registration
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Aircraft with registration {registration} already exists"
        )
    
    # Create aircraft document
    aircraft_id = str(datetime.utcnow().timestamp()).replace(".", "")
    aircraft_dict = {
        "_id": aircraft_id,
        "user_id": current_user.id,
        "registration": registration,
        "aircraft_type": aircraft.aircraft_type,
        "manufacturer": aircraft.manufacturer,
        "model": aircraft.model,
        "year": aircraft.year,
        "serial_number": aircraft.serial_number,
        "airframe_hours": aircraft.airframe_hours,
        "engine_hours": aircraft.engine_hours,
        "propeller_hours": aircraft.propeller_hours,
        "photo_url": aircraft.photo_url,
        "description": aircraft.description,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.aircrafts.insert_one(aircraft_dict)
    logger.info(f"Aircraft {registration} created for user {current_user.email}")
    
    return Aircraft(**aircraft_dict)

@router.get("", response_model=List[Aircraft])
async def get_user_aircraft(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all aircraft for the current user"""
    cursor = db.aircraft.find({"user_id": current_user.id}).sort("created_at", -1)
    aircraft_list = await cursor.to_list(length=100)
    return [Aircraft(**aircraft) for aircraft in aircraft_list]

@router.get("/{aircraft_id}", response_model=Aircraft)
async def get_aircraft(
    aircraft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific aircraft by ID"""
    aircraft_doc = await db.aircraft.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    
    if not aircraft_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aircraft not found"
        )
    
    return Aircraft(**aircraft_doc)

@router.put("/{aircraft_id}", response_model=Aircraft)
async def update_aircraft(
    aircraft_id: str,
    aircraft_update: AircraftUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update an aircraft"""
    # Check if aircraft exists and belongs to user
    existing = await db.aircraft.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aircraft not found"
        )
    
    # Build update dict (only non-None values)
    update_data = aircraft_update.dict(exclude_unset=True)
    
    # Format registration if provided
    if "registration" in update_data:
        update_data["registration"] = format_registration(update_data["registration"])
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.aircraft.update_one(
            {"_id": aircraft_id},
            {"$set": update_data}
        )
    
    # Fetch updated aircraft
    updated_aircraft = await db.aircraft.find_one({"_id": aircraft_id})
    logger.info(f"Aircraft {aircraft_id} updated for user {current_user.email}")
    
    return Aircraft(**updated_aircraft)

@router.delete("/{aircraft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_aircraft(
    aircraft_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete an aircraft"""
    result = await db.aircraft.delete_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aircraft not found"
        )
    
    logger.info(f"Aircraft {aircraft_id} deleted for user {current_user.email}")
    return None
