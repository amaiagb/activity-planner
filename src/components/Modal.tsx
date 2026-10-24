import { useEffect, useRef, type ReactNode } from 'react'
import { AccentTile, type Accent } from './AccentTile'
import { UiIcon } from './UiIcon'

type ModalProps = {
  open?: boolean
  title?: string
  accent?: Accent
  pattern?: 'dots' | 'diag' | 'lines'
  variant?: 'dialog' | 'sheet'
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  hideHeader?: boolean
  labelledBy?: string
}

export function Modal({ open = true, title, accent = 'lime', pattern, variant = 'dialog', onClose, children, footer, className = '', hideHeader = false, labelledBy }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key !== 'Tab') return
      const root = closeRef.current?.closest('[role="dialog"]')
      if (!root) return
      const controls = [...root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; restoreRef.current?.focus() }
  }, [open, onClose])

  if (!open) return null
  return <div className={`modal-backdrop ${variant === 'sheet' ? 'modal-sheet-backdrop' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
    <section className={`modal card ${className}`} aria-labelledby={labelledBy ?? (title ? 'modal-title' : undefined)} inert={false}>
      {!hideHeader && <header className="modal-header"><div className="modal-title-wrap">{title && <AccentTile accent={accent} pattern={pattern} icon={<span />} size={40} />}<h2 id={labelledBy ?? 'modal-title'}>{title}</h2></div>{onClose && <button ref={closeRef} className="icon-button modal-close" type="button" aria-label="Close" onClick={onClose}><UiIcon name="close" /></button>}</header>}
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </section>
  </div>
}
