"""
OCR Service for AeroLogix AI
Uses OpenAI Vision (GPT-4o) via Emergent LLM Key
"""

import os
import json
import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize OpenAI client with Emergent LLM Key
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", "sk-emergent-eAf207608993771Ad9")

client = OpenAI(
    api_key=EMERGENT_LLM_KEY,
    base_url="https://integrations.emergentagent.com/llm/openai/v1"
)

# Prompts spécialisés par type de document
MAINTENANCE_REPORT_PROMPT = """Tu es un expert en maintenance aéronautique. Analyse cette image d'un rapport de maintenance d'avion et extrait TOUTES les informations structurées.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Structure JSON attendue:
{
    "date": "YYYY-MM-DD ou null",
    "ame_name": "Nom du mécanicien/AME ou null",
    "amo_name": "Nom de l'organisme de maintenance/AMO ou null",
    "ame_license": "Numéro de licence AME ou null",
    "work_order_number": "Numéro de Work Order ou null",
    "description": "Description complète des travaux effectués",
    "airframe_hours": nombre ou null,
    "engine_hours": nombre ou null,
    "propeller_hours": nombre ou null,
    "remarks": "Remarques additionnelles ou null",
    "labor_cost": nombre ou null,
    "parts_cost": nombre ou null,
    "total_cost": nombre ou null,
    "ad_sb_references": [
        {
            "adsb_type": "AD ou SB",
            "reference_number": "ex: AD 2024-05-12",
            "status": "COMPLIED, PENDING ou UNKNOWN",
            "compliance_date": "YYYY-MM-DD ou null",
            "airframe_hours": nombre ou null,
            "engine_hours": nombre ou null,
            "propeller_hours": nombre ou null,
            "description": "Description ou null"
        }
    ],
    "parts_replaced": [
        {
            "part_number": "P/N",
            "name": "Nom de la pièce",
            "serial_number": "S/N ou null",
            "quantity": nombre,
            "price": nombre ou null,
            "supplier": "Fournisseur ou null"
        }
    ],
    "stc_references": [
        {
            "stc_number": "Numéro STC",
            "title": "Titre ou null",
            "description": "Description ou null",
            "installation_date": "YYYY-MM-DD ou null"
        }
    ]
}

RÈGLES IMPORTANTES:
1. Détecte TOUTES les références AD (Airworthiness Directive) - format typique: AD XXXX-XX-XX
2. Détecte TOUTES les références SB (Service Bulletin) - format typique: SB XX-XXXX
3. Pour chaque AD/SB, détermine le statut: COMPLIED si clairement indiqué comme fait, PENDING si à faire, UNKNOWN sinon
4. Extrait les heures cellule (airframe), moteur (engine) et hélice (propeller) si mentionnées
5. Identifie toutes les pièces remplacées avec leurs P/N
6. Si une information n'est pas trouvée, utilise null

Analyse l'image maintenant:"""

STC_PROMPT = """Tu es un expert en certification aéronautique. Analyse cette image d'un document STC (Supplemental Type Certificate) et extrait les informations structurées.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Structure JSON attendue:
{
    "stc_number": "Numéro STC (ex: SA02345NY)",
    "title": "Titre du STC",
    "description": "Description détaillée de la modification",
    "holder": "Détenteur du STC (entreprise)",
    "applicable_models": ["Liste des modèles d'avions applicables"],
    "installation_date": "YYYY-MM-DD ou null",
    "installation_airframe_hours": nombre ou null,
    "installed_by": "AME/AMO qui a installé ou null",
    "work_order_reference": "Référence Work Order ou null",
    "remarks": "Remarques ou null"
}

Analyse l'image maintenant:"""

INVOICE_PROMPT = """Tu es un expert en pièces aéronautiques. Analyse cette image de facture/bon de commande et extrait les informations sur les pièces.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Structure JSON attendue:
{
    "invoice_number": "Numéro de facture ou null",
    "invoice_date": "YYYY-MM-DD ou null",
    "supplier": "Nom du fournisseur",
    "parts": [
        {
            "part_number": "P/N (numéro de pièce)",
            "name": "Nom/description de la pièce",
            "serial_number": "S/N ou null",
            "quantity": nombre,
            "unit_price": nombre ou null,
            "total_price": nombre ou null,
            "manufacturer": "Fabricant ou null"
        }
    ],
    "subtotal": nombre ou null,
    "tax": nombre ou null,
    "total": nombre ou null,
    "currency": "USD, CAD, EUR, etc."
}

Analyse l'image maintenant:"""


