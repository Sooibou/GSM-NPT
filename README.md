# 📡 GSM Network Planning Tool

Outil professionnel de planification de réseaux GSM avec analyse de couverture et d'interférence.

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Lancer l'application en mode développement
npm run dev

# L'application s'ouvrira automatiquement sur http://localhost:3000
```

## 📋 Autres commandes

```bash
# Build de production
npm run build

# Prévisualiser le build de production
npm run preview
```

## ✨ Fonctionnalités

### 🗼 Gestion des Sites
- Ajout de sites GSM avec paramètres personnalisables
- Configuration des antennes (puissance, gain, hauteur, azimuth)
- Support des configurations omnidirectionnelles, tri-sectorielles et hexa-sectorielles

### 📊 Analyse de Couverture
- Modèle de propagation Okumura-Hata
- Visualisation en temps réel de la couverture RSSI
- Calcul de la portée maximale et de la surface couverte
- Ajustement selon l'environnement (urbain, suburbain, rural)

### ⚡ Analyse d'Interférence
- Carte thermique du rapport C/I (Carrier-to-Interference)
- Détection automatique des zones d'interférence
- Visualisation avec dégradé fluide de 2400+ points par site
- Identification des interférences co-canal

### 🎛️ Contrôles de Visualisation
- Toggle pour afficher/masquer les secteurs
- Toggle pour afficher/masquer la couverture
- Toggle pour afficher/masquer les labels
- Modes de vue : Couverture, Interférence, Tout

### 📈 Statistiques & Analyse
- Calculs de capacité (Erlang B)
- Probabilité de blocage
- Analyse globale du réseau
- Export des données en JSON

## 🛠️ Technologies

- **React 18** - Framework UI
- **Vite** - Build tool
- **Leaflet** - Cartographie interactive
- **React Leaflet** - Intégration React pour Leaflet

## 📐 Paramètres Techniques

### Paramètres Radio
- Fréquences : GSM 900 MHz, DCS 1800 MHz
- Puissance TX : 20-50 dBm
- Gain d'antenne : 0-21 dBi
- Hauteur d'antenne : 10-100 m

### Environnements
- **Urbain** : Dense, avec obstacles
- **Suburbain** : Zone résidentielle
- **Rural** : Terrain dégagé

### Calculs
- Modèle Okumura-Hata pour la perte de propagation
- Erlang B pour la capacité
- C/I pour l'analyse d'interférence

## 📝 Notes

- Les fichiers sont sauvegardés localement dans le navigateur
- L'export JSON permet de sauvegarder vos configurations
- La carte d'interférence nécessite au moins 2 sites

## 🎨 Interface

Design moderne avec thème sombre professionnel, inspiré de GitHub, optimisé pour une utilisation professionnelle.

---

Développé pour la planification professionnelle de réseaux GSM 🌐
