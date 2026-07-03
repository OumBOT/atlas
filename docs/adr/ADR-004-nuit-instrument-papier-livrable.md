# ADR-004 — L'instrument est nocturne, le livrable est papier

Date : 2026-07-04 · Statut : acceptée

## Contexte
Lors de la validation du design system, envie exprimée d'un ATLAS en
tons clairs "premium". Or l'identité repose structurellement sur la
nuit : le Méridien est une lumière qui voyage (illisible sur fond
clair), la cinématique est spatiale, et la donnée cartographique
gagne en contraste sur basemap sombre (pratique constante d'ArcGIS,
Cesium, Google Earth Studio, Linear).

## Décision
Deux langages, un produit :
- **L'instrument** (application : globe, carte, canvas, graphe,
  analyses) reste nocturne — nuit / verre / lumière (IDENTITE §2).
- **Le livrable** (rapports PDF, exports, StoryMaps) parle "papier
  premium" : blanc cassé #F7F5F0, encre #1C1D21, Fraunces en titres,
  le Méridien devenu filet bleu fin de section. Palette dédiée
  ajoutée à IDENTITE §2.8.
La bascule nuit→papier au moment de la composition du rapport devient
un moment de marque (le travail nocturne "s'imprime").

## Conséquences
+ Chaque monde est optimal pour son usage (écran de travail / document
  transmis et imprimé), et le contraste raconte l'histoire du produit.
+ Aucune réécriture de l'existant ; la palette papier n'entre en jeu
  qu'à l'épic E10 (rapports).
− Deux mini-thèmes à maintenir (limité : le papier ne concerne que
  les templates de rapport, pas l'UI).
