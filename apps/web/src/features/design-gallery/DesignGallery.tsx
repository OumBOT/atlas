/**
 * Galerie du design system — page de validation visuelle (dev).
 * Accessible sur /design ; sera retirée du bundle de production
 * quand le shell applicatif arrivera (E2).
 */
import { motion } from 'motion/react'
import { useState } from 'react'

import {
  Button,
  GlassPanel,
  MeridianLine,
  MeridianText,
  MetricTile,
  staggerContainer,
  staggerItem,
} from '@/design-system'

/** La scène vivante factice derrière le verre (le verre exige un fond animé). */
function LivingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgb(61 104 224 / 0.14), transparent 65%)' }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-32 bottom-1/4 h-[420px] w-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgb(122 162 255 / 0.08), transparent 65%)' }}
        animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={staggerItem} className="flex flex-col gap-5">
      <h2 className="text-2xs uppercase tracking-[0.3em] text-ink-3">{title}</h2>
      {children}
    </motion.section>
  )
}

const PORTRAIT_SAMPLE =
  'Saint-Denis concentre une croissance démographique soutenue — 149 077 habitants ' +
  'au dernier recensement — portée par le Grand Paris et la fusion avec Pierrefitte. ' +
  "Cette lecture s'appuie sur les données geo.api.gouv.fr ; elle ne capture pas les " +
  'programmes de logements en cours de livraison.'

export function DesignGallery() {
  const [thinking, setThinking] = useState(true)
  const [textKey, setTextKey] = useState(0)

  return (
    <div className="min-h-full bg-night-1">
      <LivingBackdrop />

      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex max-w-3xl flex-col gap-14 px-6 py-16"
      >
        {/* En-tête de cérémonie */}
        <motion.header variants={staggerItem} className="flex flex-col items-center gap-5">
          <h1 className="font-display text-2xl font-light tracking-[0.3em]">ATLAS</h1>
          <MeridianLine className="w-40" />
          <p className="text-2xs uppercase tracking-[0.35em] text-ink-3">
            Design system · nuit, verre, lumière
          </p>
        </motion.header>

        <Section title="La pensée — GlassPanel & Méridien">
          <GlassPanel thinking={thinking} className="p-6">
            <p className="text-sm leading-relaxed text-ink-2">
              {thinking
                ? 'Je calcule les isochrones — une trentaine de secondes.'
                : 'Analyse terminée. Le détail est sur la carte.'}
            </p>
          </GlassPanel>
          <div>
            <Button variant="ghost" onClick={() => setThinking((v) => !v)}>
              {thinking ? 'Terminer la pensée' : 'Relancer la pensée'}
            </Button>
          </div>
        </Section>

        <Section title="La voix — MeridianText">
          <GlassPanel className="p-6">
            <MeridianText key={textKey} className="text-base leading-relaxed">
              {PORTRAIT_SAMPLE}
            </MeridianText>
          </GlassPanel>
          <div>
            <Button variant="ghost" onClick={() => setTextKey((k) => k + 1)}>
              Rejouer l'écriture
            </Button>
          </div>
        </Section>

        <Section title="Les chiffres — MetricTile (données réelles du seed)">
          <GlassPanel className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-3">
            <MetricTile value={149077} label="Habitants · Saint-Denis" />
            <MetricTile value={36.41} unit="km²" label="Superficie · Saint-Malo" decimals={2} />
            <MetricTile value={4562} label="Habitants · Milly-la-Forêt" />
          </GlassPanel>
        </Section>

        <Section title="Les actions — Button">
          <GlassPanel className="flex flex-wrap items-center gap-4 p-6">
            <Button variant="primary">Verser au dossier</Button>
            <Button variant="ghost">Approfondir</Button>
            <Button variant="subtle">Plus tard</Button>
            <Button variant="primary" disabled>
              Indisponible
            </Button>
          </GlassPanel>
          <p className="text-xs text-ink-3">
            Maintenir le clic : la lueur naît au point de contact. Tab : l'anneau de focus.
          </p>
        </Section>

        <Section title="Le verre surélevé — glass-raised">
          <GlassPanel className="p-6">
            <p className="mb-4 text-sm text-ink-2">Niveau 1 — panneau de travail</p>
            <GlassPanel raised className="p-5">
              <p className="text-sm text-ink-1">
                Niveau 2 — modale ou menu. Jamais de troisième niveau.
              </p>
            </GlassPanel>
          </GlassPanel>
        </Section>

        <footer className="flex flex-col items-center gap-4 pt-4">
          <MeridianLine className="w-24" />
          <p className="font-mono text-xs text-ink-3">tokens · docs/IDENTITE.md</p>
        </footer>
      </motion.main>
    </div>
  )
}
