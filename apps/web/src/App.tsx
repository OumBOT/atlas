/**
 * ATLAS — racine applicative.
 * Le seuil et la cinématique arrivent avec l'épic E2 ; en attendant,
 * /design expose la galerie et ⌘K la palette de commandes.
 */
import { CommandBar } from '@/design-system'
import type { CommandItem } from '@/design-system'
import { DesignGallery } from '@/features/design-gallery/DesignGallery'
import { Intro } from '@/features/intro/Intro'

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

function App() {
  return (
    <>
      {window.location.pathname === '/design' ? <DesignGallery /> : <Intro />}
      <CommandBar items={COMMANDS} />
    </>
  )
}

export default App
