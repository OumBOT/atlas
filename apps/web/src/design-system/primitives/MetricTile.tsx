/**
 * MetricTile — la cellule de base de la dataviz d'ATLAS (IDENTITE §2.3) :
 * un chiffre grand et fin (Fraunces 300) qui compte jusqu'à sa valeur,
 * sa légende petite et tertiaire. Jamais gras et petit.
 */
import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { dur, ease } from '@/design-system/motion/variants'

interface MetricTileProps {
  value: number
  label: string
  /** Unité affichée après le chiffre (km², hab…). */
  unit?: string
  /** Décimales conservées pendant et après le comptage. */
  decimals?: number
}

const nf = (decimals: number) =>
  new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

export function MetricTile({ value, label, unit, decimals = 0 }: MetricTileProps) {
  const numberRef = useRef<HTMLSpanElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = numberRef.current
    if (!node || !inView) return
    if (reduced) {
      node.textContent = nf(decimals).format(value)
      return
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: ease.travel,
      onUpdate: (latest) => {
        node.textContent = nf(decimals).format(latest)
      },
    })
    return () => controls.stop()
  }, [inView, value, decimals, reduced])

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <p className="font-display text-3xl font-light tracking-tight text-ink-1">
        <span ref={numberRef}>0</span>
        {unit && <span className="ml-2 text-lg text-ink-2">{unit}</span>}
      </p>
      <p
        className="text-2xs uppercase tracking-[0.18em] text-ink-3"
        style={{ transitionDuration: `${dur.quick}s` }}
      >
        {label}
      </p>
    </div>
  )
}
