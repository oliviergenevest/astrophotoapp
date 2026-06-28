export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  const siteUrl = import.meta.env.SITE_URL
 
  // En développement on laisse passer
  if (import.meta.env.DEV) return true

  // En production on vérifie l'origine
  if (!origin || !siteUrl) return false
  // Retire le slash final des deux côtés avant de comparer
  return origin.replace(/\/$/, '') === siteUrl.replace(/\/$/, '')

}