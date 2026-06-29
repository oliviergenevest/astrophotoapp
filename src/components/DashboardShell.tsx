import { PenLine, FileText, LogOut } from 'lucide-react'

interface Props {
  user: { email?: string } | null
  activeContract: { id: string; name: string } | null
  currentPath: string
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
    <div className="min-h-screen" style={{ background: '#0F1923' }}>

      {/* Header */}
      <header
        style={{
          background: '#0F1923',
          borderBottom: '0.5px solid rgba(201,168,76,0.2)',
        }}
        className="sticky top-0 z-10 px-6 py-0 h-14 flex items-center justify-between"
      >
        {/* Logo */}
        <a
          href="/dashboard"
          style={{ fontFamily: 'Syne, sans-serif', color: '#C9A84C' }}
          className="text-xl font-bold tracking-wide hover:opacity-80 transition-opacity"
        >
          Signa
        </a>

        {/* Nav centrale */}
        <nav className="hidden sm:flex items-center gap-1">
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: currentPath === '/dashboard' ? '#1A2733' : 'transparent',
              color: currentPath === '/dashboard' ? '#F5F0E8' : 'rgba(245,240,232,0.4)',
            }}
          >
            <PenLine className="w-4 h-4" />
            Signatures
          </a>
          <a
            href="/contrats"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: currentPath === '/contrats' ? '#1A2733' : 'transparent',
              color: currentPath === '/contrats' ? '#F5F0E8' : 'rgba(245,240,232,0.4)',
            }}
          >
            <FileText className="w-4 h-4" />
            Contrats
          </a>
        </nav>

        {/* Droite */}
        <div className="flex items-center gap-4">
          <span
            className="text-sm hidden sm:block truncate max-w-[160px]"
            style={{ color: 'rgba(245,240,232,0.4)' }}
          >
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm transition-colors hover:opacity-100"
            style={{ color: '#C9A84C', opacity: 0.7 }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 pb-6 z-10"
        style={{
          background: '#1A2733',
          borderTop: '0.5px solid rgba(201,168,76,0.15)',
        }}
      >
        <a
          href="/dashboard"
          className="flex flex-col items-center gap-1"
        >
          <PenLine
            className="w-5 h-5"
            style={{ color: currentPath === '/dashboard' ? '#AAFF00' : 'rgba(245,240,232,0.35)' }}
          />
          <span
            className="text-xs"
            style={{ color: currentPath === '/dashboard' ? '#AAFF00' : 'rgba(245,240,232,0.35)' }}
          >
            Signatures
          </span>
        </a>
          <a
        
          href="/nouvelle-signature"
          className="flex flex-col items-center gap-1 -mt-6"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#AAFF00' }}
          >
            <span style={{ fontSize: '24px', color: '#0F1923' }}>✍️</span>
          </div>
        </a>

        <a
          href="/contrats"
          className="flex flex-col items-center gap-1"
        >
          <FileText
            className="w-5 h-5"
            style={{ color: currentPath === '/contrats' ? '#AAFF00' : 'rgba(245,240,232,0.35)' }}
          />
          <span
            className="text-xs"
            style={{ color: currentPath === '/contrats' ? '#AAFF00' : 'rgba(245,240,232,0.35)' }}
          >
            Contrats
          </span>
        </a>
      </nav>

      {/* Padding pour le bottom nav sur mobile */}
      <div className="sm:hidden h-24" />

    </div>
  )
}