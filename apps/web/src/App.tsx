/**
 * ATLAS — racine applicative.
 * Placeholder de vérification des tokens (nuit, Fraunces, Méridien au repos).
 * Remplacé par l'écran seuil et la cinématique à l'épic E2.
 */
function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 bg-void">
      <h1 className="font-display text-2xl font-light tracking-[0.3em] text-ink-1">ATLAS</h1>

      {/* Le Méridien au repos : un trait de lumière, signature du produit */}
      <div
        aria-hidden
        className="h-px w-40 bg-gradient-to-r from-transparent via-beam to-transparent"
        style={{ boxShadow: 'var(--beam-glow)' }}
      />

      <p className="text-2xs uppercase tracking-[0.35em] text-ink-3">Territory Intelligence</p>
      <p className="font-mono text-xs text-ink-3">48.9362, 2.3574</p>
    </main>
  )
}

export default App
