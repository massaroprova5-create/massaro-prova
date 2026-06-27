import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Senha muito curta', description: 'Use pelo menos 6 caracteres.' })
      return
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Senhas não conferem' })
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao redefinir senha', description: error.message })
    } else {
      toast({ title: 'Senha alterada com sucesso!' })
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-xl">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">TrendHub</span>
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Defina uma nova senha</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Crie uma senha forte para continuar acessando sua conta.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 caracteres"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </form>

        <Link to="/login" className="flex justify-center mt-6 text-sm text-cyan-500 hover:text-cyan-600">
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
