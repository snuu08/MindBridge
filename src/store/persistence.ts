import type { MindMapDocument, SaveStatus } from '../types/mindmap.ts'
import { backupRawDocument, migrateDocument, STORAGE_KEY } from './migration.ts'

export const LIBRARY_KEY = 'mindbridge:library'

function sortLibrary(documents: MindMapDocument[]) {
  return [...documents].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function readLibrary(): MindMapDocument[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return []
    const documents = (parsed as { documents?: unknown }).documents
    if (!Array.isArray(documents)) return []
    return documents
      .map((item) => migrateDocument(item))
      .filter((item): item is MindMapDocument => item !== null)
  } catch {
    return []
  }
}

function writeLibrary(documents: MindMapDocument[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify({ version: 1, documents }))
}

export function loadDocument(): MindMapDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    const migrated = migrateDocument(parsed)
    if (!migrated) {
      backupRawDocument(raw)
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return migrated
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) backupRawDocument(raw)
    } catch {
      // ignore
    }
    return null
  }
}

export function loadLibrary(): MindMapDocument[] {
  const library = readLibrary()
  if (library.length > 0) return sortLibrary(library)
  const current = loadDocument()
  if (!current) return []
  writeLibrary([current])
  return [current]
}

export function getLibraryDocument(id: string): MindMapDocument | null {
  return loadLibrary().find((item) => item.id === id) ?? null
}

function upsertLibrary(document: MindMapDocument) {
  const library = readLibrary()
  writeLibrary(sortLibrary([document, ...library.filter((item) => item.id !== document.id)]))
}

export function saveDocument(document: MindMapDocument): SaveStatus {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
    upsertLibrary(document)
    return 'saved'
  } catch {
    return 'failed'
  }
}

export function updateLibraryDocument(document: MindMapDocument): SaveStatus {
  try {
    upsertLibrary(document)
    const active = loadDocument()
    if (active?.id === document.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document))
    }
    return 'saved'
  } catch {
    return 'failed'
  }
}

export function deleteLibraryDocument(id: string): void {
  writeLibrary(readLibrary().filter((item) => item.id !== id))
  const active = loadDocument()
  if (active?.id === id) {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function clearDocument(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
