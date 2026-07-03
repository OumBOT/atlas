/**
 * Le Méridien — signature d'ATLAS (IDENTITE §0.2).
 * Trois incarnations :
 *  - <MeridianLine>   : le trait au repos (logo, séparateurs de cérémonie)
 *  - <MeridianBorder> : la lumière qui longe un périmètre (pensée en cours)
 *  - <MeridianText>   : un texte qui s'écrit dans un sillage de lumière
 *
 * Règle produit : le Méridien remplace tout spinner, partout, toujours.
 */
import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'

import { dur, ease } from '@/design-system/motion/variants'

/** Le trait de lumière au repos. */
export function MeridianLine({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px bg-gradient-to-r from-transparent via-beam to-transparent ${className}`}
      style={{ boxShadow: 'var(--beam-glow)' }}
    />
  )
}

interface MeridianBorderProps {
  /** Rayon des coins — doit épouser celui du conteneur. */
  radius?: number
  /** Durée d'un tour complet (s). */
  duration?: number
}

/** Géométrie commune aux deux passes du faisceau (halo + cœur). */
function beamStyle(radius: number, duration: number): CSSProperties {
  return {
    x: 0.5,
    y: 0.5,
    width: 'calc(100% - 1px)',
    height: 'calc(100% - 1px)',
    rx: radius,
    fill: 'none',
    stroke: 'var(--color-beam)',
    strokeLinecap: 'round',
    strokeDasharray: '14 86',
    ['--meridian-duration' as never]: `${duration}s`,
  }
}

/**
 * La lumière qui parcourt la bordure d'un composant.
 * À poser dans un conteneur en `position: relative`.
 */
export function MeridianBorder({ radius = 18, duration = 2.4 }: MeridianBorderProps) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      {/* Halo : même trajet, plus large et flou */}
      <rect
        className="meridian-border-beam"
        pathLength={100}
        style={{
          ...beamStyle(radius, duration),
          strokeWidth: 5,
          opacity: 0.28,
          filter: 'blur(6px)',
        }}
      />
      {/* Cœur du faisceau */}
      <rect
        className="meridian-border-beam"
        pathLength={100}
        style={{ ...beamStyle(radius, duration), strokeWidth: 1.5 }}
      />
    </svg>
  )
}

interface MeridianTextProps {
  children: string
  className?: string
  /** Délai avant le premier mot (s). */
  delay?: number
}

/**
 * Texte écrit dans le sillage d'une lueur : chaque mot naît lumière
 * puis se pose en encre. C'est la voix visuelle d'ATLAS (Portrait).
 */
export function MeridianText({ children, className = '', delay = 0 }: MeridianTextProps) {
  const reduced = useReducedMotion()
  const words = children.split(' ')

  if (reduced) return <p className={className}>{children}</p>

  return (
    <p className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: 4, color: 'var(--color-beam)' }}
          animate={{ opacity: 1, y: 0, color: 'var(--color-ink-1)' }}
          transition={{
            delay: delay + i * 0.055,
            duration: dur.calm,
            ease: ease.arrive,
            color: { delay: delay + i * 0.055 + 0.18, duration: 0.6, ease: 'easeOut' },
          }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  )
}
