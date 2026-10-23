import type { ReactNode } from 'react'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function CheckOption({ checked, onChange, children, className = '', disabled = false }: Props) {
  return <label className={`check-option${className ? ` ${className}` : ''}${checked ? ' is-selected' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />{children}</label>
}
