import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, getAvatarFallback } from '@/lib/utils'
import { Send, Trash2 } from 'lucide-react'

interface CommentWithProfile {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export default function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()
    // Realtime subscription
    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => {
        fetchComments()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [postId])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setComments(data as CommentWithProfile[])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return
    setLoading(true)
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    })
    setLoading(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao comentar' })
    } else {
      setNewComment('')
    }
  }

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir comentário', description: error.message })
    } else {
      fetchComments()
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">Sem comentários ainda. Seja o primeiro!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={comment.profiles?.avatar_url || ''} />
              <AvatarFallback className="text-xs">
                {getAvatarFallback(comment.profiles?.full_name || comment.profiles?.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {comment.profiles?.full_name || comment.profiles?.username}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(comment.created_at)}</span>
                </div>
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário..."
            className="text-sm h-8"
          />
          <Button type="submit" size="sm" variant="default" disabled={loading || !newComment.trim()} className="h-8 w-8 p-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      )}
    </div>
  )
}
