/**
 * CommandBar (⌘K) — le point d'entrée de l'intention (IDENTITE §2.7, §9).
 * Le monde s'incline (fond assombri), la palette descend, la recherche
 * est immédiate et tolérante aux accents. Navigation clavier complète.
 *
 * Primitive volontairement sans dépendance (pas de cmdk) : le contrôle
 * total du motion et du style vaut les ~150 lignes.
 */
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { dur, ease } from '@/design-system/motion/variants'

export interface CommandItem {
  id: string
  label: string
  /** Indication à droite (raccourci, statut, « E3 »…). */
  hint?: string
  /** Petit symbole à gauche (émoji ou icône). */
  icon?: ReactNode
  /** Grisé mais visible (fonctionnalité à venir). */
  disabled?: boolean
  onSelect?: () => void
}

interface CommandBarProps {
  items: CommandItem[]
  placeholder?: string
}

/** Normalisation accent/casse pour un filtrage tolérant (« milly foret »). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function CommandBar({
  items,
  placeholder = 'Rechercher un territoire, une action…',
}: CommandBarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return items
    return items.filter((item) => normalize(item.label).includes(q))
  }, [items, query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    previousFocus.current?.focus()
  }, [])

  /** ⌘K / Ctrl+K : ouverture globale. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) {
          close()
        } else {
          previousFocus.current = document.activeElement as HTMLElement
          setOpen(true)
        }
      }
      if (event.key === 'Escape' && open) close()
    }
    function onOpenEvent() {
      if (!open) {
        previousFocus.current = document.activeElement as HTMLElement
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('atlas:open-commandbar', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('atlas:open-commandbar', onOpenEvent)
    }
  }, [open, close])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  function select(item: CommandItem) {
    if (item.disabled) return
    item.onSelect?.()
    close()
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = results[activeIndex]
      if (item) select(item)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.quick }}
        >
          {/* Le monde s'incline : voile qui assombrit la scène */}
          <div
            className="absolute inset-0 bg-void/55 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Palette de commandes"
            className="glass-raised relative z-10 w-[min(560px,92vw)] overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: dur.quick, ease: ease.arrive }}
          >
            <div className="flex items-center gap-3 border-b border-stroke-faint px-5 py-4">
              <span aria-hidden className="text-ink-3">
                ⌕
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={placeholder}
                className="w-full bg-transparent text-base text-ink-1 outline-none placeholder:text-ink-3"
                role="combobox"
                aria-expanded="true"
                aria-controls="commandbar-results"
                aria-activedescendant={results[activeIndex]?.id}
              />
              <kbd className="rounded border border-stroke-faint px-1.5 py-0.5 font-mono text-2xs text-ink-3">
                esc
              </kbd>
            </div>

            <ul
              id="commandbar-results"
              role="listbox"
              className="max-h-[320px] overflow-y-auto p-2"
            >
              {results.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-ink-3">
                  Aucun résultat. Ce territoire m'est encore inconnu.
                </li>
              )}
              {results.map((item, index) => (
                <li
                  key={item.id}
                  id={item.id}
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={item.disabled}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => select(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm transition-colors duration-[120ms] ${
                    index === activeIndex ? 'bg-night-3 text-ink-1' : 'text-ink-2'
                  } ${item.disabled ? 'cursor-default opacity-45' : ''}`}
                >
                  {item.icon && (
                    <span aria-hidden className="w-4 text-center text-ink-3">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.hint && <span className="font-mono text-2xs text-ink-3">{item.hint}</span>}
                  {index === activeIndex && !item.disabled && (
                    <motion.span
                      layoutId="commandbar-active-beam"
                      aria-hidden
                      className="h-3 w-px bg-beam"
                      style={{ boxShadow: 'var(--beam-glow)' }}
                    />
                  )}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 border-t border-stroke-faint px-5 py-2.5 text-2xs text-ink-3">
              <span>↑↓ naviguer</span>
              <span>↵ ouvrir</span>
              <span className="ml-auto font-mono">ATLAS</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
