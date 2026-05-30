import { createBrowserClient, createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// ─── Client côté navigateur (React Islands) ───
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// ─── Client côté serveur (pages Astro + middleware) ───
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '')
          .filter((cookie): cookie is { name: string; value: string } =>
            cookie.value !== undefined
          )
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options)
        })
      },
    },
  })
}