import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha e-mail e senha.' })
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao entrar', description: 'E-mail ou senha incorretos.' })
    } else {
      navigate('/feed')
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 200 + 50}px`,
                height: `${Math.random() * 200 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
        <div className="relative text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Zap className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-black mb-4">TrendHub</h1>
          <p className="text-xl text-white/80 max-w-sm mx-auto">
            Conecte-se com trends, desafios e comunidades criativas
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Trends', emoji: '🔥' },
              { label: 'Desafios', emoji: '🏆' },
              { label: 'Comunidades', emoji: '🌐' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-sm font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              TrendHub
            </span>
          </div>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Bem-vindo de volta!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Entre na sua conta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-500 dark:text-slate-400">
            Não tem conta?{' '}
            <Link to="/register" className="text-cyan-500 hover:text-cyan-600 font-semibold">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
