# ADR-001 — Globe d'introduction en Three.js custom plutôt que CesiumJS

Date : 2026-07-03 · Statut : acceptée

## Contexte
La cinématique d'ouverture (IDENTITE §5) exige un contrôle artistique total :
continents tracés à la plume, Méridien qui balaie la surface, terminateur
jour/nuit stylisé, caméra chorégraphiée. CesiumJS excelle en géospatial
"vrai monde" mais pèse ~4 Mo, impose son pipeline de rendu et son esthétique
reconnaissable, et rend les shaders custom laborieux.

## Décision
Le globe d'introduction et l'écran menu sont un objet Three.js sur mesure
(sphère + textures NASA + shaders dédiés). CesiumJS reste une option
d'Horizon 2 pour un mode "globe photoréaliste" optionnel.

## Conséquences
+ Contrôle total du rendu, bundle léger, 60 fps atteignable sur GPU intégré.
+ Les shaders (atmosphère, Méridien, tracé des côtes) deviennent des
  compétences visibles du portfolio.
− Pas de terrain/imagerie monde réel sur le globe (assumé : la précision
  arrive à l'échelle territoire, via MapLibre).
− Tout est à construire (timeboxé : épic E2, 1,5 semaine).
