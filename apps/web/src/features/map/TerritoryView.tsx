/**
 * TerritoryView — l'arrivée sur le territoire (IDENTITE §6, plans 1,4→2,6 s).
 * La carte poursuit le piqué du globe : approche aérienne, puis le
 * contour communal se trace au Méridien sur son périmètre complet.
 *
 * Basemap : Carto dark-matter (nuit) en attendant le style ATLAS
 * sur mesure servi par martin (tâche dédiée, E10).
 */
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { dur, ease } from '@/design-system'
import { AnalysisPanel } from '@/features/territory/AnalysisPanel'
import { boundaryUrl } from '@/lib/api'
import type { TerritorySummary } from '@/lib/api'

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'
const TILES_URL: string = import.meta.env['VITE_TILES_URL'] ?? 'http://localhost:3000'
const GROW_DURATION_MS = 1600
const TRACE_DURATION_MS = 1900

interface TerritoryViewProps {
  territory: TerritorySummary
  onBackToGlobe: () => void
}

/** Bbox [w, s, e, n] d'une géométrie GeoJSON (Multi)Polygon. */
function geometryBounds(geometry: {
  type: string
  coordinates: number[][][] | number[][][][]
}): [[number, number], [number, number]] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  const scan = (ring: number[][]) => {
    for (const point of ring) {
      const lon = point[0]
      const lat = point[1]
      if (lon === undefined || lat === undefined) continue
      west = Math.min(west, lon)
      east = Math.max(east, lon)
      south = Math.min(south, lat)
      north = Math.max(north, lat)
    }
  }
  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates as number[][][]) scan(ring)
  } else {
    for (const poly of geometry.coordinates as number[][][][]) for (const ring of poly) scan(ring)
  }
  return [
    [west, south],
    [east, north],
  ]
}

