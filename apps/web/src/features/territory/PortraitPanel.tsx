/**
 * PortraitPanel : ATLAS parle en premier (CONCEPTION §-1, principe 3).
 * À l'ouverture du territoire, le portrait se charge seul ; s'il n'existe
 * pas encore, ATLAS l'assemble (le Méridien pense pendant la génération).
 */
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, GlassPanel, MeridianText, dur, ease } from '@/design-system'
import type { TerritorySummary } from '@/lib/api'

const API_URL: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000'

interface Portrait {
  narrative: string
  sections: Record<string, string[]>
  model: string
  generated_at: string
}

const SECTION_LABELS: Record<string, string> = {
  forces: 'Forces',
  faiblesses: 'Faiblesses',
  tendances: 'Tendances',
  risques: 'Risques',
  opportunites: 'Opportunités',
}

/** Les risques et faiblesses portent la teinte réservée au risque (IDENTITE §2.2). */
const SECTION_TONE: Record<string, string> = {
  risques: 'text-data-rose',
  faiblesses: 'text-data-rose/80',
}

function Section({ name, items }: { name: string; items: string[] }) {
  const [open, setOpen] = useState(name === 'forces')
  if (items.length === 0) return null
  return (
    <div className="border-t border-stroke-faint pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between text-left focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
        aria-expanded={open}
      >
        <span
          className={`text-2xs uppercase tracking-[0.25em] ${SECTION_TONE[name] ?? 'text-ink-3'}`}
        >
          {SECTION_LABELS[name] ?? name}
        </span>
        <span className="font-mono text-2xs text-ink-3">{open ? '−' : items.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className="mt-2 flex flex-col gap-2 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur.quick, ease: ease.arrive }}
          >
            {items.map((item) => (
              <li key={item} className="text-sm leading-relaxed text-ink-2">
                {item}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PortraitPanel({ territory }: { territory: TerritorySummary }) {
  const [portrait, setPortrait] = useState<Portrait | null>(null)
  const [thinking, setThinking] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(
    async (refresh: boolean) => {
      const id = ++requestId.current
      setThinking(refresh ? 'Je réécris le portrait.' : "J'assemble le portrait.")
      setNotice(null)
      if (refresh) setPortrait(null)
      try {
        const url = `${API_URL}/territories/${territory.code_insee}/portrait${refresh ? '?refresh=true' : ''}`
        const response = await fetch(url)
        if (id !== requestId.current) return
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { detail?: string } | null
          setThinking(null)
          setNotice(body?.detail ?? "Le portrait n'a pas pu être assemblé. Reprenons.")
          return
        }
        setPortrait((await response.json()) as Portrait)
        setThinking(null)
      } catch {
        if (id !== requestId.current) return
        setThinking(null)
        setNotice("Je ne parviens pas à joindre mes services. L'API est-elle démarrée ?")
      }
    },
    [territory.code_insee],
  )

  useEffect(() => {
    void load(false)
    return () => {
      requestId.current++
    }
  }, [load])

  return (
    <motion.aside
      className="absolute left-6 top-24 z-10 flex max-h-[calc(100vh-160px)] w-[380px] flex-col"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.9, duration: dur.calm, ease: ease.arrive }}
    >
      <GlassPanel thinking={thinking !== null} className="flex min-h-0 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xs uppercase tracking-[0.3em] text-ink-3">Portrait</h2>
          {portrait && (
            <Button variant="subtle" onClick={() => void load(true)} title="Régénérer le portrait">
              ↻
            </Button>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
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
            {notice && (
              <motion.p
                key="notice"
                className="text-sm leading-relaxed text-ink-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>

          {portrait && (
            <div className="flex flex-col gap-4">
              <MeridianText className="text-[15px] leading-relaxed">
                {portrait.narrative}
              </MeridianText>
              <div className="flex flex-col gap-3">
                {Object.entries(portrait.sections).map(([name, items]) => (
                  <Section key={name} name={name} items={items} />
                ))}
              </div>
              <p className="font-mono text-2xs text-ink-3">
                {portrait.model} · {new Date(portrait.generated_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>
      </GlassPanel>
    </motion.aside>
  )
}
