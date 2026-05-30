import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '@/lib/supabase'

// PATCH — activer un contrat
export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
  }

  const { id } = params

  // Désactive tous les contrats du photographe
  await supabase
    .from('contracts')
    .update({ is_active: false })
    .eq('photographer_id', user.id)

  // Active le contrat sélectionné
  const { error } = await supabase
    .from('contracts')
    .update({ is_active: true })
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}

// DELETE — supprimer un contrat
export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 })
  }

  const { id } = params

  // Récupère le file_path avant suppression
  const { data: contract } = await supabase
    .from('contracts')
    .select('file_path')
    .eq('id', id)
    .eq('photographer_id', user.id)
    .single()

  if (!contract) {
    return new Response(JSON.stringify({ error: 'Contrat introuvable' }), { status: 404 })
  }

  // Supprime le fichier dans Storage
  await supabase.storage
    .from('contracts')
    .remove([contract.file_path])

  // Supprime en base
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id)
    .eq('photographer_id', user.id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}