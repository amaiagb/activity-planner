import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/today', label: 'Today', icon: '◷' },
  { to: '/week', label: 'Week', icon: '▦' },
  { to: '/history', label: 'History', icon: '↗' },
  { to: '/profile', label: 'Profile', icon: '○' },
]

export function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      {navigationItems.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
