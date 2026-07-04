/** Client HTTP vers l'API ATLAS. */

const API_URL: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:8000'

export interface TerritorySummary {
  code_insee: string
  name: string
  population: number | null
  surface_km2: number | null
  centroid: [number, number]
}

export async function fetchTerritories(): Promise<TerritorySummary[]> {
  const response = await fetch(`${API_URL}/territories`)
  if (!response.ok) throw new Error(`territories: ${response.status}`)
  return (await response.json()) as TerritorySummary[]
}

export function boundaryUrl(codeInsee: string): string {
  return `${API_URL}/territories/${codeInsee}/boundary`
}
