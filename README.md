# AeroLogix AI ✈️

Application mobile de gestion de maintenance aviation intelligente avec prédictions IA.

## 🎯 Vue d'ensemble

AeroLogix AI est une application mobile complète pour les pilotes et propriétaires d'avions, offrant:
- 📸 **OCR intelligent** : Scan de rapports de maintenance via caméra
- 🤖 **Prédictions IA** : Analyse prédictive des coûts et maintenance
- 📊 **Logbook numérique** : Suivi des heures de vol et entretiens
- 🔔 **Notifications automatiques** : Alertes TBO, ELT, inspections
- ✈️ **Gestion multi-avions** : Jusqu'à plusieurs avions selon le forfait

## 📱 Plateformes

- ✅ iOS (App Store)
- ✅ Android (Google Play)
- 🌐 Web (Progressive Web App)

## 🏗️ Architecture Technique

### Stack
- **Frontend** : Expo (React Native) + TypeScript
- **Backend** : FastAPI (Python)
- **Database** : MongoDB
- **IA** : OpenAI GPT-5.1 + Vision (via Emergent LLM Key)
- **Paiements** : Stripe

### Structure du projet
```
aerologix-ai-mobile/
├── frontend/               # Application mobile Expo
│   ├── app/               # Routes (expo-router)
│   ├── components/        # Composants réutilisables
│   ├── services/          # Services API
│   └── assets/            # Images, fonts, etc.
├── backend/               # API FastAPI
│   ├── routes/            # Endpoints API
│   ├── models/            # Modèles de données
│   ├── services/          # Logique métier
│   └── database/          # Configuration MongoDB
└── tests/                 # Tests automatisés
```

## 💰 Plans d'abonnement

### 🆓 BASIC (Gratuit)
- 1 avion
- 10 entrées logbook/mois
- 3 analyses OCR/mois
- Notification ELT

### ✈️ PILOT ($19/mois - $190/an)
- 1 avion
- OCR illimité
- Maintenance prédictive complète
- Notifications automatiques
- Logbook illimité
- Export PDF/CSV
- **Essai gratuit 7 jours**

### 🔧 MAINTENANCE PRO ($39/mois - $390/an)
- 3 avions
- Toutes fonctionnalités PILOT
- Partage avec mécanicien
- Comparateur de pièces
- **Essai gratuit 7 jours**

### 🚁 FLEET AI ($75/mois - $750/an)
- Avions illimités
- Toutes fonctionnalités PRO
- Support prioritaire
- Analytics avancés
- **Essai gratuit 7 jours**

## 🚀 Installation & Configuration

### Prérequis
- Node.js 18+
- Python 3.11+
- MongoDB 6+
- Expo CLI
- EAS CLI (pour builds natifs)

### Setup Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configurer les variables d'environnement
uvicorn server:app --reload
```

### Setup Frontend
```bash
cd frontend
yarn install
cp .env.example .env  # Configurer les variables d'environnement
expo start
```

## 🔑 Configuration des clés API

### Emergent LLM Key (OpenAI)
- Clé universelle fournie par Emergent
- Fonctionne avec GPT-5.1 (texte) + Vision (OCR)
- Déjà configurée dans `.env`

### Stripe
1. Créer un compte sur [stripe.com](https://stripe.com)
2. Récupérer les clés API (test et production)
3. Ajouter au `.env` backend:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### MongoDB
- Utilise MongoDB local par défaut
- Pour production : MongoDB Atlas recommandé

## 📦 Builds natifs avec EAS

### Configuration EAS
```bash
eas login
eas build:configure
```

### Build iOS (TestFlight)
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

### Build Android
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

## 🧪 Tests

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
yarn test
```

## 📚 Documentation

- [Guide d'intégration OpenAI](/app/image_testing.md)
- [API Documentation](http://localhost:8001/docs) (FastAPI Swagger)
- [Guide EAS Build](https://docs.expo.dev/build/introduction/)

## 🔐 Sécurité

- ✅ JWT pour l'authentification
- ✅ Encryption des données sensibles (SecureStore)
- ✅ Validation Stripe webhook signatures
- ✅ Variables d'environnement sécurisées
- ✅ HTTPS obligatoire en production

## 🌍 Déploiement

### Backend
- Recommandé : AWS, Google Cloud, ou Heroku
- Nginx + Gunicorn pour production

### Mobile
- iOS : App Store via TestFlight
- Android : Google Play Console
- Web : Vercel, Netlify, ou AWS S3

## 📧 Support

Pour toute question ou assistance :
- Email : support@aerologix.ai
- GitHub Issues : [aerologix-ai-mobile/issues](https://github.com/ralphi22/aerologix-ai-mobile/issues)

## Privacy Policy

Privacy Policy – AeroLogix AI
AeroLogix AI respects user privacy and is committed to protecting personal data.
Data Collection
The app collects only the data necessary for its core functionality, including:
Email address (for account authentication)
User-provided content such as aircraft data, documents, images, and maintenance records
Data Usage
Collected data is used solely to:
Provide access to the application
Store and display user aircraft records and documents
Enable app features such as maintenance tracking and document scanning
Data Sharing
AeroLogix AI does not sell, share, or use personal data for advertising or tracking purposes.
Data Storage and Security
Data is stored securely and access is restricted to authorized systems only.
User Responsibility
All data entered into the app is provided by the user.
The app is intended for informational and organizational purposes only.
Contact
For any privacy-related questions, contact:
support@aerologix.ai

## 📄 Licence

© 2025 AeroLogix AI. Tous droits réservés.

## 🙏 Remerciements

- [Expo](https://expo.dev) - Framework React Native
- [FastAPI](https://fastapi.tiangolo.com) - Framework Python moderne
- [OpenAI](https://openai.com) - Modèles IA (via Emergent)
- [Stripe](https://stripe.com) - Gestion des paiements

---

**Made with ❤️ by the AeroLogix AI Team**
