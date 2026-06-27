import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Profile, PostWithDetails } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PostCard from '@/components/posts/PostCard'
import { getAvatarFallback } from '@/lib/utils'
import {
  BadgeCheck, Edit, Link as LinkIcon, Calendar,
  Grid, Heart, MessageCircle, UserPlus, UserMinus
} from 'lucide-react'

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile, updateProfile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', avatar_url: '', cover_url: '', website: '' })
  const [saving, setSaving] = useState(false)

  const targetId = userId || user?.id
  const isOwnProfile = targetId === user?.id

  useEffect(() => {
    if (targetId) {
      fetchProfile(targetId)
      fetchPosts(targetId)
      fetchFollowData(targetId)
    }
  }, [targetId])

  const fetchProfile = async (id: string) => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) {
      setProfile(data as Profile)
      setEditForm({
        full_name: data.full_name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
        cover_url: data.cover_url || '',
        website: data.website || '',
      })
    }
    setLoading(false)
  }

  const fetchPosts = async (id: string) => {
    const { data } = await supabase
      .from('posts_with_details')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
    if (data) {
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        const likedIds = new Set(likes?.map((l) => l.post_id) || [])
        setPosts(data.map((p) => ({ ...p, user_has_liked: likedIds.has(p.id) })) as PostWithDetails[])
      } else {
        setPosts(data as PostWithDetails[])
      }
    }
  }

  const fetchFollowData = async (id: string) => {
    const { count: fCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id)
    const { count: fgCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', id)
    setFollowersCount(fCount || 0)
    setFollowingCount(fgCount || 0)
    if (user && id !== user.id) {
      const { data } = await supabase.from('followers').select('id').match({ follower_id: user.id, following_id: id }).single()
      setIsFollowing(!!data)
    }
  }

  const handleFollow = async () => {
    if (!user || !targetId) return
    if (isFollowing) {
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: targetId })
      setIsFollowing(false)
      setFollowersCount(c => c - 1)
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: targetId })
      setIsFollowing(true)
      setFollowersCount(c => c + 1)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    const { error } = await updateProfile({
      full_name: editForm.full_name || null,
      bio: editForm.bio || null,
      avatar_url: editForm.avatar_url || null,
      cover_url: editForm.cover_url || null,
      website: editForm.website || null,
    } as Partial<Profile>)
    setSaving(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar perfil' })
    } else {
      toast({ title: 'Perfil atualizado! ✨' })
      setEditOpen(false)
      await refreshProfile()
      if (targetId) fetchProfile(targetId)
    }
  }

  const handleMessage = () => {
    navigate('/messages')
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse">
        <div className="bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-700" />
          <div className="px-4 pb-4">
            <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-700 -mt-10 border-4 border-white dark:border-slate-950" />
            <div className="mt-3 space-y-2">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-500">Usuário não encontrado</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-4">
        {/* Cover */}
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="Capa" className="w-full h-32 object-cover" />
        ) : (
          <div className="w-full h-32 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600" />
        )}

        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-950 shadow-lg">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="text-xl">{getAvatarFallback(profile.full_name || profile.username)}</AvatarFallback>
            </Avatar>

            <div className="flex gap-2 pb-0 mt-10">
              {isOwnProfile ? (
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Edit className="h-4 w-4" />
                      Editar perfil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Editar perfil</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label>Nome completo</Label>
                        <Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Seu nome" className="mt-1" />
                      </div>
                      <div>
                        <Label>Bio</Label>
                        <Textarea value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Conte um pouco sobre você..." className="mt-1" rows={3} />
                      </div>
                      <div>
                        <Label>URL do avatar</Label>
                        <Input value={editForm.avatar_url} onChange={e => setEditForm({ ...editForm, avatar_url: e.target.value })} placeholder="https://..." className="mt-1" />
                      </div>
                      <div>
                        <Label>URL da capa</Label>
                        <Input value={editForm.cover_url} onChange={e => setEditForm({ ...editForm, cover_url: e.target.value })} placeholder="https://..." className="mt-1" />
                      </div>
                      <div>
                        <Label>Website</Label>
                        <Input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} placeholder="https://meusite.com" className="mt-1" />
                      </div>
                      <Button variant="gradient" className="w-full" onClick={handleSaveProfile} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar alterações'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? 'outline' : 'gradient'}
                    size="sm"
                    onClick={handleFollow}
                    className="gap-1.5"
                  >
                    {isFollowing ? (
                      <><UserMinus className="h-4 w-4" /> Seguindo</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Seguir</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMessage} className="gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    Mensagem
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {profile.full_name || profile.username}
              </h2>
              {profile.verified && <BadgeCheck className="h-5 w-5 text-cyan-500" />}
            </div>
            <p className="text-slate-500 text-sm mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-slate-700 dark:text-slate-300 text-sm mb-2 leading-relaxed">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-500 hover:underline">
                  <LinkIcon className="h-4 w-4" /> {profile.website.replace('https://', '')}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{posts.length}</p>
              <p className="text-xs text-slate-500">Posts</p>
            </div>
            <div className="text-center cursor-pointer hover:opacity-70">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{followersCount}</p>
              <p className="text-xs text-slate-500">Seguidores</p>
            </div>
            <div className="text-center cursor-pointer hover:opacity-70">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{followingCount}</p>
              <p className="text-xs text-slate-500">Seguindo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="posts" className="flex-1 gap-1.5">
            <Grid className="h-4 w-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="liked" className="flex-1 gap-1.5">
            <Heart className="h-4 w-4" /> Curtidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500">Nenhum post ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  onUpdate={(updatedPost) => setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked">
          <LikedPosts userId={targetId || ''} currentUserId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LikedPosts({ userId, currentUserId }: { userId: string; currentUserId?: string }) {
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', userId)
      if (!likes || likes.length === 0) { setLoading(false); return }
      const ids = likes.map(l => l.post_id)
      const { data } = await supabase.from('posts_with_details').select('*').in('id', ids)
      if (data) setPosts(data as PostWithDetails[])
      setLoading(false)
    }
    fetch()
  }, [userId])

  if (loading) return <div className="text-center py-8 text-slate-500">Carregando...</div>
  if (posts.length === 0) return (
    <div className="text-center py-12">
      <Heart className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500">Nenhum post curtido</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} onUpdate={(updatedPost) => setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))} />
      ))}
    </div>
  )
}
