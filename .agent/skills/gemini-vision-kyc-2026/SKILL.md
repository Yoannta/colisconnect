---
name: gemini-vision-kyc-2026
description: Guide d'intégration ultra-moderne pour la vérification d'identité (KYC) via l'IA Vision (SDK 2026). Couvre la migration vers @google/genai, la gestion des modèles v2.5+ et la validation mathématique.
---

# Skill : Intégration Gemini Vision KYC (Standard 2026)

Ce skill documente la mise en place d'un système de vérification d'identité automatique robuste utilisant les modèles Gemini Vision de nouvelle génération.

## 1. État de l'Art (Mars 2026)

> [!IMPORTANT]
> Ne jamais utiliser le vieux package `@google/generative-ai` ou les modèles `gemini-1.5`. Ils sont obsolètes et retournent des erreurs 404/503.

### Pile Technologique Requise

- **SDK Node.js** : `@google/genai` (Le SDK unifié)
- **Modèle recommandé** : `gemini-2.5-flash` (ou `gemini-flash-latest`)
- **Transport** : Protocole gRPC/REST unifié par le constructeur.

## 2. Configuration et Code

### Installation

```bash
npm install @google/genai
```

### Initialisation (Syntaxe 2026)

Le client doit être initialisé avec un objet de configuration.

```javascript
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});
```

### Analyse Multimodale (Image + Prompt)

```javascript
const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
        {
            parts: [
                { text: "Ton prompt KYC ici (JSON attendu)" },
                { 
                  inlineData: { 
                    data: "BASE64_SANS_PREFIXE", 
                    mimeType: "image/jpeg" 
                  } 
                }
            ]
        }
    ]
});
```

### Extraction du Texte (Piège de 2026)

Ne pas utiliser `.text()`. L'objet de réponse suit désormais cette structure :

```javascript
const rawText = response.candidates[0].content.parts[0].text;
```

## 3. Méthodologie "Ingénieuse" de Recherche

Si vous rencontrez une erreur de type `is not a function` ou `404 Not Found`, ne cherchez pas dans les anciennes documentations. Suivez ce protocole :

1. **NotebookLM Discovery** : Créez un notebook et importez les fichiers de votre projet (pour le contexte) et lancez une recherche web via l'outil MCP sur les dernières annonces de Google AI.
2. **Scripts de Découverte** : Créez un script `test_keys.js` pour lister `Object.keys()` de l'instance IA. C'est le seul moyen de savoir quelles méthodes sont *réellement* disponibles dans le SDK installé.
3. **Vérification de Quota** : Si vous recevez une erreur 429, demandez à l'utilisateur de lister ses modèles disponibles dans son dashboard. Les versions "Lite" ou "Flash" ont souvent des quotas 25x plus élevés.

## 4. Sécurité et Recours (Fallback)

Toujours implémenter un "Circuit Breaker" :

- Si l'IA échoue ou met plus de 5 secondes, le système doit **basculer en mode manuel** automatiquement.
- Stockez l'image du document dans une zone sécurisée pour l'examen humain après l'échec de l'IA.

---
*Dernière mise à jour par Antigravity : 25 Mars 2026*
