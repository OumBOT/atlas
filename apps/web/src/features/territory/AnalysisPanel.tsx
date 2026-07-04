/**
 * AnalysisPanel — le premier raisonnement visible d'ATLAS (E5).
 * Une analyse à la fois : pensée (Méridien) → couche sur la carte →
 * constat rédigé selon la charte (constat / raisonnement / limite),
 * écrit en MeridianText — préfiguration de la voix d'ATLAS (E6).
 */
import type maplibregl from 'maplibre-gl'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'

import { Button, GlassPanel, MeridianText, dur, ease } from '@/design-system'
import type { TerritorySummary } from '@/lib/api'

const API_URL: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000'

type Metric = 'footprint' | 'volume'

interface AnalysisDef {
  metric: Metric
  label: string
  thinking: string
}

const ANALYSES: AnalysisDef[] = [
  {
    metric: 'footprint',
    label: 'Emprise au sol du bâti',
    thinking: "Je mesure l'emprise du bâti, cellule par cellule.",
  },
  {
    metric: 'volume',
    label: 'Volume bâti',
    thinking: 'Je cube le bâti — surfaces et hauteurs estimées.',
  },
]

interface GridFeature {
  properties: { value: number; ratio: number; volume_m3: number }
  geometry: { type: string; coordinates: unknown }
}

interface GridResult {
  features: GridFeature[]
  metadata: { cells: number }
}

/** Cap approximatif (8 directions) du barycentre des cellules les plus denses. */
function hotspotDirection(features: GridFeature[], centroid: [number, number]): string {
  const top = [...features].sort((a, b) => b.properties.value - a.properties.value).slice(0, 5)
  let x = 0
  let y = 0
  let n = 0
  for (const feature of top) {
    const ring = (feature.geometry.coordinates as number[][][])[0]
    if (!ring) continue
    for (const point of ring) {
      const [lon, lat] = point
      if (lon === undefined || lat === undefined) continue
      x += lon
      y += lat
      n++
    }
  }
  if (n === 0) return 'au centre'
  const dLon = x / n - centroid[0]
  const dLat = y / n - centroid[1]
  const angle = (Math.atan2(dLat, dLon) * 180) / Math.PI // 0 = est
  const dirs = [
    "à l'est",
    'au nord-est',
    'au nord',
    'au nord-ouest',
    "à l'ouest",
    'au sud-ouest',
    'au sud',
    'au sud-est',
  ]
  return dirs[Math.round(((angle + 360) % 360) / 45) % 8] ?? 'au centre'
}

/** Le constat d'ATLAS — charte IDENTITE §1.2 : constat, raisonnement, limite. */
function narrate(metric: Metric, result: GridResult, territory: TerritorySummary): string {
  const withData = result.features.filter((f) => f.properties.value > 0)
  const direction = hotspotDirection(result.features, territory.centroid)
  if (metric === 'footprint') {
    const mean =
      withData.reduce((acc, f) => acc + f.properties.ratio, 0) / Math.max(withData.length, 1)
    const peak = Math.max(...withData.map((f) => f.properties.ratio), 0)
    return (
      `Le bâti couvre en moyenne ${(mean * 100).toFixed(0)} % des cellules construites, ` +
      `avec un maximum de ${(peak * 100).toFixed(0)} % ${direction}. ` +
      `Je m'appuie sur une grille d'environ 250 mètres et le bâti OpenStreetMap. ` +
      `Cette lecture a ses limites : l'exhaustivité d'OSM varie selon les secteurs.`
    )
  }
  const total = withData.reduce((acc, f) => acc + f.properties.volume_m3, 0)
  return (
    `Le volume bâti s'établit autour de ${(total / 1_000_000).toFixed(1)} millions de m³, ` +
    `concentré ${direction}. Les hauteurs sont estimées — étages OSM, sinon 5 mètres — ` +
    `ce chiffre est un ordre de grandeur, pas un cadastre.`
  )
}

const LAYER = 'analysis-grid'
const SOURCE = 'analysis-grid'

interface AnalysisPanelProps {
  territory: TerritorySummary
  mapRef: React.RefObject<maplibregl.Map | null>
}

export function AnalysisPanel({ territory, mapRef }: AnalysisPanelProps) {
  const [active, setActive] = useState<Metric | null>(null)
  const [thinking, setThinking] = useState<string | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const requestId = useRef(0)

  const clearLayer = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer(LAYER)) map.removeLayer(LAYER)
    if (map.getSource(SOURCE)) map.removeSource(SOURCE)
  }, [mapRef])

  const stop = useCallback(() => {
    requestId.current++
    clearLayer()
    setActive(null)
    setThinking(null)
    setNarrative(null)
  }, [clearLayer])

  async function run(analysis: AnalysisDef) {
    const map = mapRef.current
    if (!map) return
    if (active === analysis.metric) {
      stop()
      return
    }
    const id = ++requestId.current
    clearLayer()
    setActive(analysis.metric)
    setNarrative(null)
    setThinking(analysis.thinking)

    try {
      const response = await fetch(
        `${API_URL}/territories/${territory.code_insee}/analyses/${analysis.metric}`,
      )
      if (!response.ok) throw new Error(String(response.status))
      const result = (await response.json()) as GridResult
      if (id !== requestId.current) return

      map.addSource(SOURCE, { type: 'geojson', data: result as never })
      map.addLayer(
        {
          id: LAYER,
          type: 'fill',
          source: SOURCE,
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['get', 'value'],
              0,
              'rgba(122,162,255,0)',
              0.15,
              'rgba(122,162,255,0.10)',
              0.5,
              'rgba(122,162,255,0.32)',
              1,
              'rgba(190,214,255,0.62)',
            ],
            'fill-outline-color': 'rgba(122,162,255,0.06)',
          },
        },
        map.getLayer('buildings-3d') ? 'buildings-3d' : undefined,
      )
      setThinking(null)
      setNarrative(narrate(analysis.metric, result, territory))
    } catch {
      if (id !== requestId.current) return
      setThinking(null)
      setActive(null)
      setNarrative("Le calcul n'a pas abouti — l'API est-elle démarrée ? Reprenons.")
    }
  }

  return (
    <motion.aside
      className="absolute right-6 top-24 z-10 w-[340px]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: dur.calm, ease: ease.arrive }}
    >
      <GlassPanel thinking={thinking !== null} className="flex flex-col gap-4 p-5">
        <h2 className="text-2xs uppercase tracking-[0.3em] text-ink-3">Analyses</h2>

        <div className="flex flex-col gap-2">
          {ANALYSES.map((analysis) => (
            <Button
              key={analysis.metric}
              variant={active === analysis.metric ? 'primary' : 'ghost'}
              onClick={() => void run(analysis)}
            >
              {analysis.label}
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {thinking && (
            <motion.p
              key="thinking"
              className="text-sm leading-relaxed text-ink-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {thinking}
            </motion.p>
          )}
          {narrative && (
            <motion.div key={narrative} initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MeridianText className="text-sm leading-relaxed">{narrative}</MeridianText>
            </motion.div>
          )}
        </AnimatePresence>

        {active && !thinking && (
          <div className="flex items-center gap-3">
            <div
              className="h-1.5 flex-1 rounded-full"
              style={{
                background:
                  'linear-gradient(to right, rgba(122,162,255,0), rgba(122,162,255,0.32), rgba(190,214,255,0.62))',
              }}
            />
            <span className="font-mono text-2xs text-ink-3">min → max</span>
          </div>
        )}
      </GlassPanel>
    </motion.aside>
  )
}
