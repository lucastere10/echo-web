export default function Footer() {
  return (
    <footer className="px-4 pb-10 pt-4">
      <div className="page-wrap border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-muted)]" style={{ borderRadius: 'var(--radius-lg)' }}>
        O Echo mantém o áudio apenas em memória e descarta os arquivos após a transcrição.
      </div>
    </footer>
  )
}
