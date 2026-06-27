import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Zap, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'As senhas precisam ser iguais.' })
      return
    }
    if (form.password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Mínimo de 6 caracteres.' })
      return
    }
    if (form.username.length < 3) {
      toast({ variant: 'destructive', title: 'Username inválido', description: 'Mínimo de 3 caracteres.' })
      return
    }
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.username, form.fullName)
    setLoading(false)
    if (error) {
      const msg = error.message?.includes('already') ? 'Este e-mail já está em uso.' : error.message
      toast({ variant: 'destructive', title: 'Erro ao criar conta', description: msg })
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center p-8 max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Conta criada!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Verifique seu e-mail para confirmar sua conta. Redirecionando para o login...
          </p>
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-[progress_3s_linear]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute border-2 border-white rounded-full"
              style={{
                width: `${Math.random() * 300 + 100}px`,
                height: `${Math.random() * 300 + 100}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
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
          <h1 className="text-5xl font-black mb-4">Junte-se ao</h1>
          <h1 className="text-5xl font-black mb-6">TrendHub!</h1>
          <p className="text-xl text-white/80 max-w-sm mx-auto">
            Crie sua conta e faça parte da maior rede de trends e desafios criativos
          </p>
          <div className="mt-12 space-y-3">
            {[
              '✨ Crie e participe de desafios',
              '🏘️ Entre em comunidades de nicho',
              '🔥 Descubra as últimas trends',
              '💬 Conecte-se com criadores',
            ].map((item) => (
              <div key={item} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-left text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

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

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Criar conta</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Preencha os dados para começar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" name="fullName" placeholder="Seu nome" value={form.fullName} onChange={handleChange} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" placeholder="@username" value={form.username} onChange={handleChange} className="mt-1" required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-500 dark:text-slate-400">
            Já tem conta?{' '}
            <Link to="/login" className="text-cyan-500 hover:text-cyan-600 font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
