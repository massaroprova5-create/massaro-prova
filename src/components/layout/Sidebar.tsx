import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getAvatarFallback } from '@/lib/utils'
import {
  Home, Compass, MessageCircle, User, Settings, Zap,
  Sun, Moon, LogOut, Bell, Users, TrendingUp
} from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Feed', href: '/feed' },
  { icon: Compass, label: 'Explorar', href: '/explore' },
  { icon: Users, label: 'Comunidades', href: '/communities' },
  { icon: TrendingUp, label: 'Trends', href: '/trends' },
  { icon: MessageCircle, label: 'Mensagens', href: '/messages' },
  { icon: Bell, label: 'Notificações', href: '/notifications' },
  { icon: User, label: 'Perfil', href: '/profile' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      {/* Logo */}
      <Link to="/feed" className="flex items-center gap-2 px-2 mb-8">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-xl">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
          TrendHub
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-cyan-500' : ''}`} />
              {item.label}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 w-full transition-all"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>

        {/* User profile */}
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>{getAvatarFallback(profile?.full_name || profile?.username)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {profile?.full_name || profile?.username}
            </p>
            <p className="text-xs text-slate-500 truncate">@{profile?.username}</p>
          </div>
        </Link>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
