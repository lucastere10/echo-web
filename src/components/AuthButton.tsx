import { useServerFn } from '@tanstack/react-start'
import { LogOut } from 'lucide-react'
import { signOut } from '#/server/auth'
import { getSessionLabel } from '#/lib/auth/session'
import type { SessionData } from '#/lib/auth/session'

type AuthButtonProps = {
  session: SessionData
}

export default function AuthButton({ session }: AuthButtonProps) {
  const signOutFn = useServerFn(signOut)
  const label = getSessionLabel(session)

  async function handleSignOut() {
    await signOutFn()
    window.location.href = '/'
  }

  return (
    <div className="flex items-center gap-2">
      {label ? (
        <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
          {label}
        </span>
      ) : null}
      <span
        role="button"
        tabIndex={0}
        className="echo-button-icon"
        aria-label="Sair"
        title="Sair"
        onClick={() => void handleSignOut()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void handleSignOut()
          }
        }}
      >
        <LogOut size={16} strokeWidth={1.75} />
      </span>
    </div>
  )
}
