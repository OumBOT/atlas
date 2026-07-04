/**
 * Galerie du design system — v2, avec l'atmosphère (IDENTITE §3).
 * Nuit vivante (aurores, poussière, grain, vignette), lumière-curseur,
 * chorégraphie d'entrée, révélations au scroll, verre qui s'incline.
 * Accessible sur /design ; retirée du bundle de production en E2.
 */
import { motion } from 'motion/react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  Button,
  GlassPanel,
  MeridianLine,
  MeridianText,
  MetricTile,
  dur,
  ease,
} from '@/design-system'
import { CursorLight, SpaceDust, TiltOnHover } from '@/design-system/primitives/Atmosphere'

/** Aurores : deux masses de lumière qui respirent derrière le verre. */
function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-52 top-[16%] h-[640px] w-[640px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgb(61 104 224 / 0.16), transparent 62%)' }}
        animate={{ x: [0, 90, 0], y: [0, -50, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-40 bottom-[14%] h-[520px] w-[520px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgb(122 162 255 / 0.1), transparent 62%)' }}
        animate={{ x: [0, -70, 0], y: [0, 40, 0], scale: [1.08, 1, 1.08] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/** Section révélée au scroll : titre qui se déplie, contenu qui monte. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 36, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: dur.scene, ease: ease.arrive }}
    >
      <div className="flex items-center gap-4">
        <h2 className="shrink-0 text-2xs uppercase tracking-[0.3em] text-ink-3">{title}</h2>
        <motion.div
          className="h-px flex-1 origin-left bg-stroke-faint"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: dur.scene, ease: ease.travel, delay: 0.15 }}
        />
      </div>
      {children}
    </motion.section>
  )
}

const PORTRAIT_SAMPLE =
  'Saint-Denis concentre une croissance démographique soutenue, 149 077 habitants ' +
  'au dernier recensement, portée par le Grand Paris et la fusion avec Pierrefitte. ' +
  "Cette lecture s'appuie sur les données geo.api.gouv.fr ; elle ne capture pas les " +
  'programmes de logements en cours de livraison.'

const WORDMARK = 'ATLAS'.split('')

export function DesignGallery() {
  const [thinking, setThinking] = useState(true)
  const [textKey, setTextKey] = useState(0)

  return (
    <div className="min-h-full bg-night-1" style={{ perspective: 1200 }}>
      {/* Atmosphère — l'ordre des couches compte (P0 → P4) */}
      <Aurora />
      <SpaceDust />
      <CursorLight />

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col gap-16 px-6 py-20">
        {/* ── Cérémonie d'entrée ── */}
        <header className="flex flex-col items-center gap-6">
          <h1 className="font-display text-4xl font-light tracking-[0.28em] text-ink-1">
            {WORDMARK.map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.25 + i * 0.09, duration: 0.9, ease: ease.arrive }}
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          {/* Le Méridien se trace, puis s'allume */}
          <motion.div
            className="w-48 origin-center"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.85, duration: 1.1, ease: ease.travel }}
          >
            <MeridianLine />
          </motion.div>

          <motion.p
            className="text-2xs uppercase tracking-[0.4em] text-ink-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 1 }}
          >
            Design system · nuit, verre, lumière
          </motion.p>
        </header>

        <Section title="La pensée">
          <TiltOnHover>
            <GlassPanel thinking={thinking} className="p-6">
              <p className="text-sm leading-relaxed text-ink-2">
                {thinking
                  ? 'Je calcule les isochrones — une trentaine de secondes.'
                  : 'Analyse terminée. Le détail est sur la carte.'}
              </p>
            </GlassPanel>
          </TiltOnHover>
          <div>
            <Button variant="ghost" onClick={() => setThinking((v) => !v)}>
              {thinking ? 'Terminer la pensée' : 'Relancer la pensée'}
            </Button>
          </div>
        </Section>

        <Section title="La voix">
          <TiltOnHover>
            <GlassPanel className="p-6">
              <MeridianText key={textKey} className="text-base leading-relaxed">
                {PORTRAIT_SAMPLE}
              </MeridianText>
            </GlassPanel>
          </TiltOnHover>
          <div>
            <Button variant="ghost" onClick={() => setTextKey((k) => k + 1)}>
              Rejouer l'écriture
            </Button>
          </div>
        </Section>

        <Section title="Les chiffres — données réelles du seed">
          <TiltOnHover>
            <GlassPanel className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-3">
              <MetricTile value={149077} label="Habitants · Saint-Denis" />
              <MetricTile value={36.41} unit="km²" label="Superficie · Saint-Malo" decimals={2} />
              <MetricTile value={4562} label="Habitants · Milly-la-Forêt" />
            </GlassPanel>
          </TiltOnHover>
        </Section>

        <Section title="Les actions">
          <TiltOnHover>
            <GlassPanel className="flex flex-wrap items-center gap-4 p-6">
              <Button variant="primary">Verser au dossier</Button>
              <Button variant="ghost">Approfondir</Button>
              <Button variant="subtle">Plus tard</Button>
              <Button variant="primary" disabled>
                Indisponible
              </Button>
            </GlassPanel>
          </TiltOnHover>
          <p className="text-xs text-ink-3">
            Maintenir le clic : la lueur naît au point de contact. Tab : l'anneau de focus.
          </p>
        </Section>

        <Section title="Le verre surélevé">
          <TiltOnHover>
            <GlassPanel className="p-6">
              <p className="mb-4 text-sm text-ink-2">Niveau 1 — panneau de travail</p>
              <GlassPanel raised className="p-5">
                <p className="text-sm text-ink-1">
                  Niveau 2 — modale ou menu. Jamais de troisième niveau.
                </p>
              </GlassPanel>
            </GlassPanel>
          </TiltOnHover>
        </Section>

        <motion.footer
          className="flex flex-col items-center gap-4 pt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <MeridianLine className="w-24" />
          <p className="font-mono text-xs text-ink-3">tokens · docs/IDENTITE.md</p>
        </motion.footer>
      </main>

      {/* Post-processing — toujours au-dessus de tout */}
      <div className="atlas-vignette" />
      <div className="atlas-grain" />
    </div>
  )
}
