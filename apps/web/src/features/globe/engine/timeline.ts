/**
 * Timeline de la cinématique — partagée entre le moteur (Three.js)
 * et l'orchestration React, sans dépendance à three.js pour que le
 * premier écran ne charge pas le moteur.
 */
export type GlobePhase = 'cinema' | 'menu'
export type CinemaMode = 'full' | 'short' | 'reduced'

/** Jalons du mode full (secondes). */
export const CINEMA = {
  drawStart: 0.6,
  drawEnd: 4.0,
  sweepStart: 4.2,
  sweepEnd: 6.4,
  settleEnd: 8.4,
  shortDuration: 3.6,
} as const
