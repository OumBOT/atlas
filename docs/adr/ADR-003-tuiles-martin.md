# ADR-003 — Tuiles vectorielles servies par martin depuis des vues PostGIS

Date : 2026-07-03 · Statut : acceptée

## Contexte
La scène carto (MapLibre + deck.gl) consomme les géométries d'ATLAS
(territoires, couches d'analyse, résultats de simulation). Servir du GeoJSON
brut ne tient pas la charge au-delà de quelques milliers d'objets ;
GeoServer est surdimensionné et lourd à opérer pour un projet solo.

## Décision
martin (Rust, MapLibre org) sert les tuiles MVT directement depuis
PostgreSQL. Convention ATLAS : martin n'expose que des VUES du schéma
``tiles`` (jamais les tables du schéma ``atlas``) — la vue est le contrat
public de la donnée cartographique. Le GeoJSON direct reste autorisé
sous ~5 000 objets (résultats d'analyse ponctuels).

## Conséquences
+ Zéro code de serving à maintenir, performances excellentes, invalidation
  simple (la vue reflète la table).
+ La frontière tables/vues protège le schéma interne des évolutions.
− Une vue par couche publiée : discipline à tenir dans les migrations.
− Le style (couleurs, épaisseurs) vit côté client — cohérent avec le
  design system unique du front.
