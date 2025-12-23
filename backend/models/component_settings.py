"""
Component Settings Model for AeroLogix AI
Stores user-configurable maintenance intervals for aircraft components
Compliant with Transport Canada RAC 605 / Standard 625
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class PropellerType(str, Enum):
    FIXED = "fixed"  # Fixed pitch / ground adjustable - 5 years
    VARIABLE = "variable"  # Variable pitch / constant speed - manufacturer or 10 years

class ComponentSettings(BaseModel):
    """
    Aircraft component settings with Canadian regulations defaults
    ALL VALUES ARE INFORMATIONAL ONLY - NO AIRWORTHINESS DETERMINATION
    """
    aircraft_id: str
    user_id: str
    
    # ENGINE - Model-dependent TBO
    engine_model: Optional[str] = None
    engine_tbo_hours: float = 2000.0
    engine_hours_since_overhaul: Optional[float] = None
    engine_last_overhaul_date: Optional[str] = None
    
    # PROPELLER - Type determines interval
    propeller_type: PropellerType = PropellerType.FIXED
    propeller_model: Optional[str] = None
    propeller_manufacturer_interval_years: Optional[float] = None
    propeller_hours_since_inspection: Optional[float] = None
    propeller_last_inspection_date: Optional[str] = None
    
    # AVIONICS (24 MONTHS) - Date-based only
    avionics_last_certification_date: Optional[str] = None
    avionics_certification_interval_months: int = 24
    
    # MAGNETOS - Hours-based
    magnetos_model: Optional[str] = None
    magnetos_interval_hours: float = 500.0
    magnetos_hours_since_inspection: Optional[float] = None
    magnetos_last_inspection_date: Optional[str] = None
    
    # VACUUM PUMP - Hours-based
    vacuum_pump_model: Optional[str] = None
    vacuum_pump_interval_hours: float = 400.0
    vacuum_pump_hours_since_replacement: Optional[float] = None
    vacuum_pump_last_replacement_date: Optional[str] = None
    
    # AIRFRAME - 100h inspection cycle
    airframe_last_annual_date: Optional[str] = None
    airframe_hours_since_annual: Optional[float] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ComponentSettingsCreate(BaseModel):
    engine_model: Optional[str] = None
    engine_tbo_hours: Optional[float] = 2000.0
    engine_hours_since_overhaul: Optional[float] = None
    engine_last_overhaul_date: Optional[str] = None
    propeller_type: Optional[str] = "fixed"
    propeller_model: Optional[str] = None
    propeller_manufacturer_interval_years: Optional[float] = None
    propeller_hours_since_inspection: Optional[float] = None
    propeller_last_inspection_date: Optional[str] = None
    avionics_last_certification_date: Optional[str] = None
    avionics_certification_interval_months: Optional[int] = 24
    magnetos_model: Optional[str] = None
    magnetos_interval_hours: Optional[float] = 500.0
    magnetos_hours_since_inspection: Optional[float] = None
    magnetos_last_inspection_date: Optional[str] = None
    vacuum_pump_model: Optional[str] = None
    vacuum_pump_interval_hours: Optional[float] = 400.0
    vacuum_pump_hours_since_replacement: Optional[float] = None
    vacuum_pump_last_replacement_date: Optional[str] = None
    airframe_last_annual_date: Optional[str] = None
    airframe_hours_since_annual: Optional[float] = None

class ComponentSettingsUpdate(BaseModel):
    engine_model: Optional[str] = None
    engine_tbo_hours: Optional[float] = None
    engine_hours_since_overhaul: Optional[float] = None
    engine_last_overhaul_date: Optional[str] = None
    propeller_type: Optional[str] = None
    propeller_model: Optional[str] = None
    propeller_manufacturer_interval_years: Optional[float] = None
    propeller_hours_since_inspection: Optional[float] = None
    propeller_last_inspection_date: Optional[str] = None
    avionics_last_certification_date: Optional[str] = None
    avionics_certification_interval_months: Optional[int] = None
    magnetos_model: Optional[str] = None
    magnetos_interval_hours: Optional[float] = None
    magnetos_hours_since_inspection: Optional[float] = None
    magnetos_last_inspection_date: Optional[str] = None
    vacuum_pump_model: Optional[str] = None
    vacuum_pump_interval_hours: Optional[float] = None
    vacuum_pump_hours_since_replacement: Optional[float] = None
    vacuum_pump_last_replacement_date: Optional[str] = None
    airframe_last_annual_date: Optional[str] = None
    airframe_hours_since_annual: Optional[float] = None

CANADIAN_REGULATIONS = {
    "propeller_fixed_max_years": 5,
    "propeller_variable_fallback_years": 10,
    "avionics_certification_months": 24,
    "magnetos_default_hours": 500,
    "vacuum_pump_default_hours": 400,
    "engine_default_tbo": 2000,
}
