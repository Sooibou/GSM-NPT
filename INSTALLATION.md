# 🚀 GUIDE D'INSTALLATION COMPLET

## ⚠️ IMPORTANT : Suivez ces étapes dans l'ordre

### Étape 1️⃣ : Télécharger TOUS les fichiers

Téléchargez les fichiers suivants depuis le dossier `outputs` :

**📁 Racine du projet :**
- ✅ `package.json` (OBLIGATOIRE - contient les scripts)
- ✅ `vite.config.js`
- ✅ `index.html` (VERSION CORRIGÉE)
- ✅ `.gitignore`
- ✅ `README.md`

**📁 Dossier `src/` :**
- ✅ `src/main.jsx`
- ✅ `src/App.jsx` (VERSION CORRIGÉE)
- ✅ `src/App.css`

### Étape 2️⃣ : Organiser les fichiers

Votre structure doit ressembler à ça :

```
files/
├── package.json          ← À REMPLACER
├── vite.config.js        ← NOUVEAU
├── index.html            ← VERSION CORRIGÉE
├── .gitignore
├── README.md
└── src/
    ├── main.jsx          ← NOUVEAU
    ├── App.jsx           ← VERSION CORRIGÉE (sans import CSS)
    └── App.css
```

### Étape 3️⃣ : Installer les dépendances

```bash
cd '/Users/User/Desktop/Workspace/planification gsm/files'
npm install
```

Cela devrait installer :
- vite
- react
- react-dom
- leaflet
- react-leaflet

### Étape 4️⃣ : Lancer l'application

```bash
npm run dev
```

Vous devriez voir :
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Étape 5️⃣ : Ouvrir dans le navigateur

Cliquez sur le lien ou ouvrez : **http://localhost:5173/**

---

## 🔍 Vérification des fichiers critiques

### ✅ Vérifier package.json

Ouvrez `package.json` et vérifiez qu'il contient :

```json
{
  "name": "gsm-network-planning",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "vite"
  }
}
```

Si vous ne voyez PAS la section `"scripts"`, votre `package.json` est incorrect !

### ✅ Vérifier index.html

Ouvrez `index.html` et vérifiez qu'il contient cette ligne dans le `<head>` :

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""/>
```

### ✅ Vérifier src/App.jsx

Ouvrez `src/App.jsx` et vérifiez les premières lignes :

```javascript
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
import { useState, useRef } from 'react'
```

⚠️ Il ne doit PAS y avoir : `import 'leaflet/dist/leaflet.css'`

---

## 🆘 En cas de problème

### "Missing script: dev"
→ Votre `package.json` n'a pas été remplacé. Téléchargez-le à nouveau.

### Page blanche
→ Ouvrez la console (Cmd + Option + J) et partagez les erreurs.

### "Cannot find module"
→ Relancez `npm install`

---

## 📋 Checklist finale

- [ ] Tous les fichiers téléchargés
- [ ] Structure de dossiers correcte
- [ ] `npm install` exécuté sans erreurs
- [ ] `npm run dev` démarre Vite
- [ ] Page s'ouvre sur http://localhost:5173/
- [ ] Interface visible (pas de page blanche)

Bonne planification GSM ! 📡🌐
