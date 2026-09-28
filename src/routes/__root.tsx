import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { ToastProvider } from '../components/Toast'
import { getAppSession } from '#/server/auth'
import type { RouterContext } from '../router'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Echo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  beforeLoad: async () => {
    const session = await getAppSession()
    return { session }
  },
  component: RootLayout,
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell mx-auto max-w-lg px-6 py-10 text-center sm:px-10">
        <p className="island-kicker mb-3">404</p>
        <h1 className="display-title mb-4 text-3xl text-[var(--text)]">
          Página não encontrada
        </h1>
        <p className="mb-8 text-[var(--text-muted)]">
          Este endereço não existe no Echo.
        </p>
        <a href="/" className="echo-button inline-flex">
          Voltar ao início
        </a>
      </section>
    </main>
  )
}
function RootLayout() {
  const { session } = Route.useRouteContext()

  return (
    <ToastProvider>
      <Header session={session} />
      <Outlet />
      <Footer />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ToastProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[var(--accent-subtle)]">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
