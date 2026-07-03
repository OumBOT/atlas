"""ATLAS — The Territory Intelligence System.

Architecture en quatre couches (Clean Architecture) :

- ``domain``          : entités et règles métier — aucune dépendance externe.
- ``application``     : cas d'usage orchestrant le domaine via des ports.
- ``infrastructure``  : implémentations concrètes (PostGIS, connecteurs, esprit ATLAS).
- ``presentation``    : API HTTP/WebSocket (FastAPI) — la seule couche visible.

Règle de dépendance : les couches externes dépendent des internes, jamais l'inverse.
"""
