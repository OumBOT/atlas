/**
 * Button — trois voix : primary (l'action qui compte, halo beam),
 * ghost (verre discret), subtle (texte seul).
 * Au clic, une lueur naît au point de contact exact (IDENTITE §3.1 :
 * la lueur "utilisateur" est ponctuelle, blanche, brève).
 */
import { motion } from 'motion/react'
import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'subtle'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: Variant
}

const base =
  'relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden ' +
  'rounded-[8px] text-sm outline-none transition-colors duration-[240ms] ' +
  'focus-visible:ring-[1.5px] focus-visible:ring-beam focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-night-1 disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary:
    'bg-beam-deep px-4 py-2 font-medium text-ink-1 ' +
    'hover:bg-[#4a75e8] hover:shadow-[var(--beam-glow)]',
  ghost:
    'border border-stroke-faint bg-night-2/60 px-4 py-2 text-ink-2 ' +
    'hover:border-stroke-soft hover:text-ink-1',
  subtle: 'px-2 py-1 text-ink-2 hover:text-ink-1',
}

export function Button({ children, variant = 'ghost', onPointerDown, ...props }: ButtonProps) {
  /** Mémorise le point de contact pour y faire naître la lueur (CSS vars). */
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--px', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--py', `${event.clientY - rect.top}px`)
    onPointerDown?.(event)
  }

  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      className={`${base} ${variants[variant]} group`}
      onPointerDown={handlePointerDown}
      {...(props as object)}
    >
      {/* Lueur au point de contact — visible pendant l'appui uniquement */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[120ms] group-active:opacity-100"
        style={{
          background:
            'radial-gradient(48px circle at var(--px, 50%) var(--py, 50%), rgb(255 255 255 / 0.18), transparent 70%)',
        }}
      />
      {children}
    </motion.button>
  )
}
