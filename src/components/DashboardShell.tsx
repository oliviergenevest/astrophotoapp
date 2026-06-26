import { Button } from '@/components/ui/button'


interface Props {
  user: { email?: string } | null
  activeContract: { id: string; name: string } | null
  currentPath: string   // ← ajout
  children: React.ReactNode
}

export default function DashboardShell({ user, activeContract, currentPath, children }: Props) {

async function handleLogout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  window.location.href = '/login'
}

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}

<header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
  <div className="max-w-5xl mx-auto flex items-center justify-between">

    {/* Logo cliquable → dashboard */}
    <a
      href="/dashboard"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <span className="text-2xl">📷</span>
      <span className="text-xl font-bold text-slate-800">PhotoApp</span>
    </a>

    {/* Navigation centrale */}
    <nav className="hidden sm:flex items-center gap-1">
      <a
        href="/dashboard"
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${currentPath === '/dashboard'
            ? 'bg-slate-100 text-slate-900'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
      >
        Signatures
      </a>
      <a
        href="/contrats"
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${currentPath === '/contrats'
            ? 'bg-slate-100 text-slate-900'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
      >
        Contrats
      </a>
    </nav>

    {/* Droite : email + déconnexion */}
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-500 hidden sm:block truncate max-w-[160px]">
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
          
          {children}
        </div>

      </main>
    </div>
  )
}