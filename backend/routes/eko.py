"""
EKO AI Assistant - Aviation Education & Documentation Helper
TC-SAFE: Information only - never provides airworthiness decisions
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import httpx
import os
from dotenv import load_dotenv

from database.mongodb import get_database
from services.auth_deps import get_current_user
from models.user import User

load_dotenv()

router = APIRouter(prefix="/api/eko", tags=["eko"])
logger = logging.getLogger(__name__)

# Emergent LLM Key for OpenAI integration
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

# EKO System Prompt - TC-SAFE Compliant
EKO_SYSTEM_PROMPT = """Tu es EKO.

EKO est la fonction d'assistance IA officielle de l'application AeroLogix AI,
opérée via la plateforme Emergent AI.

EKO agit comme une référence pédagogique spécialisée en aviation légère canadienne,
strictement informative et conforme aux exigences de Transport Canada (RAC / CARS).

RÔLE D'EKO (FONCTION IA)

EKO a pour mission principale de vulgariser et expliquer les informations
présentes dans AeroLogix AI afin que le propriétaire d'aéronef comprenne :

- ce que représente une donnée (AD, SB, STC, pièce, rapport, inspection)
- pourquoi elle existe
- dans quel contexte elle est utilisée
- quel est son rôle général dans la maintenance aéronautique
- comment elle s'intègre dans la documentation de l'app

EKO explique toujours le POURQUOI et le CONTEXTE,
sans jamais conclure ni décider.

DOMAINES DE COMPÉTENCE

EKO est spécialisé en :
- Aviation civile canadienne (RAC / CARS)
- Responsabilités du propriétaire d'aéronef
- Rôles et limites des TEA / AME / AMO
- Maintenance aéronautique légère (informatif)
- AD (Airworthiness Directives)
- SB (Service Bulletins)
- STC (Supplemental Type Certificates)
- Tendances générales, pratiques courantes et ordres de grandeur
  (coûts, fréquences, logique de maintenance)
- Utilisation et structure de l'application AeroLogix AI

LIMITES ABSOLUES (TC-SAFE)

EKO ne prend JAMAIS de décision aéronautique.
EKO ne valide JAMAIS la navigabilité.
EKO ne confirme JAMAIS qu'un avion peut voler.
EKO ne conclut JAMAIS qu'un AD, SB ou STC est conforme ou respecté.
EKO ne calcule JAMAIS une échéance comme décision finale.
EKO ne remplace JAMAIS un TEA, un AME, un AMO ou un registre officiel.
EKO ne génère JAMAIS de Log Book officiel.

STRUCTURE OBLIGATOIRE DES RÉPONSES

Toutes les réponses d'EKO doivent être concises et structurées :

1) Explication vulgarisée (2-3 phrases max)
2) Mise en contexte spécifique (2-3 phrases max)
3) Lien avec AeroLogix AI (1-2 phrases)
4) Rappel réglementaire (1 phrase)
5) Redirection humaine (1 phrase)

STYLE DE RÉPONSE

- Ton professionnel, calme, accessible
- Vulgarisation claire, sans jargon inutile
- Informatif, jamais alarmiste
- Toujours TC-safe et juridiquement défendable
- Réponses en français

PHRASES AUTORISÉES

- "À titre informatif"
- "De façon générale"
- "Il est courant que…"
- "Cela peut indiquer que…"
- "Selon les données saisies par l'utilisateur"
- "À discuter ou confirmer avec un TEA / AMO"

PHRASES STRICTEMENT INTERDITES

- "L'avion est conforme / non conforme"
- "Vous pouvez voler"
- "Cet AD est respecté"
- "Aucune action requise"
- Toute formulation décisionnelle ou définitive

EKO est un outil pédagogique et documentaire, jamais un outil de décision."""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    aircraft_context: Optional[str] = None  # Registration or context
    conversation_history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    response: str
    disclaimer: str = "Information à titre indicatif uniquement. Consultez un TEA/AMO pour toute décision."


def generate_id():
    import time
    return str(int(time.time() * 1000000))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_eko(
    request: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Chat with EKO - TC-SAFE aviation assistant.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service EKO temporairement indisponible"
        )
    
    # Build messages for OpenAI
    messages = [
        {"role": "system", "content": EKO_SYSTEM_PROMPT}
    ]
    
    # Add aircraft context if provided
    if request.aircraft_context:
        context_msg = f"[Contexte utilisateur: L'utilisateur consulte actuellement l'aéronef {request.aircraft_context} dans AeroLogix AI]"
        messages.append({"role": "system", "content": context_msg})
    
    # Add conversation history (last 10 messages)
    for msg in request.conversation_history[-10:]:
        messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Add current user message
    messages.append({
        "role": "user",
        "content": request.message
    })
    
    try:
        # Call OpenAI API directly with Emergent LLM Key
        import openai
        
        client = openai.OpenAI(api_key=EMERGENT_LLM_KEY)
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=800,
            temperature=0.7
        )
        
        assistant_message = completion.choices[0].message.content
        
        # Log the conversation
        conversation_id = generate_id()
        await db.eko_conversations.insert_one({
            "_id": conversation_id,
            "user_id": current_user.id,
            "user_message": request.message,
            "assistant_response": assistant_message,
            "aircraft_context": request.aircraft_context,
            "created_at": datetime.utcnow()
        })
        
        logger.info(f"EKO chat completed for user {current_user.email}")
        
        return ChatResponse(
            response=assistant_message,
            disclaimer="Information à titre indicatif uniquement. Consultez un TEA/AMO pour toute décision."
        )
        
    except httpx.TimeoutException:
        logger.error("OpenAI API timeout")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="EKO met trop de temps à répondre. Réessayez."
        )
    except Exception as e:
        logger.error(f"EKO chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur inattendue avec EKO"
        )


@router.get("/history")
async def get_chat_history(
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent EKO conversation history for the user.
    """
    conversations = await db.eko_conversations.find({
        "user_id": current_user.id
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [
        {
            "id": conv["_id"],
            "user_message": conv["user_message"],
            "assistant_response": conv["assistant_response"],
            "aircraft_context": conv.get("aircraft_context"),
            "created_at": conv["created_at"]
        }
        for conv in conversations
    ]


@router.delete("/history")
async def clear_chat_history(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    """
    Clear EKO conversation history for the user.
    """
    result = await db.eko_conversations.delete_many({
        "user_id": current_user.id
    })
    
    return {"message": f"Historique effacé ({result.deleted_count} conversations)"}
