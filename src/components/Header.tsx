import { Link } from '@tanstack/react-router'
import { AudioLines, Mic, Shield } from 'lucide-react'
import type { SessionData } from '#/lib/auth/session'
import AccessRequestModal from './AccessRequestModal'
import ThemeToggle from './ThemeToggle'
import AuthButton from './AuthButton'

type HeaderProps = {
  session: SessionData | null
}

export default function Header({ session }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)]">
      <nav className="page-wrap flex h-14 items-center gap-6 px-4">
        <h2 className="m-0 flex-shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--text)] no-underline"
          >
            <AudioLines size={18} className="text-[var(--accent)]" strokeWidth={1.75} />
            Echo
          </Link>
        </h2>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            <Mic size={15} strokeWidth={1.75} />
            <span className="hidden sm:inline">Transcrever</span>
          </Link>
          {session?.isAdmin ? (
            <Link
              to="/admin"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              <Shield size={15} strokeWidth={1.75} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {session ? <AuthButton session={session} /> : <AccessRequestModal />}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
