/**
 * GlassPanel — la matière "verre" d'ATLAS (IDENTITE §2.6).
 * Toujours posé au-dessus d'une scène vivante, jamais sur aplat ;
 * maximum deux niveaux superposés.
 * `thinking` allume la pensée : bordure lit + Méridien en périmètre.
 */
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { panelVariants } from '@/design-system/motion/variants'
import { MeridianBorder } from '@/design-system/primitives/Meridian'

interface GlassPanelProps {
  children: ReactNode
  /** Niveau surélevé (modales, menus contextuels). */
  raised?: boolean
  /** ATLAS travaille sur ce panneau. */
  thinking?: boolean
  className?: string
}

export function GlassPanel({
  children,
  raised = false,
  thinking = false,
  className = '',
}: GlassPanelProps) {
  return (
    <motion.section
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative ${raised ? 'glass-raised' : 'glass'} ${className}`}
      style={thinking ? { borderColor: 'var(--color-stroke-lit)' } : {}}
    >
      {thinking && <MeridianBorder radius={18} />}
      {children}
    </motion.section>
  )
}
