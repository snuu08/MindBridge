export async function hashDocumentPassword(documentId: string, password: string) {
  const data = new TextEncoder().encode(`${documentId}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function documentPasswordMatches(
  documentId: string,
  password: string,
  passwordHash: string | undefined,
) {
  if (!passwordHash) return true
  return (await hashDocumentPassword(documentId, password)) === passwordHash
}
