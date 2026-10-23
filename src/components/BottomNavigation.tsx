import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

const navigationItems = [
  { to: '/exercises', label: 'Exercises', icon: 'exercises' },
  { to: '/templates', label: 'Routines', icon: 'routines' },
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/history', label: 'Streak', icon: 'streak' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
] as const

function NavigationIcon({ name }: { name: typeof navigationItems[number]['icon'] }) {
  const common = { className: 'nav-svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'exercises') return <svg {...common}><path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" /></svg>
  if (name === 'routines') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>
  if (name === 'streak') return <svg {...common}><path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z" /></svg>
  if (name === 'profile') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg>
  return <svg {...common}><path d="M13 3 5 14h6l-1 7 8-11h-6z" fill="currentColor" stroke="none" /></svg>
}

export function BottomNavigation({ inert = false }: { inert?: boolean }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const isNavigationItemActive = (to: string) => to === '/templates'
    ? pathname === '/templates' || pathname.startsWith('/templates/') || pathname === '/resources' || pathname.startsWith('/resources/')
    : pathname === to || pathname.startsWith(`${to}/`)
  return (
    <nav className="bottom-navigation" aria-label={t('Main navigation')} inert={inert || undefined} aria-hidden={inert || undefined}>
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} aria-current={isNavigationItemActive(to) ? 'page' : undefined} className={() => `nav-item nav-item-${icon}${isNavigationItemActive(to) ? ' active' : ''}`}>
          <span className="nav-icon"><NavigationIcon name={icon} /></span>
          <span>{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
