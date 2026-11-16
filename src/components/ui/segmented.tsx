'use client'

/** iOS segmented control on glass. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="glass flex rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="h-8 flex-1 rounded-full px-3 text-small font-semibold text-muted transition-colors aria-checked:bg-white/20 aria-checked:text-ink"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
