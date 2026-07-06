/**
 * LearnBanner : quand ATLAS ne connaît pas encore le bâti d'un
 * territoire, il le dit et propose de l'apprendre (E4.2). Pendant
 * l'apprentissage, le Méridien pense et le statut est sondé ; à
 * l'arrivée, la ville pousse.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { Button, GlassPanel, dur, ease } from '@/design-system'
import type { TerritorySummary } from '@/lib/api'

const API_URL: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000'
const POLL_MS = 5000
const TIMEOUT_MS = 4 * 60 * 1000

type Phase = 'proposing' | 'learning' | 'done' | 'failed'

interface LearnBannerProps {
  territory: TerritorySummary
  /** Appelé quand le bâti vient d'être appris (déclenche la pousse). */
  onLearned: (count: number) => void
}

export function LearnBanner({ territory, onLearned }: LearnBannerProps) {
  const [phase, setPhase] = useState<Phase>('proposing')
  const [count, setCount] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id)
    },
    [],
  )

  async function learn() {
    setPhase('learning')
    try {
      const response = await fetch(
        `${API_URL}/territories/${territory.code_insee}/ingest/buildings`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error(String(response.status))
      const body = (await response.json()) as { status: string; buildings: number }
      if (body.status === 'already_known') {
        setCount(body.buildings)
        setPhase('done')
        onLearned(body.buildings)
        return
      }
    } catch {
      setPhase('failed')
      return
    }

    const startedAt = Date.now()
    const poll = async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setPhase('failed')
        return
      }
      try {
        const response = await fetch(
          `${API_URL}/territories/${territory.code_insee}/ingest/buildings/status`,
        )
        const body = (await response.json()) as { buildings: number }
        if (body.buildings > 0) {
          setCount(body.buildings)
          setPhase('done')
          onLearned(body.buildings)
          timers.current.push(window.setTimeout(() => setPhase('proposing'), 6000))
          return
        }
      } catch {
        /* on retentera au prochain battement */
      }
      timers.current.push(window.setTimeout(() => void poll(), POLL_MS))
    }
    timers.current.push(window.setTimeout(() => void poll(), POLL_MS))
  }

  if (phase === 'done' && count === 0) return null

  return (
    <motion.div
      className="absolute bottom-24 left-6 z-10 w-[320px]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, duration: dur.calm, ease: ease.arrive }}
    >
      <GlassPanel thinking={phase === 'learning'} className="flex flex-col gap-3 p-4">
        <AnimatePresence mode="wait">
          {phase === 'proposing' && (
            <motion.div key="proposing" className="flex flex-col gap-3" exit={{ opacity: 0 }}>
              <p className="text-sm leading-relaxed text-ink-2">
                Je ne connais pas encore le bâti d'ici.
              </p>
              <div>
                <Button variant="primary" onClick={() => void learn()}>
                  L'apprendre
                </Button>
              </div>
            </motion.div>
          )}
          {phase === 'learning' && (
            <motion.p
              key="learning"
              className="text-sm leading-relaxed text-ink-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              J'apprends le bâti d'ici : comptez une à deux minutes.
            </motion.p>
          )}
          {phase === 'done' && (
            <motion.p
              key="done"
              className="text-sm leading-relaxed text-ink-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {new Intl.NumberFormat('fr-FR').format(count)} bâtiments appris. Regardez la ville.
            </motion.p>
          )}
          {phase === 'failed' && (
            <motion.div
              key="failed"
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm leading-relaxed text-ink-2">
                L'apprentissage n'a pas abouti. Les sources publiques sont parfois saturées.
              </p>
              <div>
                <Button variant="ghost" onClick={() => void learn()}>
                  Réessayer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  )
}
