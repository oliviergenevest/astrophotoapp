import { useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: 'Syne, sans-serif', color: '#F5F0E8' }}
        >
          Connexion
        </h2>
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>
          Accédez à votre espace photographe
        </p>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
          <Mail className="w-3.5 h-3.5" />
          Email
        </label>
        <input
          type="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{
            background: '#0F1923',
            border: '0.5px solid rgba(201,168,76,0.2)',
            color: '#F5F0E8',
          }}
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#C9A84C' }}>
          <Lock className="w-3.5 h-3.5" />
          Mot de passe
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
          style={{
            background: '#0F1923',
            border: '0.5px solid rgba(201,168,76,0.2)',
            color: '#F5F0E8',
          }}
        />
      </div>

      {error && (
        <div
          className="text-sm rounded-lg px-4 py-3"
          style={{ background: 'rgba(255,77,109,0.1)', border: '0.5px solid rgba(255,77,109,0.3)', color: '#FF4D6D' }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
        style={{ background: '#AAFF00', color: '#0F1923', fontFamily: 'Syne, sans-serif' }}
      >
        {loading ? (
          'Connexion…'
        ) : (
          <>
            <LogIn className="w-5 h-5" />
            Se connecter
          </>
        )}
      </button>

    </form>
  )
}