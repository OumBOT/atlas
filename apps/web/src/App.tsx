/**
 * ATLAS — racine applicative.
 * Deux vues : le globe (Intro) et le territoire (TerritoryView).
 * La palette ⌘K est peuplée par l'API ; ouvrir un territoire depuis le
 * globe déclenche le piqué orbital avant la bascule vers la carte.
 */
import { useEffect, useMemo, useState } from 'react'

import { CommandBar } from '@/design-system'
import type { CommandItem } from '@/design-system'
import { DesignGallery } from '@/features/design-gallery/DesignGallery'
import { Intro } from '@/features/intro/Intro'
import { TerritoryView } from '@/features/map/TerritoryView'
import { fetchTerritories } from '@/lib/api'
import type { TerritorySummary } from '@/lib/api'

type View =
  { kind: 'globe'; returning: boolean } | { kind: 'territory'; territory: TerritorySummary }

function App() {
  const [territories, setTerritories] = useState<TerritorySummary[]>([])
  const [view, setView] = useState<View>({ kind: 'globe', returning: false })

  /** Les territoires connus d'ATLAS peuplent la palette. */
  useEffect(() => {
    fetchTerritories()
      .then(setTerritories)
      .catch(() => setTerritories([]))
  }, [])

  /** Fin du piqué orbital → bascule vers la carte. */
  useEffect(() => {
    function onDiveComplete(event: Event) {
      const { code } = (event as CustomEvent<{ code: string }>).detail
      const territory = territories.find((t) => t.code_insee === code)
      if (territory) setView({ kind: 'territory', territory })
    }
    window.addEventListener('atlas:dive-complete', onDiveComplete)
    return () => window.removeEventListener('atlas:dive-complete', onDiveComplete)
  }, [territories])

  const commands = useMemo<CommandItem[]>(() => {
    const open = (territory: TerritorySummary) => {
      if (view.kind === 'globe') {
        window.dispatchEvent(
          new CustomEvent('atlas:dive', {
            detail: {
              code: territory.code_insee,
              lon: territory.centroid[0],
              lat: territory.centroid[1],
            },
          }),
        )
      } else {
        setView({ kind: 'territory', territory })
      }
    }
    const territoryItems: CommandItem[] = territories.map((t) => ({
      id: `territory-${t.code_insee}`,
      icon: '◈',
      label: `Ouvrir ${t.name}`,
      hint: t.code_insee,
      onSelect: () => open(t),
    }))
    return [
      ...territoryItems,
      ...(view.kind === 'territory'
        ? [
            {
              id: 'back-to-globe',
              icon: '○',
              label: 'Retour au globe',
              onSelect: () => setView({ kind: 'globe', returning: true }),
            },
          ]
        : []),
    ]
  }, [territories, view])

  if (window.location.pathname === '/design') {
    return (
      <>
        <DesignGallery />
        <CommandBar items={commands} />
      </>
    )
  }

  return (
    <>
      {view.kind === 'globe' ? (
        <Intro startAtMenu={view.returning} />
      ) : (
        <TerritoryView
          territory={view.territory}
          onBackToGlobe={() => setView({ kind: 'globe', returning: true })}
        />
      )}
      <CommandBar items={commands} />
    </>
  )
}

export default App
