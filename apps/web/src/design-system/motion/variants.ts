/**
 * Grammaire motion d'ATLAS (IDENTITE §4).
 * Une seule source pour les courbes et durées : les composants ne
 * définissent jamais leurs timings en local.
 */
import type { Transition, Variants } from 'motion/react'

/** Courbes nommées — miroir des tokens CSS (--ease-*). */
export const ease = {
  arrive: [0.16, 1, 0.3, 1],
  depart: [0.7, 0, 0.84, 0],
  travel: [0.65, 0, 0.35, 1],
} as const

/** Durées (secondes) — miroir des tokens CSS (--dur-*). */
export const dur = {
  instant: 0.12,
  quick: 0.24,
  calm: 0.42,
  scene: 0.8,
  cinema: 2.4,
} as const

/** Le verre a une masse : ressort amorti des panneaux (IDENTITE §4.1). */
export const glassSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 1,
}

/** Entrée standard d'un panneau de verre (translation + fondu). */
export const panelVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: glassSpring },
  exit: { opacity: 0, y: 12, transition: { duration: dur.quick, ease: ease.depart } },
}

/** Liste qui se compose : conteneur + éléments en cascade (stagger 45 ms). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.quick, ease: ease.arrive } },
}
