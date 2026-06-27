import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Community } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Users, Plus, Search, Trash2, LogOut as Leave,
  Crown, Hash, TrendingUp, Gamepad2, Music, Palette, Film,
  Dumbbell, Globe, Camera, Code, BookOpen
} from 'lucide-react'
import PostCard from '@/components/posts/PostCard'
import CreatePostCard from '@/components/posts/CreatePostCard'
import { PostWithDetails } from '@/lib/supabase'

const CATEGORIES = [
  { value: 'trends', label: 'Trends', icon: TrendingUp },
  { value: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { value: 'music', label: 'Música', icon: Music },
  { value: 'art', label: 'Arte', icon: Palette },
  { value: 'film', label: 'Cinema', icon: Film },
  { value: 'fitness', label: 'Fitness', icon: Dumbbell },
  { value: 'tech', label: 'Tecnologia', icon: Code },
  { value: 'travel', label: 'Viagens', icon: Globe },
  { value: 'photography', label: 'Fotografia', icon: Camera },
  { value: 'education', label: 'Educação', icon: BookOpen },
]

interface CommunityWithMeta extends Community {
  member_count: number
  is_member: boolean
  is_owner: boolean
}

export default function CommunitiesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [communities, setCommunities] = useState<CommunityWithMeta[]>([])
  const [search, setSearch] = useState('')
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityWithMeta | null>(null)
  const [communityPosts, setCommunityPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '', description: '', category: '', cover_url: '', rules: '', status: 'active' as 'active' | 'inactive'
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchCommunities()
  }, [])

  const fetchCommunities = async () => {
    setLoading(true)
    const { data: comms } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })

    if (comms && user) {
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
      const memberCids = new Set(memberships?.map((m) => m.community_id) || [])

      const withMeta = await Promise.all(comms.map(async (c) => {
        const { count } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', c.id)
        return {
          ...c,
          member_count: count || 0,
          is_member: memberCids.has(c.id),
          is_owner: c.owner_id === user.id,
        }
      }))
      setCommunities(withMeta)
    } else if (comms) {
      setCommunities(comms.map(c => ({ ...c, member_count: 0, is_member: false, is_owner: false })))
    }
    setLoading(false)
  }

  const fetchCommunityPosts = async (communityId: string) => {
    const { data } = await supabase
      .from('posts_with_details')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
    if (data) {
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        const likedIds = new Set(likes?.map((l) => l.post_id) || [])
        setCommunityPosts(data.map((p) => ({ ...p, user_has_liked: likedIds.has(p.id) })) as PostWithDetails[])
      } else {
        setCommunityPosts(data as PostWithDetails[])
      }
    }
  }

  const handleJoin = async (community: CommunityWithMeta) => {
    if (!user) return
    if (community.is_owner) {
      toast({ title: 'Você já é proprietário desta comunidade.' })
      return
    }
    if (community.is_member) {
      await supabase.from('community_members').delete().match({ community_id: community.id, user_id: user.id })
      toast({ title: 'Você saiu da comunidade' })
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id, role: 'member' })
      toast({ title: 'Você entrou na comunidade!' })
    }
    fetchCommunities()
  }

  const handleCreate = async () => {
    if (!user || !createForm.title || !createForm.description || !createForm.category) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' })
      return
    }
    setCreating(true)
    const { error } = await supabase.from('communities').insert({
      owner_id: user.id,
      ...createForm,
      cover_url: createForm.cover_url || null,
      rules: createForm.rules || null,
    })
    setCreating(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar comunidade', description: error.message })
    } else {
      toast({ title: 'Comunidade criada! 🚀' })
      setShowCreate(false)
      setCreateForm({ title: '', description: '', category: '', cover_url: '', rules: '', status: 'active' })
      fetchCommunities()
    }
  }

  const handleDelete = async (community: CommunityWithMeta) => {
    if (!window.confirm('Tem certeza que deseja deletar esta comunidade?')) return
    const { error } = await supabase.from('communities').delete().eq('id', community.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao deletar' })
    } else {
      toast({ title: 'Comunidade deletada' })
      setSelectedCommunity(null)
      fetchCommunities()
    }
  }

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find(c => c.value === cat)
    return found ? found.icon : Hash
  }

  const filtered = communities.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  if (selectedCommunity) {
    const CatIcon = getCategoryIcon(selectedCommunity.category)
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => setSelectedCommunity(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 text-sm"
        >
          ← Voltar às comunidades
        </button>

        {/* Community header */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-4">
          {selectedCommunity.cover_url ? (
            <img src={selectedCommunity.cover_url} alt={selectedCommunity.title} className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-cyan-500 to-blue-600" />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CatIcon className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">{selectedCommunity.category}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCommunity.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedCommunity.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">{selectedCommunity.member_count} membros</span>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedCommunity.is_owner && (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedCommunity)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {user && !selectedCommunity.is_owner && (
                  <Button
                    size="sm"
                    variant={selectedCommunity.is_member ? 'outline' : 'gradient'}
                    onClick={() => handleJoin(selectedCommunity)}
                  >
                    {selectedCommunity.is_member ? (
                      <><Leave className="h-4 w-4" /> Sair</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Entrar</>
                    )}
                  </Button>
                )}
                {user && selectedCommunity.is_owner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 dark:bg-cyan-950/20 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <Crown className="h-4 w-4" /> Proprietário
                  </span>
                )}
              </div>
            </div>
            {selectedCommunity.rules && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">📋 Regras</p>
                <p className="text-xs text-amber-700 dark:text-amber-500">{selectedCommunity.rules}</p>
              </div>
            )}
          </div>
        </div>

        {/* Posts in community */}
        {selectedCommunity.is_member && user && (
          <div className="mb-4">
            <CreatePostCard communityId={selectedCommunity.id} onPost={() => fetchCommunityPosts(selectedCommunity.id)} />
          </div>
        )}
        <div className="space-y-4">
          {communityPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(id) => setCommunityPosts(prev => prev.filter(p => p.id !== id))}
              onUpdate={(updatedPost) => setCommunityPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))}
            />
          ))}
          {communityPosts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Hash className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum post ainda nesta comunidade</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Comunidades</h1>
        {user && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Criar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar comunidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Título *</Label>
                  <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Nome da comunidade" className="mt-1" />
                </div>
                <div>
                  <Label>Descrição *</Label>
                  <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Sobre o que é esta comunidade?" className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={createForm.category} onValueChange={v => setCreateForm({ ...createForm, category: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <c.icon className="h-4 w-4" /> {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL da capa</Label>
                  <Input value={createForm.cover_url} onChange={e => setCreateForm({ ...createForm, cover_url: e.target.value })} placeholder="https://..." className="mt-1" />
                </div>
                <div>
                  <Label>Regras (opcional)</Label>
                  <Textarea value={createForm.rules} onChange={e => setCreateForm({ ...createForm, rules: e.target.value })} placeholder="Regras da comunidade..." className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={createForm.status} onValueChange={v => setCreateForm({ ...createForm, status: v as 'active' | 'inactive' })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="gradient" className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Criando...' : 'Criar comunidade'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar comunidades..."
          className="pl-10"
        />
      </div>

      {/* Communities grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-24 bg-slate-200 dark:bg-slate-700" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500">Nenhuma comunidade encontrada</p>
          {user && (
            <Button variant="gradient" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Criar a primeira
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((community) => {
            const CatIcon = getCategoryIcon(community.category)
            return (
              <div
                key={community.id}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedCommunity(community)
                  fetchCommunityPosts(community.id)
                }}
              >
                {community.cover_url ? (
                  <img src={community.cover_url} alt={community.title} className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className={`w-full h-24 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center`}>
                    <CatIcon className="h-10 w-10 text-white/50" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        {community.is_owner && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{community.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{community.description}</p>
                    </div>
                    {community.status === 'inactive' && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Inativo</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      <span>{community.member_count}</span>
                      <span className="mx-1">·</span>
                      <CatIcon className="h-3.5 w-3.5" />
                      <span>{CATEGORIES.find(c => c.value === community.category)?.label || community.category}</span>
                    </div>
                    {community.is_member && (
                      <span className="text-xs bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                        Membro
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
