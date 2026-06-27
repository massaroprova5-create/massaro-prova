import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarFallback } from '@/lib/utils'
import {
  Sun, Moon, LogOut, Shield, Bell, Palette,
  User, Info, Heart, ExternalLink, ChevronRight
} from 'lucide-react'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Configurações</h1>

      {/* Profile preview */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="text-lg">{getAvatarFallback(profile?.full_name || profile?.username)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-bold text-slate-900 dark:text-white">{profile?.full_name || profile?.username}</p>
            <p className="text-sm text-slate-500">@{profile?.username}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
            <User className="h-4 w-4" />
            Ver perfil
          </Button>
        </div>
      </div>

      {/* Settings sections */}
      <div className="space-y-4">

        {/* Appearance */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Aparência</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Sun className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <Label className="text-slate-900 dark:text-white">Modo escuro</Label>
                  <p className="text-xs text-slate-500">Alternar entre modo claro e escuro</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Notificações</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: 'Curtidas', desc: 'Quando alguém curtir seu post', default: true },
              { label: 'Comentários', desc: 'Quando alguém comentar', default: true },
              { label: 'Novos seguidores', desc: 'Quando alguém te seguir', default: true },
              { label: 'Mensagens', desc: 'Quando receber uma mensagem', default: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4">
                <div>
                  <Label className="text-slate-900 dark:text-white text-sm">{item.label}</Label>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.default} />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Privacidade & Segurança</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: 'Perfil público', desc: 'Qualquer pessoa pode ver seu perfil', checked: true },
              { label: 'Mensagens', desc: 'Qualquer pessoa pode te enviar mensagem', checked: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4">
                <div>
                  <Label className="text-slate-900 dark:text-white text-sm">{item.label}</Label>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.checked} />
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Sobre</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { label: 'Versão', value: '1.0.0' },
              { label: 'Stack', value: 'React + Vite + Supabase' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-4">
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                <span className="text-sm text-slate-500">{item.value}</span>
              </div>
            ))}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300">Supabase Dashboard</span>
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center justify-between p-4 w-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300">Ir para o Feed</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </Button>

        <p className="text-center text-xs text-slate-400 pb-4 flex items-center justify-center gap-1">
          TrendHub © 2024 · Feito com <Heart className="h-3.5 w-3.5 text-red-500" />
        </p>
      </div>
    </div>
  )
}
