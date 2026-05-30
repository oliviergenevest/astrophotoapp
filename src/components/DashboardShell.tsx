import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface Props {
  user: { email?: string } | null
  activeContract: { id: string; name: string } | null
  children: React.ReactNode
}

export default function DashboardShell({ user, activeContract, children }: Props) {

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">PhotoApp</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Actions principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Bouton Nouvelle signature */}
          <a href="/nouvelle-signature">
            <div className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-2xl p-6 text-white cursor-pointer group">
              <div className="text-3xl mb-3">✍️</div>
              <h2 className="text-lg font-semibold">Nouvelle signature</h2>
              <p className="text-blue-100 text-sm mt-1">
                Faire signer un droit à l'image
              </p>
            </div>
          </a>

          {/* Accès gestion des contrats */}
          <a href="/contrats">
            <div className="bg-white hover:bg-slate-50 transition-colors rounded-2xl p-6 border border-slate-200 cursor-pointer group">
              <div className="text-3xl mb-3">📄</div>
              <h2 className="text-lg font-semibold text-slate-800">
                Mes contrats
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {activeContract
                  ? <>Actif : <span className="font-medium text-slate-700">{activeContract.name}</span></>
                  : <span className="text-amber-500">Aucun contrat actif</span>
                }
              </p>
            </div>
          </a>

        </div>

        {/* Liste des signatures */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Dernières signatures</h2>
          </div>
          {children}
        </div>

      </main>
    </div>
  )
}