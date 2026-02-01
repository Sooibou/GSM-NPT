# 🔧 SOLUTION - Page Blanche

## Problème
La page affiche une page blanche car l'import de Leaflet CSS échoue.

## ✅ Solution Rapide

### Étape 1 : Ouvrir la console du navigateur
1. Appuyez sur **Cmd + Option + J** (Mac) ou **F12** (Windows/Linux)
2. Regardez s'il y a des erreurs en rouge

### Étape 2 : Modifier le fichier src/App.jsx

**SUPPRIMER cette ligne** (ligne 2) :
```javascript
import 'leaflet/dist/leaflet.css'
```

**REMPLACER PAR** :
Rien ! Supprimez juste cette ligne.

### Étape 3 : Ajouter le CSS de Leaflet dans index.html

**Ouvrir le fichier `index.html`** et ajouter cette ligne dans le `<head>` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📡</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- ✅ AJOUTER CETTE LIGNE -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    
    <title>GSM Network Planning Tool</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Étape 4 : Sauvegarder et actualiser

1. Sauvegardez les deux fichiers modifiés
2. Dans le navigateur, appuyez sur **Cmd + R** (Mac) ou **Ctrl + R** (Windows) pour actualiser

## 🎯 Résultat attendu

Vous devriez maintenant voir :
- L'en-tête avec "GSM Network Planning Tool" 📡
- La barre d'outils avec les boutons
- La sidebar à gauche
- La carte au centre

---

Si le problème persiste, vérifiez la console du navigateur (Cmd + Option + J) et partagez les erreurs affichées.
