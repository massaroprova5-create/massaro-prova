import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, Users, MessageCircle, User } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Feed', href: '/feed' },
  { icon: Compass, label: 'Explorar', href: '/explore' },
  { icon: Users, label: 'Comunidades', href: '/communities' },
  { icon: MessageCircle, label: 'Mensagens', href: '/messages' },
  { icon: User, label: 'Perfil', href: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-cyan-500'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && (
                <div className="h-1 w-1 rounded-full bg-cyan-500 absolute bottom-1" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
