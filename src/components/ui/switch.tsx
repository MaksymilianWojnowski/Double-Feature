'use client'

/** iOS switch. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-white/20 transition-colors aria-checked:bg-switch disabled:opacity-40"
    >
      <span
        aria-hidden
        className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.25)] transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
