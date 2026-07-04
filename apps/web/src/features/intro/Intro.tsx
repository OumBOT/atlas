/**
 * Intro — le seuil, la cinématique, puis le menu (IDENTITE §5).
 * Le clic « Entrer » est le lever de rideau : il autorisera aussi
 * l'audio (E10) et lance la Terre. Skippable à tout moment (clic ou
 * touche) ; version courte aux visites suivantes ; statique en
 * prefers-reduced-motion.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MeridianLine, MeridianText, dur, ease } from '@/design-system'
import { CINEMA } from '@/features/globe/engine/timeline'
import type { CinemaMode } from '@/features/globe/engine/timeline'
import type { GlobeEngine } from '@/features/globe/engine/GlobeEngine'

const SEEN_KEY = 'atlas.intro.seen'

type Stage = 'threshold' | 'cinema' | 'menu'

/** Légendes de première ouverture, calées sur la timeline du moteur. */
const CAPTIONS: readonly { at: number; text: string }[] = [
  { at: CINEMA.drawStart + 0.4, text: 'ATLAS.' },
  { at: CINEMA.drawStart + 2.0, text: "Un système d'intelligence territoriale." },
]

const WELCOME =
  "Je suis ATLAS. J'étudie les territoires : leur forme, leur population, leurs réseaux, " +
  'leurs équilibres. Choisissez une commune — je vous en ferai le portrait.'

interface IntroProps {
  /** Retour depuis un territoire : sauter le seuil, arriver au menu. */
  startAtMenu?: boolean
}

export function Intro({ startAtMenu = false }: IntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GlobeEngine | null>(null)
  const timeoutsRef = useRef<number[]>([])
  const reduced = useReducedMotion()

  const [stage, setStage] = useState<Stage>(startAtMenu ? 'menu' : 'threshold')
  const [caption, setCaption] = useState<string | null>(null)
  const firstVisit = !localStorage.getItem(SEEN_KEY)

  /** Monte le moteur une seule fois (import dynamique : three.js se
   *  charge pendant que le seuil s'affiche, le premier écran reste léger). */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const menuOnMount = startAtMenu // figé : la prop ne change pas après montage
    let alive = true
    let engine: GlobeEngine | null = null
    void import('@/features/globe/engine/GlobeEngine').then(({ GlobeEngine: Engine }) => {
      if (!alive) return
      engine = new Engine(canvas)
      engineRef.current = engine
      if (menuOnMount) engine.start('reduced', () => undefined)
    })
    return () => {
      alive = false
      engine?.dispose()
      engineRef.current = null
    }
  }, [startAtMenu])

  const clearTimers = useCallback(() => {
    for (const id of timeoutsRef.current) window.clearTimeout(id)
    timeoutsRef.current = []
  }, [])

  const enterMenu = useCallback(() => {
    clearTimers()
    setCaption(null)
    setStage('menu')
    localStorage.setItem(SEEN_KEY, '1')
  }, [clearTimers])

  const begin = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    const mode: CinemaMode = reduced ? 'reduced' : firstVisit ? 'full' : 'short'
    setStage('cinema')
    engine.start(mode, enterMenu)

    if (mode === 'full') {
      for (const { at, text } of CAPTIONS) {
        timeoutsRef.current.push(window.setTimeout(() => setCaption(text), at * 1000))
      }
      timeoutsRef.current.push(
        window.setTimeout(() => setCaption(null), (CINEMA.sweepStart - 0.2) * 1000),
      )
    }
  }, [reduced, firstVisit, enterMenu])

  /** Skip : tout clic ou toute touche pendant la cinématique. */
  useEffect(() => {
    if (stage !== 'cinema') return
    const skip = () => engineRef.current?.skip()
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) skip()
    }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', onKey)
    }
  }, [stage])

  function openCommandBar() {
    window.dispatchEvent(new Event('atlas:open-commandbar'))
  }

  /** Piqué orbital demandé par la palette (⌘K) — uniquement depuis le menu. */
  useEffect(() => {
    function onDive(event: Event) {
      const { code, lon, lat } = (event as CustomEvent<{ code: string; lon: number; lat: number }>)
        .detail
      const engine = engineRef.current
      if (!engine || stage !== 'menu') return
      engine.diveTo(lon, lat, () => {
        window.dispatchEvent(new CustomEvent('atlas:dive-complete', { detail: { code } }))
      })
    }
    window.addEventListener('atlas:dive', onDive)
    return () => window.removeEventListener('atlas:dive', onDive)
  }, [stage])

  return (
    <div className="relative h-full overflow-hidden bg-void">
      {/* La scène — toujours montée, la cinématique écrit dessus */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* ── Le seuil ── */}
      <AnimatePresence>
        {stage === 'threshold' && (
          <motion.div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-void"
            exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
          >
            <motion.h1
              className="font-display text-2xl font-light tracking-[0.3em] text-ink-1"
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.4, ease: ease.arrive }}
            >
              ATLAS
            </motion.h1>
            <motion.div
              className="w-40 origin-center"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 1, ease: ease.travel }}
            >
              <MeridianLine />
            </motion.div>
            <motion.button
              onClick={begin}
              className="mt-4 cursor-pointer rounded-full border border-stroke-faint px-8 py-2.5 text-sm text-ink-2 transition-colors duration-[240ms] hover:border-stroke-soft hover:text-ink-1 focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              Entrer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Légendes de la cinématique ── */}
      <AnimatePresence mode="wait">
        {caption && (
          <motion.p
            key={caption}
            className="absolute inset-x-0 top-[16%] z-10 text-center font-display text-lg font-light tracking-[0.12em] text-ink-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: ease.arrive }}
          >
            {caption}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Indication de skip, discrète */}
      {stage === 'cinema' && !reduced && (
        <motion.p
          className="absolute bottom-6 right-8 z-10 text-2xs uppercase tracking-[0.25em] text-ink-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          cliquer pour passer
        </motion.p>
      )}

      {/* ── Le menu ── */}
      <AnimatePresence>
        {stage === 'menu' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.scene, ease: ease.arrive }}
          >
            {/* Barre supérieure */}
            <motion.header
              className="flex items-center justify-between px-8 py-5"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: dur.calm, ease: ease.arrive }}
            >
              <span className="font-display text-base font-light tracking-[0.3em] text-ink-1">
                ATLAS
              </span>
              <span className="font-mono text-2xs text-ink-3">v0 · E2</span>
            </motion.header>

            <div className="flex-1" />

            {/* Message de première ouverture + invitation */}
            <div className="mx-auto mb-16 flex w-[min(620px,90vw)] flex-col items-center gap-8">
              {firstVisit && (
                <MeridianText
                  className="text-center text-base leading-relaxed text-ink-2"
                  delay={0.6}
                >
                  {WELCOME}
                </MeridianText>
              )}
              <motion.button
                onClick={openCommandBar}
                className="glass flex w-full max-w-[420px] cursor-text items-center gap-3 px-5 py-3.5 text-left text-sm text-ink-3 transition-colors duration-[240ms] hover:text-ink-2 focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: firstVisit ? 2.2 : 0.5,
                  duration: dur.calm,
                  ease: ease.arrive,
                }}
              >
                <span aria-hidden>⌕</span>
                <span className="flex-1">Rechercher un territoire…</span>
                <kbd className="rounded border border-stroke-faint px-1.5 py-0.5 font-mono text-2xs">
                  ⌘K
                </kbd>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-processing */}
      <div className="atlas-vignette" />
      <div className="atlas-grain" />
    </div>
  )
}
