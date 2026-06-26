import { escape } from 'html-escaper'

export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return escape(value.trim())
}

export function sanitizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  const email = value.trim().toLowerCase()
  // Vérifie le format email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return ''
  return escape(email)
}


// ─── Validation PDF ───────────────────────────────────────────────
// Fonction de vérification magic bytes
export async function isPDFValid(file: File): Promise<boolean> {
  const bytes = await file.slice(0, 4).arrayBuffer()
  const header = new Uint8Array(bytes)
  return header[0] === 0x25 && // %
         header[1] === 0x50 && // P
         header[2] === 0x44 && // D
         header[3] === 0x46    // F
}
