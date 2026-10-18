import type { ReactNode } from 'react'

export function CheckOption({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; className?: string }) {
  return <label className={`check-option ${className}`.trim()}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> <span>{children}</span></label>
}
