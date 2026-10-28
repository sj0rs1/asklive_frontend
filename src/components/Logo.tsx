export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <button className="logo" onClick={() => window.location.reload()} aria-label="AskLive home">
      <span className={dark ? 'logo-mark light' : 'logo-mark'}><span /></span>
      <span className={dark ? 'text-white' : ''}>AskLive</span>
    </button>
  )
}
