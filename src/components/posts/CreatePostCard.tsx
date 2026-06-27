import { useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { getAvatarFallback, extractHashtags as extract, getYouTubeEmbedUrl, getVimeoEmbedUrl, isImageUrl, isVideoUrl } from '@/lib/utils'
import { Image, Video, X, Send, AlertTriangle } from 'lucide-react'

interface CreatePostCardProps {
  communityId?: string
  onPost?: () => void
}

export default function CreatePostCard({ communityId, onPost }: CreatePostCardProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const imagePreviewUrl = useMemo(() => (imageUrl && isImageUrl(imageUrl) ? imageUrl : ''), [imageUrl])
  const youtubeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(videoUrl), [videoUrl])
  const vimeoEmbedUrl = useMemo(() => getVimeoEmbedUrl(videoUrl), [videoUrl])
  const directVideoUrl = useMemo(() => (videoUrl && isVideoUrl(videoUrl) ? videoUrl : ''), [videoUrl])

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Selecione uma imagem.' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImageUrl(result)
      setVideoUrl('')
      setShowMedia(true)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSubmit = async () => {
    if (!content.trim() && !imageUrl && !videoUrl) {
      toast({ variant: 'destructive', title: 'Post vazio', description: 'Adicione texto ou mídia.' })
      return
    }
    if (imageUrl && !isImageUrl(imageUrl)) {
      toast({ variant: 'destructive', title: 'URL de imagem inválida', description: 'Use uma URL que termine em .jpg, .png, .webp, .gif ou .svg.' })
      return
    }
    if (videoUrl && !isVideoUrl(videoUrl) && !youtubeEmbedUrl && !vimeoEmbedUrl) {
      toast({ variant: 'destructive', title: 'URL de vídeo inválida', description: 'Use um link direto de vídeo ou do YouTube/Vimeo.' })
      return
    }
    setLoading(true)
    const hashtags = extract(content)
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      community_id: communityId || null,
      hashtags: hashtags.length > 0 ? hashtags : null,
    })
    setLoading(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao publicar', description: error.message })
    } else {
      setContent('')
      setImageUrl('')
      setVideoUrl('')
      setShowMedia(false)
      toast({ variant: 'default', title: 'Post publicado!' })
      onPost?.()
    }
  }

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback>{getAvatarFallback(profile?.full_name || profile?.username)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que está acontecendo? #trends #desafios"
            className="border-none shadow-none resize-none p-0 text-base focus-visible:ring-0 bg-transparent dark:bg-transparent"
            rows={3}
          />

          {showMedia && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-slate-400" />
                <div className="flex flex-1 gap-2">
                  <Input
                    value={imageUrl.startsWith('data:image/') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="URL da imagem (https://...)"
                    className="h-8 text-sm"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Escolher imagem
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-400" />
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="URL do vídeo (https://...)"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {(imageUrl || videoUrl) && (
            <div className="mt-2 space-y-2">
              {imagePreviewUrl && (
                <div className="relative inline-block">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview da imagem"
                    className="max-h-48 rounded-xl object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <button onClick={() => setImageUrl('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}

              {directVideoUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video src={directVideoUrl} controls className="w-full max-h-52" />
                  <button onClick={() => setVideoUrl('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}

              {youtubeEmbedUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <iframe
                    title="Pré-visualização do YouTube"
                    src={youtubeEmbedUrl}
                    className="w-full h-52"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button onClick={() => setVideoUrl('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}

              {vimeoEmbedUrl && (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <iframe
                    title="Pré-visualização do Vimeo"
                    src={vimeoEmbedUrl}
                    className="w-full h-52"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                  <button onClick={() => setVideoUrl('')} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}

              {!imagePreviewUrl && !directVideoUrl && !youtubeEmbedUrl && !vimeoEmbedUrl && (imageUrl || videoUrl) && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  URL inválida ou não suportada ainda.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <button
                onClick={() => setShowMedia(!showMedia)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-500 transition-colors px-2 py-1 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
              >
                <Image className="h-4 w-4" />
                <span>Imagem</span>
              </button>
              <button
                onClick={() => setShowMedia(!showMedia)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-500 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20"
              >
                <Video className="h-4 w-4" />
                <span>Vídeo</span>
              </button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !imageUrl && !videoUrl)}
              size="sm"
              variant="gradient"
              className="gap-1.5"
            >
              {loading ? (
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Publicar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
