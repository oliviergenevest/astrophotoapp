import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'login' | 'register'

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Email ou mot de passe incorrect.')
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError('Erreur lors de la création du compte : ' + error.message)
      } else {
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
      }
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="text-sm text-slate-500">
          {mode === 'login'
            ? 'Accédez à votre espace photographe'
            : 'Créez votre espace photographe'}
        </p>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          Email
        </label>
        <Input
          type="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'register' && (
          <p className="text-xs text-slate-400">6 caractères minimum</p>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Succès */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      {/* Bouton submit */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? 'Chargement…'
          : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </Button>

      {/* Switch mode */}
      <p className="text-center text-sm text-slate-500">
        {mode === 'login' ? (
          <>
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
              className="text-blue-600 hover:underline font-medium"
            >
              Créer un compte
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
              className="text-blue-600 hover:underline font-medium"
            >
              Se connecter
            </button>
          </>
        )}
      </p>

    </form>
  )
}