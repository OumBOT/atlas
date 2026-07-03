/**
 * ATLAS — racine applicative.
 * Le seuil et la cinématique arrivent avec l'épic E2 ; en attendant,
 * /design expose la galerie et ⌘K la palette de commandes.
 */
import { CommandBar, MeridianLine } from '@/design-system'
import type { CommandItem } from '@/design-system'
import { DesignGallery } from '@/features/design-gallery/DesignGallery'

/** Items de la palette — les territoires s'ouvriront réellement en E3. */
const COMMANDS: CommandItem[] = [
  { id: 'cmd-saint-denis', icon: '◈', label: 'Ouvrir Saint-Denis', hint: 'E3', disabled: true },
  { id: 'cmd-milly', icon: '◈', label: 'Ouvrir Milly-la-Forêt', hint: 'E3', disabled: true },
  { id: 'cmd-saint-malo', icon: '◈', label: 'Ouvrir Saint-Malo', hint: 'E3', disabled: true },
  {
    id: 'cmd-design',
    icon: '✦',
    label: 'Design system',
    hint: '/design',
    onSelect: () => window.location.assign('/design'),
  },
  {
    id: 'cmd-home',
    icon: '○',
    label: 'Retour au seuil',
    onSelect: () => window.location.assign('/'),
  },
]

function Threshold() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 bg-void">
      <h1 className="font-display text-2xl font-light tracking-[0.3em] text-ink-1">ATLAS</h1>
      <MeridianLine className="w-40" />
      <p className="text-2xs uppercase tracking-[0.35em] text-ink-3">Territory Intelligence</p>
      <p className="mt-6 text-xs text-ink-3">
        <kbd className="rounded border border-stroke-faint px-1.5 py-0.5 font-mono">⌘K</kbd> pour
        commencer
      </p>
    </main>
  )
}

function App() {
  return (
    <>
      {window.location.pathname === '/design' ? <DesignGallery /> : <Threshold />}
      <CommandBar items={COMMANDS} />
    </>
  )
}

export default App
