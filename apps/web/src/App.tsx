/**
 * ATLAS — racine applicative.
 * Le seuil et la cinématique arrivent avec l'épic E2 ; en attendant,
 * /design expose la galerie du design system pour validation visuelle.
 */
import { DesignGallery } from '@/features/design-gallery/DesignGallery'
import { MeridianLine } from '@/design-system'

function Threshold() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 bg-void">
      <h1 className="font-display text-2xl font-light tracking-[0.3em] text-ink-1">ATLAS</h1>
      <MeridianLine className="w-40" />
      <p className="text-2xs uppercase tracking-[0.35em] text-ink-3">Territory Intelligence</p>
      {import.meta.env.DEV && (
        <a href="/design" className="mt-6 text-xs text-ink-3 underline-offset-4 hover:underline">
          design system →
        </a>
      )}
    </main>
  )
}

function App() {
  if (window.location.pathname === '/design') return <DesignGallery />
  return <Threshold />
}

export default App
