"""
OCR Routes for AeroLogix AI
Handles document scanning and data extraction
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from database.mongodb import get_database
from services.auth_deps import get_current_user
from services.ocr_service import ocr_service
from models.ocr_scan import (
    OCRScanCreate, OCRScan, OCRScanResponse, 
    OCRStatus, DocumentType, ExtractedMaintenanceData
)
from models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


@router.post("/scan", response_model=OCRScanResponse)
async def scan_document(
    scan_request: OCRScanCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Scan a document image and extract structured data using AI Vision
    
    - **aircraft_id**: ID of the aircraft this document belongs to
    - **document_type**: Type of document (maintenance_report, stc, invoice)
    - **image_base64**: Base64 encoded image
    """
    
    # Verify aircraft belongs to user
    aircraft = await db.aircrafts.find_one({
        "_id": scan_request.aircraft_id,
        "user_id": current_user.id
    })
    
    if not aircraft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aircraft not found"
        )
    
    # Check OCR quota
    user_doc = await db.users.find_one({"_id": current_user.id})
    ocr_limit = user_doc.get("limits", {}).get("ocr_per_month", 3)
    
    if ocr_limit != -1:  # -1 = unlimited
        # Count OCR scans this month
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ocr_count = await db.ocr_scans.count_documents({
            "user_id": current_user.id,
            "created_at": {"$gte": start_of_month}
        })
        
        if ocr_count >= ocr_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"OCR quota exceeded. Your plan allows {ocr_limit} scans per month. Upgrade to scan more documents."
            )
    
    # Create OCR scan record
    now = datetime.utcnow()
    scan_doc = {
        "user_id": current_user.id,
        "aircraft_id": scan_request.aircraft_id,
        "document_type": scan_request.document_type.value,
        "status": OCRStatus.PROCESSING.value,
        "raw_text": None,
        "extracted_data": None,
        "error_message": None,
        "applied_maintenance_id": None,
        "applied_adsb_ids": [],
        "applied_part_ids": [],
        "applied_stc_ids": [],
        "created_at": now,
        "updated_at": now
    }
    
    # Generate string ID before insertion
    scan_id = str(datetime.utcnow().timestamp()).replace(".", "")
    scan_doc["_id"] = scan_id
    
    await db.ocr_scans.insert_one(scan_doc)
    
    try:
        # Analyze image with OCR service
        logger.info(f"Processing OCR scan {scan_id} for user {current_user.id}")
        
        ocr_result = await ocr_service.analyze_image(
            image_base64=scan_request.image_base64,
            document_type=scan_request.document_type.value
        )
        
        if ocr_result["success"]:
            # Update scan with results
            await db.ocr_scans.update_one(
                {"_id": scan_id},
                {
                    "$set": {
                        "status": OCRStatus.COMPLETED.value,
                        "raw_text": ocr_result["raw_text"],
                        "extracted_data": ocr_result["extracted_data"],
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info(f"OCR scan {scan_id} completed successfully")
            
            return OCRScanResponse(
                id=scan_id,
                status=OCRStatus.COMPLETED,
                document_type=scan_request.document_type,
                raw_text=ocr_result["raw_text"],
                extracted_data=ExtractedMaintenanceData(**ocr_result["extracted_data"]) if ocr_result["extracted_data"] else None,
                error_message=None,
                created_at=now
            )
        else:
            # Update scan with error
            await db.ocr_scans.update_one(
                {"_id": scan_id},
                {
                    "$set": {
                        "status": OCRStatus.FAILED.value,
                        "error_message": ocr_result.get("error", "Unknown error"),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OCR analysis failed: {ocr_result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR scan {scan_id} failed: {str(e)}")
        
        await db.ocr_scans.update_one(
            {"_id": scan_id},
            {
                "$set": {
                    "status": OCRStatus.FAILED.value,
                    "error_message": str(e),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )


@router.get("/history/{aircraft_id}", response_model=List[OCRScanResponse])
async def get_ocr_history(
    aircraft_id: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Get OCR scan history for an aircraft
    """
    
    # Verify aircraft belongs to user
    aircraft = await db.aircrafts.find_one({
        "_id": aircraft_id,
        "user_id": current_user.id
    })
    
    if not aircraft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aircraft not found"
        )
    
    # Get OCR scans
    cursor = db.ocr_scans.find({
        "aircraft_id": aircraft_id,
        "user_id": current_user.id
    }).sort("created_at", -1).limit(limit)
    
    scans = []
    async for scan in cursor:
        extracted_data = None
        if scan.get("extracted_data"):
            try:
                extracted_data = ExtractedMaintenanceData(**scan["extracted_data"])
            except:
                pass
        
        scans.append(OCRScanResponse(
            id=str(scan["_id"]),
            status=OCRStatus(scan["status"]),
            document_type=DocumentType(scan["document_type"]),
            raw_text=scan.get("raw_text"),
            extracted_data=extracted_data,
            error_message=scan.get("error_message"),
            created_at=scan["created_at"]
        ))
    
    return scans


@router.get("/{scan_id}", response_model=OCRScanResponse)
async def get_ocr_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Get a specific OCR scan by ID
    """
    
    scan = await db.ocr_scans.find_one({
        "_id": scan_id,
        "user_id": current_user.id
    })
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OCR scan not found"
        )
    
    extracted_data = None
    if scan.get("extracted_data"):
        try:
            extracted_data = ExtractedMaintenanceData(**scan["extracted_data"])
        except:
            pass
    
    return OCRScanResponse(
        id=str(scan["_id"]),
        status=OCRStatus(scan["status"]),
        document_type=DocumentType(scan["document_type"]),
        raw_text=scan.get("raw_text"),
        extracted_data=extracted_data,
        error_message=scan.get("error_message"),
        created_at=scan["created_at"]
    )


@router.post("/apply/{scan_id}")
async def apply_ocr_results(
    scan_id: str,
    update_aircraft_hours: bool = True,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Apply OCR extracted data to the system:
    - Update aircraft hours
    - Create maintenance record
    - Create AD/SB records
    - Create part records
    - Create STC records
    """
    
    # Get OCR scan
    scan = await db.ocr_scans.find_one({
        "_id": scan_id,
        "user_id": current_user.id
    })
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OCR scan not found"
        )
    
    if scan["status"] != OCRStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only apply completed OCR scans"
        )
    
    if scan["status"] == OCRStatus.APPLIED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OCR scan already applied"
        )
    
    extracted_data = scan.get("extracted_data", {})
    aircraft_id = scan["aircraft_id"]
    now = datetime.utcnow()
    
    applied_ids = {
        "maintenance_id": None,
        "adsb_ids": [],
        "part_ids": [],
        "stc_ids": []
    }
    
    try:
        # 1. Update aircraft hours if provided
        if update_aircraft_hours:
            hours_update = {}
            if extracted_data.get("airframe_hours"):
                hours_update["airframe_hours"] = extracted_data["airframe_hours"]
            if extracted_data.get("engine_hours"):
                hours_update["engine_hours"] = extracted_data["engine_hours"]
            if extracted_data.get("propeller_hours"):
                hours_update["propeller_hours"] = extracted_data["propeller_hours"]
            
            if hours_update:
                hours_update["updated_at"] = now
                await db.aircrafts.update_one(
                    {"_id": aircraft_id},
                    {"$set": hours_update}
                )
                logger.info(f"Updated aircraft {aircraft_id} hours: {hours_update}")
        
        # 2. Create maintenance record
        if extracted_data.get("description") or extracted_data.get("work_order_number"):
            maintenance_date = now
            if extracted_data.get("date"):
                try:
                    maintenance_date = datetime.fromisoformat(extracted_data["date"])
                except:
                    pass
            
            maintenance_doc = {
                "user_id": current_user.id,
                "aircraft_id": aircraft_id,
                "maintenance_type": "ROUTINE",
                "date": maintenance_date,
                "description": extracted_data.get("description", "OCR Extracted Maintenance"),
                "ame_name": extracted_data.get("ame_name"),
                "amo_name": extracted_data.get("amo_name"),
                "ame_license": extracted_data.get("ame_license"),
                "work_order_number": extracted_data.get("work_order_number"),
                "airframe_hours": extracted_data.get("airframe_hours"),
                "engine_hours": extracted_data.get("engine_hours"),
                "propeller_hours": extracted_data.get("propeller_hours"),
                "remarks": extracted_data.get("remarks"),
                "labor_cost": extracted_data.get("labor_cost"),
                "parts_cost": extracted_data.get("parts_cost"),
                "total_cost": extracted_data.get("total_cost"),
                "parts_replaced": [p.get("part_number", "") for p in extracted_data.get("parts_replaced", [])],
                "regulatory_references": [r.get("reference_number", "") for r in extracted_data.get("ad_sb_references", [])],
                "source": "ocr",
                "ocr_scan_id": scan_id,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.maintenance_records.insert_one(maintenance_doc)
            applied_ids["maintenance_id"] = str(result.inserted_id)
            logger.info(f"Created maintenance record {applied_ids['maintenance_id']}")
        
        # 3. Create AD/SB records
        for adsb in extracted_data.get("ad_sb_references", []):
            if not adsb.get("reference_number"):
                continue
            
            compliance_date = None
            if adsb.get("compliance_date"):
                try:
                    compliance_date = datetime.fromisoformat(adsb["compliance_date"])
                except:
                    pass
            
            adsb_doc = {
                "user_id": current_user.id,
                "aircraft_id": aircraft_id,
                "adsb_type": adsb.get("adsb_type", "AD"),
                "reference_number": adsb["reference_number"],
                "title": adsb.get("description"),
                "description": adsb.get("description"),
                "status": adsb.get("status", "UNKNOWN"),
                "compliance_date": compliance_date,
                "compliance_airframe_hours": adsb.get("airframe_hours"),
                "compliance_engine_hours": adsb.get("engine_hours"),
                "compliance_propeller_hours": adsb.get("propeller_hours"),
                "source": "ocr",
                "ocr_scan_id": scan_id,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.adsb_records.insert_one(adsb_doc)
            applied_ids["adsb_ids"].append(str(result.inserted_id))
        
        logger.info(f"Created {len(applied_ids['adsb_ids'])} AD/SB records")
        
        # 4. Create part records
        for part in extracted_data.get("parts_replaced", []):
            if not part.get("part_number"):
                continue
            
            part_doc = {
                "user_id": current_user.id,
                "aircraft_id": aircraft_id,
                "part_number": part["part_number"],
                "name": part.get("name", part["part_number"]),
                "serial_number": part.get("serial_number"),
                "quantity": part.get("quantity", 1),
                "purchase_price": part.get("price"),
                "supplier": part.get("supplier"),
                "installation_date": now,
                "installation_airframe_hours": extracted_data.get("airframe_hours"),
                "installed_on_aircraft": True,
                "source": "ocr",
                "ocr_scan_id": scan_id,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.part_records.insert_one(part_doc)
            applied_ids["part_ids"].append(str(result.inserted_id))
        
        logger.info(f"Created {len(applied_ids['part_ids'])} part records")
        
        # 5. Create STC records
        for stc in extracted_data.get("stc_references", []):
            if not stc.get("stc_number"):
                continue
            
            installation_date = None
            if stc.get("installation_date"):
                try:
                    installation_date = datetime.fromisoformat(stc["installation_date"])
                except:
                    pass
            
            stc_doc = {
                "user_id": current_user.id,
                "aircraft_id": aircraft_id,
                "stc_number": stc["stc_number"],
                "title": stc.get("title"),
                "description": stc.get("description"),
                "holder": stc.get("holder"),
                "applicable_models": stc.get("applicable_models", []),
                "installation_date": installation_date or now,
                "installation_airframe_hours": stc.get("installation_airframe_hours") or extracted_data.get("airframe_hours"),
                "installed_by": stc.get("installed_by") or extracted_data.get("ame_name"),
                "source": "ocr",
                "ocr_scan_id": scan_id,
                "created_at": now,
                "updated_at": now
            }
            
            result = await db.stc_records.insert_one(stc_doc)
            applied_ids["stc_ids"].append(str(result.inserted_id))
        
        logger.info(f"Created {len(applied_ids['stc_ids'])} STC records")
        
        # 6. Create/Update ELT record if detected
        elt_data = extracted_data.get("elt_data", {})
        elt_created = False
        if elt_data and elt_data.get("detected"):
            # Check if ELT exists
            existing_elt = await db.elt_records.find_one({
                "aircraft_id": aircraft_id,
                "user_id": current_user.id
            })
            
            elt_doc = {
                "brand": elt_data.get("brand"),
                "model": elt_data.get("model"),
                "serial_number": elt_data.get("serial_number"),
                "beacon_hex_id": elt_data.get("beacon_hex_id"),
                "source": "ocr",
                "ocr_scan_id": scan_id,
                "updated_at": now
            }
            
            # Parse dates
            for date_field in ["installation_date", "certification_date", "battery_expiry_date", "battery_install_date"]:
                if elt_data.get(date_field):
                    try:
                        elt_doc[date_field] = datetime.fromisoformat(elt_data[date_field])
                    except:
                        pass
            
            if elt_data.get("battery_interval_months"):
                elt_doc["battery_interval_months"] = elt_data["battery_interval_months"]
            
            if existing_elt:
                # Update existing
                await db.elt_records.update_one(
                    {"_id": existing_elt["_id"]},
                    {"$set": elt_doc}
                )
                applied_ids["elt_id"] = str(existing_elt["_id"])
                logger.info(f"Updated ELT record for aircraft {aircraft_id}")
            else:
                # Create new
                elt_doc["user_id"] = current_user.id
                elt_doc["aircraft_id"] = aircraft_id
                elt_doc["created_at"] = now
                result = await db.elt_records.insert_one(elt_doc)
                applied_ids["elt_id"] = str(result.inserted_id)
                logger.info(f"Created ELT record for aircraft {aircraft_id}")
            
            elt_created = True
        
        # Update OCR scan status to APPLIED
        await db.ocr_scans.update_one(
            {"_id": scan_id},
            {
                "$set": {
                    "status": OCRStatus.APPLIED.value,
                    "applied_maintenance_id": applied_ids["maintenance_id"],
                    "applied_adsb_ids": applied_ids["adsb_ids"],
                    "applied_part_ids": applied_ids["part_ids"],
                    "applied_stc_ids": applied_ids["stc_ids"],
                    "applied_elt_id": applied_ids.get("elt_id"),
                    "updated_at": now
                }
            }
        )
        
        return {
            "message": "OCR results applied successfully",
            "applied": {
                "maintenance_record": applied_ids["maintenance_id"],
                "adsb_records": len(applied_ids["adsb_ids"]),
                "part_records": len(applied_ids["part_ids"]),
                "stc_records": len(applied_ids["stc_ids"]),
                "elt_updated": elt_created
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to apply OCR results: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply OCR results: {str(e)}"
        )


@router.get("/quota/status")
async def get_ocr_quota_status(
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Get current OCR quota status for the user
    """
    
    user_doc = await db.users.find_one({"_id": current_user.id})
    ocr_limit = user_doc.get("limits", {}).get("ocr_per_month", 3)
    
    # Count OCR scans this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ocr_count = await db.ocr_scans.count_documents({
        "user_id": current_user.id,
        "created_at": {"$gte": start_of_month}
    })
    
    return {
        "used": ocr_count,
        "limit": ocr_limit if ocr_limit != -1 else "unlimited",
        "remaining": (ocr_limit - ocr_count) if ocr_limit != -1 else "unlimited"
    }


@router.delete("/{scan_id}")
async def delete_ocr_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    Delete an OCR scan from history
    """
    
    # Try to find by string ID first, then by ObjectId
    scan = await db.ocr_scans.find_one({
        "_id": scan_id,
        "user_id": current_user.id
    })
    
    if not scan:
        # Try with ObjectId
        try:
            scan = await db.ocr_scans.find_one({
                "_id": ObjectId(scan_id),
                "user_id": current_user.id
            })
        except:
            pass
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OCR scan not found"
        )
    
    # Delete the scan
    if isinstance(scan["_id"], ObjectId):
        await db.ocr_scans.delete_one({"_id": scan["_id"]})
    else:
        await db.ocr_scans.delete_one({"_id": scan_id})
    
    logger.info(f"Deleted OCR scan {scan_id} for user {current_user.id}")
    
    return {"message": "OCR scan deleted successfully"}