/** La ville qui pousse : les extrusions montent de 0 à leur hauteur. */
function growBuildings(map: maplibregl.Map): void {
  const start = performance.now()
  const frame = (now: number) => {
    const p = Math.min((now - start) / GROW_DURATION_MS, 1)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    map.setPaintProperty('buildings-3d', 'fill-extrusion-height', [
      '*',
      ['coalesce', ['get', 'height_m'], 5],
      eased,
    ])
    map.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', Math.min(eased * 1.4, 0.92))
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/** Le Méridien trace le périmètre : gradient animé le long de la ligne.
 *  Contrainte MapLibre : les stops d'un interpolate doivent être
 *  STRICTEMENT croissants — chaque stop est donc borné après le précédent. */
function traceBoundary(map: maplibregl.Map): void {
  const start = performance.now()
  const frame = (now: number) => {
    const p = Math.min((now - start) / TRACE_DURATION_MS, 1)
    if (p >= 1) {
      map.setPaintProperty('territory-boundary', 'line-gradient', [
        'interpolate',
        ['linear'],
        ['line-progress'],
        0,
        'rgba(122, 162, 255, 0.9)',
        1,
        'rgba(122, 162, 255, 0.9)',
      ])
      return
    }
    const tail = Math.min(Math.max(p - 0.06, 0.0002), 0.995)
    const head = Math.min(Math.max(p, tail + 0.001), 0.996)
    const fade = head + 0.002
    map.setPaintProperty('territory-boundary', 'line-gradient', [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      'rgba(122, 162, 255, 0.95)',
      tail,
      'rgba(122, 162, 255, 0.9)',
      head,
      'rgba(215, 228, 255, 1)',
      fade,
      'rgba(122, 162, 255, 0)',
      1,
      'rgba(122, 162, 255, 0)',
    ])
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

export function TerritoryView({ territory, onBackToGlobe }: TerritoryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new maplibregl.Map({
      container,
      style: BASEMAP,
      center: territory.centroid,
      zoom: 8.2,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
    })

    mapRef.current = map
    let cancelled = false

    map.on('error', (event) => console.warn('[maplibre]', event.error?.message ?? event))

    map.on('load', async () => {
      const feature = (await (await fetch(boundaryUrl(territory.code_insee))).json()) as {
        geometry: Parameters<typeof geometryBounds>[0]
      }
      if (cancelled) return

      map.addSource('territory', {
        type: 'geojson',
        data: feature as unknown as GeoJSON.Feature,
        lineMetrics: true, // requis pour line-gradient (le tracé du Méridien)
      })
      map.addLayer({
        id: 'territory-fill',
        type: 'fill',
        source: 'territory',
        paint: { 'fill-color': '#7aa2ff', 'fill-opacity': 0.05 },
      })
      map.addLayer({
        id: 'territory-glow',
        type: 'line',
        source: 'territory',
        paint: { 'line-color': '#7aa2ff', 'line-width': 8, 'line-blur': 6, 'line-opacity': 0.3 },
      })
      map.addLayer({
        id: 'territory-boundary',
        type: 'line',
        source: 'territory',
        paint: {
          'line-width': 1.8,
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            'rgba(0,0,0,0)',
            1,
            'rgba(0,0,0,0)',
          ],
        },
      })

      // La fin du piqué : la caméra se pose en assiette de travail
      const camera = map.cameraForBounds(geometryBounds(feature.geometry), { padding: 90 })
      if (camera) {
        map.flyTo({
          ...camera,
          pitch: 42,
          bearing: -12,
          duration: 2200,
          essential: true,
        })
      }
      // Le bâti (vue tiles.buildings servie par martin) — naît à plat, puis pousse
      map.addSource('buildings', {
        type: 'vector',
        tiles: [`${TILES_URL}/buildings/{z}/{x}/{y}`],
        minzoom: 10,
        maxzoom: 16,
      })
      map.addLayer(
        {
          id: 'buildings-3d',
          type: 'fill-extrusion',
          source: 'buildings',
          'source-layer': 'buildings',
          minzoom: 11,
          paint: {
            'fill-extrusion-height': 0,
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'height_m'], 5],
              4,
              '#151a26',
              20,
              '#232e45',
              60,
              '#31415f',
            ],
            'fill-extrusion-opacity': 0,
          },
        },
        'territory-glow', // le contour reste au-dessus du bâti
      )

      window.setTimeout(() => map.resize(), 80)
      window.setTimeout(() => traceBoundary(map), 500)
      window.setTimeout(() => growBuildings(map), 1300)
      setReady(true)
    })

    return () => {
      cancelled = true
      mapRef.current = null
      map.remove()
    }
  }, [territory])

  return (
    <div
      className="overflow-hidden bg-void"
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      {/* Voile de traversée d'atmosphère : la carte naît dans la lumière */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 bg-[#8fb0ff]"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />

      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />

      {/* Barre supérieure */}
      <motion.header
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-8 py-5"
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: ready ? 1 : 0 }}
        transition={{ delay: 0.6, duration: dur.calm, ease: ease.arrive }}
      >
        <button
          onClick={onBackToGlobe}
          className="glass cursor-pointer px-4 py-2 text-sm text-ink-2 transition-colors duration-[240ms] hover:text-ink-1 focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
        >
          ← Globe
        </button>
        <div className="glass flex items-baseline gap-4 px-5 py-2.5">
          <h1 className="font-display text-lg font-light tracking-wide text-ink-1">
            {territory.name}
          </h1>
          <span className="font-mono text-2xs text-ink-3">{territory.code_insee}</span>
          {territory.population !== null && (
            <span className="font-mono text-2xs text-ink-3">
              {new Intl.NumberFormat('fr-FR').format(territory.population)} hab
            </span>
          )}
        </div>
        <span className="font-mono text-2xs text-ink-3">⌘K</span>
      </motion.header>

      {ready && <AnalysisPanel territory={territory} mapRef={mapRef} />}

      <div className="atlas-vignette" />
      <div className="atlas-grain" />
    </div>
  )
}
