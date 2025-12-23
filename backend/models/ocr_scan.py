from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentType(str, Enum):
    MAINTENANCE_REPORT = "maintenance_report"
    STC = "stc"
    INVOICE = "invoice"
    LOGBOOK = "logbook"
    OTHER = "other"

class OCRStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    APPLIED = "APPLIED"  # Results applied to system

class ExtractedADSB(BaseModel):
    """AD/SB detected in OCR scan"""
    adsb_type: str  # AD or SB
    reference_number: str
    status: str = "UNKNOWN"  # COMPLIED, PENDING, UNKNOWN
    compliance_date: Optional[str] = None
    airframe_hours: Optional[float] = None
    engine_hours: Optional[float] = None
    propeller_hours: Optional[float] = None
    description: Optional[str] = None

class ExtractedPart(BaseModel):
    """Part detected in OCR scan"""
    part_number: str
    name: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: int = 1
    price: Optional[float] = None
    supplier: Optional[str] = None

class ExtractedSTC(BaseModel):
    """STC detected in OCR scan"""
    stc_number: str
    title: Optional[str] = None
    description: Optional[str] = None
    installation_date: Optional[str] = None

class ExtractedELTData(BaseModel):
    """ELT data extracted from OCR"""
    detected: bool = False
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    installation_date: Optional[str] = None
    certification_date: Optional[str] = None
    battery_expiry_date: Optional[str] = None
    battery_install_date: Optional[str] = None
    battery_interval_months: Optional[int] = None
    beacon_hex_id: Optional[str] = None


class ExtractedMaintenanceData(BaseModel):
    """Structured data extracted from maintenance report"""
    date: Optional[str] = None
    ame_name: Optional[str] = None
    amo_name: Optional[str] = None
    ame_license: Optional[str] = None
    work_order_number: Optional[str] = None
    description: Optional[str] = None
    airframe_hours: Optional[float] = None
    engine_hours: Optional[float] = None
    propeller_hours: Optional[float] = None
    remarks: Optional[str] = None
    labor_cost: Optional[float] = None
    parts_cost: Optional[float] = None
    total_cost: Optional[float] = None
    
    # Detected items
    ad_sb_references: List[ExtractedADSB] = []
    parts_replaced: List[ExtractedPart] = []
    stc_references: List[ExtractedSTC] = []
    
    # ELT data
    elt_data: Optional[ExtractedELTData] = None

class OCRScanBase(BaseModel):
    aircraft_id: str
    document_type: DocumentType
    
    # Raw data
    raw_text: Optional[str] = None
    
    # Extracted structured data
    extracted_data: Optional[ExtractedMaintenanceData] = None
    
    # Processing status
    status: OCRStatus = OCRStatus.PENDING
    error_message: Optional[str] = None
    
    # Applied records IDs
    applied_maintenance_id: Optional[str] = None
    applied_adsb_ids: List[str] = []
    applied_part_ids: List[str] = []
    applied_stc_ids: List[str] = []

class OCRScanCreate(BaseModel):
    aircraft_id: str
    document_type: DocumentType
    image_base64: str

class OCRScan(OCRScanBase):
    id: str = Field(alias="_id")
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True

class OCRScanResponse(BaseModel):
    """Response for OCR scan endpoint"""
    id: str
    status: OCRStatus
    document_type: DocumentType
    raw_text: Optional[str] = None
    extracted_data: Optional[ExtractedMaintenanceData] = None
    error_message: Optional[str] = None
    created_at: datetime