class OCRService:
    """Service for processing aviation documents with OpenAI Vision"""
    
    def __init__(self):
        self.client = client
    
    def _get_prompt_for_document_type(self, document_type: str) -> str:
        """Get specialized prompt based on document type"""
        prompts = {
            "maintenance_report": MAINTENANCE_REPORT_PROMPT,
            "stc": STC_PROMPT,
            "invoice": INVOICE_PROMPT,
        }
        return prompts.get(document_type, MAINTENANCE_REPORT_PROMPT)
    
    def _clean_json_response(self, response: str) -> str:
        """Clean the response to extract valid JSON"""
        # Remove markdown code blocks if present
        response = re.sub(r'```json\s*', '', response)
        response = re.sub(r'```\s*', '', response)
        response = response.strip()
        
        # Find JSON object
        start = response.find('{')
        end = response.rfind('}')
        
        if start != -1 and end != -1:
            return response[start:end+1]
        
        return response
    
    async def analyze_image(
        self, 
        image_base64: str, 
        document_type: str
    ) -> Dict[str, Any]:
        """
        Analyze an image using OpenAI Vision
        
        Args:
            image_base64: Base64 encoded image
            document_type: Type of document (maintenance_report, stc, invoice)
            
        Returns:
            Dictionary with raw_text and extracted_data
        """
        try:
            # Get appropriate prompt
            prompt = self._get_prompt_for_document_type(document_type)
            
            # Prepare image URL (handle both with and without data URI prefix)
            if not image_base64.startswith('data:'):
                image_url = f"data:image/jpeg;base64,{image_base64}"
            else:
                image_url = image_base64
            
            logger.info(f"Analyzing {document_type} document with OpenAI Vision")
            
            # Call OpenAI Vision API
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url,
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4096
            )
            
            # Extract response
            raw_response = response.choices[0].message.content
            logger.info(f"OCR Response received: {len(raw_response)} characters")
            
            # Clean and parse JSON
            cleaned_json = self._clean_json_response(raw_response)
            
            try:
                extracted_data = json.loads(cleaned_json)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON: {e}")
                # Return raw text if JSON parsing fails
                extracted_data = {
                    "raw_response": raw_response,
                    "parse_error": str(e)
                }
            
            # Transform to standard format based on document type
            structured_data = self._transform_to_standard_format(
                extracted_data, 
                document_type
            )
            
            return {
                "success": True,
                "raw_text": raw_response,
                "extracted_data": structured_data
            }
            
        except Exception as e:
            logger.error(f"OCR analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "raw_text": None,
                "extracted_data": None
            }
    
    def _transform_to_standard_format(
        self, 
        data: Dict[str, Any], 
        document_type: str
    ) -> Dict[str, Any]:
        """Transform extracted data to standard format"""
        
        if document_type == "maintenance_report":
            return self._transform_maintenance_report(data)
        elif document_type == "stc":
            return self._transform_stc(data)
        elif document_type == "invoice":
            return self._transform_invoice(data)
        else:
            return data
    
    def _transform_maintenance_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform maintenance report data"""
        return {
            "date": data.get("date"),
            "ame_name": data.get("ame_name"),
            "amo_name": data.get("amo_name"),
            "ame_license": data.get("ame_license"),
            "work_order_number": data.get("work_order_number"),
            "description": data.get("description"),
            "airframe_hours": self._safe_float(data.get("airframe_hours")),
            "engine_hours": self._safe_float(data.get("engine_hours")),
            "propeller_hours": self._safe_float(data.get("propeller_hours")),
            "remarks": data.get("remarks"),
            "labor_cost": self._safe_float(data.get("labor_cost")),
            "parts_cost": self._safe_float(data.get("parts_cost")),
            "total_cost": self._safe_float(data.get("total_cost")),
            "ad_sb_references": [
                {
                    "adsb_type": ref.get("adsb_type", "AD"),
                    "reference_number": ref.get("reference_number", ""),
                    "status": ref.get("status", "UNKNOWN"),
                    "compliance_date": ref.get("compliance_date"),
                    "airframe_hours": self._safe_float(ref.get("airframe_hours")),
                    "engine_hours": self._safe_float(ref.get("engine_hours")),
                    "propeller_hours": self._safe_float(ref.get("propeller_hours")),
                    "description": ref.get("description")
                }
                for ref in data.get("ad_sb_references", [])
            ],
            "parts_replaced": [
                {
                    "part_number": part.get("part_number", ""),
                    "name": part.get("name"),
                    "serial_number": part.get("serial_number"),
                    "quantity": part.get("quantity", 1),
                    "price": self._safe_float(part.get("price")),
                    "supplier": part.get("supplier")
                }
                for part in data.get("parts_replaced", [])
            ],
            "stc_references": [
                {
                    "stc_number": stc.get("stc_number", ""),
                    "title": stc.get("title"),
                    "description": stc.get("description"),
                    "installation_date": stc.get("installation_date")
                }
                for stc in data.get("stc_references", [])
            ]
        }
    
    def _transform_stc(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform STC data"""
        return {
            "stc_references": [{
                "stc_number": data.get("stc_number", ""),
                "title": data.get("title"),
                "description": data.get("description"),
                "holder": data.get("holder"),
                "applicable_models": data.get("applicable_models", []),
                "installation_date": data.get("installation_date"),
                "installation_airframe_hours": self._safe_float(
                    data.get("installation_airframe_hours")
                ),
                "installed_by": data.get("installed_by"),
                "work_order_reference": data.get("work_order_reference"),
                "remarks": data.get("remarks")
            }],
            "ad_sb_references": [],
            "parts_replaced": []
        }
    
    def _transform_invoice(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform invoice data"""
        parts = []
        for part in data.get("parts", []):
            parts.append({
                "part_number": part.get("part_number", ""),
                "name": part.get("name"),
                "serial_number": part.get("serial_number"),
                "quantity": part.get("quantity", 1),
                "price": self._safe_float(
                    part.get("total_price") or part.get("unit_price")
                ),
                "supplier": data.get("supplier"),
                "manufacturer": part.get("manufacturer")
            })
        
        return {
            "invoice_number": data.get("invoice_number"),
            "date": data.get("invoice_date"),
            "supplier": data.get("supplier"),
            "total_cost": self._safe_float(data.get("total")),
            "currency": data.get("currency", "USD"),
            "parts_replaced": parts,
            "ad_sb_references": [],
            "stc_references": []
        }
    
    def _safe_float(self, value) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None


# Create singleton instance
ocr_service = OCRService()
