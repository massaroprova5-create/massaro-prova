import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostWithDetails } from '@/lib/supabase'
import { formatDate, getAvatarFallback, getYouTubeEmbedUrl, getVimeoEmbedUrl, isImageUrl, isVideoUrl } from '@/lib/utils'
import {
  Heart, MessageCircle, Share2, MoreHorizontal,
  Trash2, Edit, BadgeCheck, Hash
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import CommentsSection from './CommentsSection'

interface PostCardProps {
  post: PostWithDetails
  onDelete?: (id: string) => void
  onUpdate?: (post: PostWithDetails) => void
}

export default function PostCard({ post, onDelete, onUpdate }: PostCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentPost, setCurrentPost] = useState(post)
  const [liked, setLiked] = useState(post.user_has_liked || false)
  const [likesCount, setLikesCount] = useState(Number(post.likes_count) || 0)
  const [showComments, setShowComments] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content || '')
  const [editImageUrl, setEditImageUrl] = useState(post.image_url || '')
  const [editVideoUrl, setEditVideoUrl] = useState(post.video_url || '')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    setCurrentPost(post)
    setLiked(post.user_has_liked || false)
    setLikesCount(Number(post.likes_count) || 0)
  }, [post])

  useEffect(() => {
    if (isEditing) {
      setEditContent(currentPost.content || '')
      setEditImageUrl(currentPost.image_url || '')
      setEditVideoUrl(currentPost.video_url || '')
    }
  }, [isEditing, currentPost])

  const isOwner = user?.id === post.user_id
  const currentVideoUrl = currentPost.video_url?.trim() || ''
  const youTubeEmbed = currentVideoUrl ? getYouTubeEmbedUrl(currentVideoUrl) : null
  const vimeoEmbed = currentVideoUrl ? getVimeoEmbedUrl(currentVideoUrl) : null
  const directVideoUrl = currentVideoUrl && isVideoUrl(currentVideoUrl) ? currentVideoUrl : ''

  const handleLike = async () => {
    if (!user || loadingLike) return
    setLoadingLike(true)

    if (liked) {
      const { error } = await supabase.from('likes').delete().match({ user_id: user.id, post_id: post.id })
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao remover curtida', description: error.message })
      } else {
        setLiked(false)
        setLikesCount((c) => Math.max(0, c - 1))
      }
    } else {
      const { error } = await supabase.from('likes').insert({ user_id: user.id, post_id: post.id })
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao curtir', description: error.message })
      } else {
        setLiked(true)
        setLikesCount((c) => c + 1)
      }
    }

    setLoadingLike(false)
  }

  const handleDelete = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro ao deletar post', description: 'Usuário não autenticado.' })
      return
    }

    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao deletar post', description: error.message })
    } else {
      toast({ variant: 'default', title: 'Post deletado' })
      onDelete?.(post.id)
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    toast({ title: 'Link copiado!', description: 'Link do post copiado para a área de transferência.' })
  }

  const handleUpdate = async () => {
    if (editImageUrl && !isImageUrl(editImageUrl)) {
      toast({ variant: 'destructive', title: 'URL de imagem inválida', description: 'Use uma URL de imagem válida.' })
      return
    }
    if (
      editVideoUrl &&
      !isVideoUrl(editVideoUrl) &&
      !getYouTubeEmbedUrl(editVideoUrl) &&
      !getVimeoEmbedUrl(editVideoUrl)
    ) {
      toast({ variant: 'destructive', title: 'URL de vídeo inválida', description: 'Use um link direto de vídeo ou do YouTube/Vimeo.' })
      return
    }

    if (!user) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar post', description: 'Usuário não autenticado.' })
      return
    }

    const updatedValues = {
      content: editContent.trim() || null,
      image_url: editImageUrl.trim() || null,
      video_url: editVideoUrl.trim() || null,
    }

    setSavingEdit(true)
    const { data, error } = await supabase
      .from('posts')
      .update(updatedValues)
      .eq('id', post.id)
      .eq('user_id', user.id)
      .select()
      .single()

    setSavingEdit(false)
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar post', description: error?.message || 'Não foi possível atualizar o post.' })
      return
    }

    const updatedPost = {
      ...currentPost,
      ...updatedValues,
      content: data.content,
      image_url: data.image_url,
      video_url: data.video_url,
    }

    setCurrentPost(updatedPost)
    onUpdate?.(updatedPost)
    setIsEditing(false)
    toast({ title: 'Post atualizado com sucesso!' })
  }

  return (
    <article className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentPost.avatar_url || ''} />
            <AvatarFallback>{getAvatarFallback(currentPost.full_name || currentPost.username)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-cyan-500 transition-colors">
                {currentPost.full_name || currentPost.username}
              </span>
              {currentPost.verified && <BadgeCheck className="h-4 w-4 text-cyan-500" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>@{currentPost.username}</span>
              <span>·</span>
              <span>{formatDate(currentPost.created_at)}</span>
              {currentPost.community_title && (
                <>
                  <span>·</span>
                  <Link
                    to={`/communities`}
                    className="text-cyan-500 hover:underline flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Hash className="h-3 w-3" />
                    {currentPost.community_title}
                  </Link>
                </>
              )}
            </div>
          </div>
        </Link>

        {isOwner && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2 text-slate-600 dark:text-slate-300">
                  <Edit className="h-4 w-4" />
                  Editar post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">Texto</label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">URL da imagem</label>
                  <Input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-100">URL do vídeo</label>
                  <Input
                    value={editVideoUrl}
                    onChange={(e) => setEditVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button variant="gradient" onClick={handleUpdate} disabled={savingEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Content */}
      {currentPost.content && (
        <div className="mb-3">
          <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {currentPost.content.split(/(#[\w\u00C0-\u017F]+)/g).map((part, i) =>
              part.startsWith('#') ? (
                <span key={i} className="text-cyan-500 hover:underline cursor-pointer font-medium">
                  {part}
                </span>
              ) : (
                part
              )
            )}
          </p>
        </div>
      )}

      {/* Media */}
      {currentPost.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img
            src={currentPost.image_url}
            alt="Post"
            className="w-full max-h-96 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {currentVideoUrl && (
        <div className="mb-3 rounded-xl overflow-hidden bg-black">
          {youTubeEmbed ? (
            <iframe
              title="YouTube video"
              src={youTubeEmbed}
              className="w-full h-72"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : vimeoEmbed ? (
            <iframe
              title="Vimeo video"
              src={vimeoEmbed}
              className="w-full h-72"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : directVideoUrl ? (
            <video src={directVideoUrl} controls playsInline preload="metadata" className="w-full max-h-96" />
          ) : (
            <div className="p-4 text-sm text-slate-100 bg-slate-900/80">
              Este vídeo não pode ser reproduzido neste formato. Tente um link direto de MP4/WebM ou um URL do YouTube/Vimeo.
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            liked
              ? 'text-red-500 bg-red-50 dark:bg-red-950/20'
              : 'text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-red-500' : ''}`} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{Number(currentPost.comments_count) || 0}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all duration-200"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentsSection postId={post.id} />}
    </article>
  )
}
