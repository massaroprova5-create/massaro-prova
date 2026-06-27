import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar o e-mail.' })
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-cyan-100 dark:bg-cyan-900/30 p-4 rounded-full">
              <Mail className="h-12 w-12 text-cyan-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">E-mail enviado!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-xl">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            TrendHub
          </span>
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Esqueceu a senha?</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

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

          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              'Enviar link de recuperação'
            )}
          </Button>
        </form>

        <Link to="/login" className="flex items-center gap-2 justify-center mt-6 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </div>
    </div>
  )
}
