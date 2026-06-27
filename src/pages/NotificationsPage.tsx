import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Profile } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDate, getAvatarFallback } from '@/lib/utils'
import { Bell, Heart, MessageCircle, UserPlus, Check } from 'lucide-react'

interface NotificationWithActor {
  id: string
  user_id: string
  actor_id: string | null
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message'
  post_id: string | null
  community_id: string | null
  read: boolean
  created_at: string
  actor: Profile | null
}

const notifIcons: Record<string, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: 'text-red-500' },
  comment: { icon: MessageCircle, color: 'text-blue-500' },
  follow: { icon: UserPlus, color: 'text-cyan-500' },
  mention: { icon: MessageCircle, color: 'text-violet-500' },
  message: { icon: MessageCircle, color: 'text-green-500' },
}

const notifMessages: Record<string, string> = {
  like: 'curtiu seu post',
  comment: 'comentou no seu post',
  follow: 'começou a te seguir',
  mention: 'te mencionou',
  message: 'te enviou uma mensagem',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Realtime
      const channel = supabase
        .channel('notifs')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => fetchNotifications())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(id, username, full_name, avatar_url, verified)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data as NotificationWithActor[])
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Notificações</h1>
          {unreadCount > 0 && (
            <span className="bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-slate-500">
            <Check className="h-4 w-4" />
            Marcar tudo como lido
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-16 w-16 mx-auto mb-4 text-slate-200 dark:text-slate-700" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Sem notificações</h3>
          <p className="text-sm text-slate-500">Quando alguém interagir com você, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const iconConfig = notifIcons[notif.type] || notifIcons.like
            const Icon = iconConfig.icon
            return (
              <div
                key={notif.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  !notif.read
                    ? 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={notif.actor?.avatar_url || ''} />
                    <AvatarFallback>{getAvatarFallback(notif.actor?.full_name || notif.actor?.username)}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-900 ${iconConfig.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold">{notif.actor?.full_name || notif.actor?.username || 'Alguém'}</span>
                    {' '}{notifMessages[notif.type] || 'interagiu com você'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(notif.created_at)}</p>
                </div>
                {!notif.read && (
                  <div className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
