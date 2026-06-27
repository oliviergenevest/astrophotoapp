export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const siteUrl = import.meta.env.SITE_URL
 console.log('Origin reçu:', origin)
  console.log('SITE_URL:', siteUrl)
  // En développement on laisse passer
  if (import.meta.env.DEV) return true

  // En production on vérifie l'origine
  if (!origin || !siteUrl) return false
  return origin === siteUrl
}