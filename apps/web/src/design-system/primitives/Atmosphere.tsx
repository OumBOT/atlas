/**
 * Atmosphère — les couches qui font qu'ATLAS respire (IDENTITE §3).
 * - <SpaceDust>     : poussière dérivante, donne l'échelle (§3.3)
 * - <CursorLight>   : la lueur "utilisateur" suit le pointeur (§3.1)
 * - <TiltOnHover>   : la physique du papier précieux (§9)
 * Tout est GPU-friendly (transform/opacity), et s'efface en reduced-motion.
 */
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useMemo } from 'react'
import type { PointerEvent, ReactNode } from 'react'

/** Générateur pseudo-aléatoire déterministe (mêmes poussières à chaque visite). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Poussière d'espace : ~90 points en dérive brownienne très lente. */
export function SpaceDust({ count = 90 }: { count?: number }) {
  const reduced = useReducedMotion()
  const dust = useMemo(() => {
    const rand = mulberry32(1836)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: 0.5 + rand() * 1.2,
      opacity: 0.04 + rand() * 0.09,
      driftX: (rand() - 0.5) * 40,
      driftY: (rand() - 0.5) * 40,
      duration: 18 + rand() * 26,
      delay: -rand() * 30,
    }))
  }, [count])

  if (reduced) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {dust.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-ink-1"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{ x: [0, p.driftX, 0], y: [0, p.driftY, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/** La lueur qui suit le pointeur — la lumière raconte qui agit (§3.1). */
export function CursorLight() {
  const reduced = useReducedMotion()
  const x = useMotionValue(-400)
  const y = useMotionValue(-400)
  const sx = useSpring(x, { stiffness: 120, damping: 24, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 120, damping: 24, mass: 0.6 })

  useEffect(() => {
    if (reduced) return
    const onMove = (e: globalThis.PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [x, y, reduced])

  if (reduced) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed -left-[300px] -top-[300px] z-0 h-[600px] w-[600px] rounded-full"
      style={{
        x: sx,
        y: sy,
        background: 'radial-gradient(circle, rgb(122 162 255 / 0.07), transparent 62%)',
      }}
    />
  )
}

interface TiltOnHoverProps {
  children: ReactNode
  className?: string
  /** Inclinaison maximale (degrés). Le papier précieux reste subtil. */
  max?: number
}

/** Le verre s'incline sous le regard — profondeur tactile (§9). */
export function TiltOnHover({ children, className = '', max = 1.8 }: TiltOnHoverProps) {
  const reduced = useReducedMotion()
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 26 })
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 26 })

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    ry.set(px * max * 2)
    rx.set(-py * max * 2)
  }

  function onPointerLeave() {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  )
}
