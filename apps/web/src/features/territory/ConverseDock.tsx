/**
 * ConverseDock : dialoguer avec le territoire (E6.2).
 * L'entrée vit en bas de l'écran ; les échanges flottent au-dessus,
 * en verre. La réponse d'ATLAS arrive en flux et s'écrit en direct,
 * précédée du battement du Méridien.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { GlassPanel, dur, ease } from '@/design-system'
import type { TerritorySummary } from '@/lib/api'

const API_URL: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Où le bâti se concentre-t-il ?',
  'Quelles sont tes sources ?',
  'Résume les risques.',
]

export function ConverseDock({ territory }: { territory: TerritorySummary }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /** Nouvelle commune : nouvelle conversation. */
  useEffect(() => {
    setTurns([])
    setDraft('')
    setSpeaking(false)
    abortRef.current?.abort()
    return () => abortRef.current?.abort()
  }, [territory.code_insee])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  async function send(message: string) {
    const text = message.trim()
    if (!text || speaking) return
    const history = turns
    setTurns((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '' },
    ])
    setDraft('')
    setSpeaking(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch(`${API_URL}/territories/${territory.code_insee}/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error(String(response.status))

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const fragment = decoder.decode(value, { stream: true })
        setTurns((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { role: 'assistant', content: last.content + fragment }
          }
          return next
        })
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setTurns((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant' && last.content === '') {
            next[next.length - 1] = {
              role: 'assistant',
              content: "Je ne parviens pas à répondre. L'API est-elle démarrée ?",
            }
          }
          return next
        })
      }
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <motion.div
      className="absolute inset-x-0 bottom-6 z-10 mx-auto flex w-[min(600px,92vw)] flex-col gap-3"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.6, duration: dur.calm, ease: ease.arrive }}
    >
      {/* Les échanges */}
      <AnimatePresence>
        {turns.length > 0 && (
          <motion.div
            ref={scrollRef}
            className="flex max-h-[38vh] flex-col gap-2 overflow-y-auto pr-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {turns.map((turn, index) => (
              <motion.div
                key={index}
                className={turn.role === 'user' ? 'self-end' : 'self-start'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.quick, ease: ease.arrive }}
              >
                <GlassPanel
                  thinking={turn.role === 'assistant' && turn.content === '' && speaking}
                  className={`max-w-[520px] px-4 py-2.5 text-sm leading-relaxed ${
                    turn.role === 'user' ? 'text-ink-1' : 'text-ink-2'
                  }`}
                >
                  {turn.content === '' && turn.role === 'assistant' ? (
                    <span className="text-ink-3">…</span>
                  ) : (
                    turn.content
                  )}
                </GlassPanel>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions d'ouverture */}
      {turns.length === 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => void send(suggestion)}
              className="glass cursor-pointer px-3 py-1.5 text-xs text-ink-3 transition-colors duration-[240ms] hover:text-ink-1 focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* L'entrée */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send(draft)
        }}
      >
        <GlassPanel raised className="flex items-center gap-3 px-5 py-3">
          <span aria-hidden className="text-ink-3">
            ◍
          </span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={speaking ? 'ATLAS répond…' : `Interroger ${territory.name}…`}
            disabled={speaking}
            className="w-full bg-transparent text-sm text-ink-1 outline-none placeholder:text-ink-3 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={speaking || draft.trim() === ''}
            className="cursor-pointer font-mono text-2xs text-ink-3 transition-colors duration-[240ms] hover:text-ink-1 disabled:cursor-default disabled:opacity-40 focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:outline-none"
          >
            ↵
          </button>
        </GlassPanel>
      </form>
    </motion.div>
  )
}
