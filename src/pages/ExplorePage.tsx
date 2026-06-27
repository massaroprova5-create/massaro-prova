import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, PostWithDetails } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PostCard from '@/components/posts/PostCard'
import { getAvatarFallback } from '@/lib/utils'
import { Search, BadgeCheck, TrendingUp, Users, Hash, Flame, UserPlus } from 'lucide-react'

export default function ExplorePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [trendingPosts, setTrendingPosts] = useState<PostWithDetails[]>([])
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTrending()
    if (user) fetchFollowing()
  }, [user])

  const fetchFollowing = async () => {
    if (!user) return
    const { data } = await supabase.from('followers').select('following_id').eq('follower_id', user.id)
    setFollowingMap(new Set(data?.map(f => f.following_id) || []))
  }

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('posts_with_details')
      .select('*')
      .order('likes_count', { ascending: false })
      .limit(10)
    if (data) setTrendingPosts(data as PostWithDetails[])

    // Hashtags
    const { data: postsWithTags } = await supabase
      .from('posts')
      .select('hashtags')
      .not('hashtags', 'is', null)
    if (postsWithTags) {
      const tagCount: Record<string, number> = {}
      postsWithTags.forEach(p => {
        p.hashtags?.forEach((tag: string) => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      })
      const sorted = Object.entries(tagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }))
      setTrendingHashtags(sorted)
    }
  }

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setUsers([]); setPosts([]); return }
    setLoading(true)
    const [{ data: usersData }, { data: postsData }] = await Promise.all([
      supabase.from('profiles').select('*').or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(10),
      supabase.from('posts_with_details').select('*').ilike('content', `%${q}%`).limit(10),
    ])
    if (usersData) setUsers(usersData as Profile[])
    if (postsData) {
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        const likedIds = new Set(likes?.map(l => l.post_id) || [])
        setPosts(postsData.map(p => ({ ...p, user_has_liked: likedIds.has(p.id) })) as PostWithDetails[])
      } else {
        setPosts(postsData as PostWithDetails[])
      }
    }
    setLoading(false)
  }

  const handleFollow = async (targetId: string) => {
    if (!user) return
    if (followingMap.has(targetId)) {
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: targetId })
      setFollowingMap(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: targetId })
      setFollowingMap(prev => new Set([...prev, targetId]))
    }
  }

  const handleUpdatePost = (updatedPost: PostWithDetails) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
    setTrendingPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Explorar</h1>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar usuários, posts, #hashtags..."
          className="pl-10"
        />
      </div>

      {query.length >= 2 ? (
        /* Search results */
        <Tabs defaultValue="users">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="users" className="flex-1 gap-1.5">
              <Users className="h-4 w-4" /> Usuários ({users.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 gap-1.5">
              <Hash className="h-4 w-4" /> Posts ({posts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhum usuário encontrado</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                    <button onClick={() => navigate(`/profile/${u.id}`)} className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getAvatarFallback(u.full_name || u.username)}</AvatarFallback>
                        <AvatarImage src={u.avatar_url || ''} />
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{u.full_name || u.username}</p>
                          {u.verified && <BadgeCheck className="h-4 w-4 text-cyan-500" />}
                        </div>
                        <p className="text-sm text-slate-500">@{u.username}</p>
                        {u.bio && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{u.bio}</p>}
                      </div>
                    </button>
                    {user && u.id !== user.id && (
                      <Button
                        size="sm"
                        variant={followingMap.has(u.id) ? 'outline' : 'gradient'}
                        onClick={() => handleFollow(u.id)}
                        className="gap-1 shrink-0"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {followingMap.has(u.id) ? 'Seguindo' : 'Seguir'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts">
            {posts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Nenhum post encontrado</div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
              <PostCard key={post.id} post={post} onUpdate={handleUpdatePost} />
            ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Trending */
        <div className="space-y-6">
          {/* Trending hashtags */}
          {trendingHashtags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hashtags em alta</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {trendingHashtags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag.replace('#', ''))}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-cyan-300 dark:hover:border-cyan-700 transition-all text-left group"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-cyan-500 transition-colors">{tag}</p>
                      <p className="text-xs text-slate-500">{count} post{count !== 1 ? 's' : ''}</p>
                    </div>
                    <TrendingUp className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending posts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Posts populares</h2>
            </div>
            {trendingPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum post ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPosts.map(post => (
              <PostCard key={post.id} post={post} onUpdate={handleUpdatePost} />
            ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
