import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServerClient } from '@/lib/supabase'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/nouvelle-signature',
  '/contrats',
  '/confirmation',
]

export const onRequest = defineMiddleware(async ({ url, cookies, request, redirect }, next) => {

  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_ROUTES.some(route =>
    url.pathname.startsWith(route)
  )

  if (isProtected && !user) {
    return redirect('/login')
  }

  if (url.pathname === '/login' && user) {
    return redirect('/dashboard')
  }

  return next()
})