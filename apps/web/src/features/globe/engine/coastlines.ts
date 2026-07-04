/**
 * Côtes lumineuses — la Terre dessinée à l'encre de lumière.
 * Convertit les traits de côte de world-atlas (Natural Earth 1:50m)
 * en une géométrie de lignes 3D sur la sphère, enrichie de deux
 * attributs par sommet pour le tracé progressif :
 *  - aProgress : position normalisée [0..1] le long de son anneau
 *  - aOffset   : décalage temporel de l'anneau (l'Afrique de l'Ouest
 *                s'éveille en premier, IDENTITE §5 plan 3,2s)
 */
import * as THREE from 'three'
import { feature } from 'topojson-client'
import type { MultiPolygon, Polygon } from 'geojson'
import type { Topology } from 'topojson-specification'

import landTopo from 'world-atlas/land-50m.json'

/** (longitude, latitude) degrés → position sur la sphère unité. */
export function lonLatToVec3(lon: number, lat: number, radius = 1): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(lat)
  const lambda = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(lambda),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(lambda),
  )
}

/** Point d'éveil du tracé : l'Afrique de l'Ouest (IDENTITE §5). */
const AWAKENING = lonLatToVec3(-10, 10)

export interface CoastlineBuild {
  geometry: THREE.BufferGeometry
  /** Nombre d'anneaux (info debug/perf). */
  rings: number
}

/**
 * Construit la géométrie complète des côtes (segments de lignes,
 * à rendre en THREE.LineSegments pour tenir en un seul draw call).
 */
export function buildCoastlines(radius = 1.001): CoastlineBuild {
  const topology = landTopo as unknown as Topology
  const land = feature(topology, topology.objects['land'] as never)

  // land-50m expose une FeatureCollection d'un seul feature MultiPolygon.
  const rings: number[][][] = []
  const collectPolygon = (poly: Polygon['coordinates']) => {
    for (const ring of poly) rings.push(ring as number[][])
  }
  for (const feat of (land as unknown as { features: { geometry: Polygon | MultiPolygon }[] })
    .features) {
    const geom = feat.geometry
    if (geom.type === 'Polygon') collectPolygon(geom.coordinates)
    else for (const poly of geom.coordinates) collectPolygon(poly)
  }

  const positions: number[] = []
  const progresses: number[] = []
  const offsets: number[] = []

  for (const ring of rings) {
    if (ring.length < 2) continue

    // Longueur d'arc cumulée → aProgress normalisé sur l'anneau.
    const points: THREE.Vector3[] = []
    for (const coord of ring) {
      const lon = coord[0]
      const lat = coord[1]
      if (lon === undefined || lat === undefined) continue
      points.push(lonLatToVec3(lon, lat, radius))
    }
    const cumulative: number[] = [0]
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      if (!prev || !curr) continue
      cumulative.push((cumulative[i - 1] ?? 0) + prev.distanceTo(curr))
    }
    const total = cumulative[cumulative.length - 1] ?? 1
    if (total === 0) continue

    // Décalage d'éveil : distance angulaire du centroïde au point d'éveil.
    const centroid = points
      .reduce((acc, p) => acc.add(p), new THREE.Vector3())
      .divideScalar(points.length)
      .normalize()
    const offset = centroid.angleTo(AWAKENING) / Math.PI // [0..1]

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      if (!a || !b) continue
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      progresses.push((cumulative[i] ?? 0) / total, (cumulative[i + 1] ?? 0) / total)
      offsets.push(offset, offset)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progresses, 1))
  geometry.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 1))
  return { geometry, rings: rings.length }
}
