import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, PostWithDetails } from '@/lib/supabase'
import PostCard from '@/components/posts/PostCard'
import CreatePostCard from '@/components/posts/CreatePostCard'
import { Button } from '@/components/ui/button'
import { RefreshCw, Flame, Users, Sparkles } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<PostWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'following' | 'discover' | 'trending'>('discover')
  const [newPostsCount, setNewPostsCount] = useState(0)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('posts_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (tab === 'following' && user) {
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id)
      const followingIds = followingData?.map((f) => f.following_id) || []
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds)
      } else {
        setPosts([])
        setLoading(false)
        return
      }
    }

    const { data } = await query
    if (data) {
      // Check if user liked
      if (user) {
        const { data: likes } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
        const likedIds = new Set(likes?.map((l) => l.post_id) || [])
        setPosts(data.map((p) => ({ ...p, user_has_liked: likedIds.has(p.id) })) as PostWithDetails[])
      } else {
        setPosts(data as PostWithDetails[])
      }
    }
    setLoading(false)
    setNewPostsCount(0)
  }, [tab, user])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    let channel: RealtimeChannel
    if (tab === 'discover') {
      channel = supabase
        .channel('feed-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
          setNewPostsCount((c) => c + 1)
        })
        .subscribe()
    }
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [tab])

  const handleDeletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdatePost = (updatedPost: PostWithDetails) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
  }

  const tabs = [
    { id: 'discover', label: 'Descobrir', icon: Sparkles },
    { id: 'following', label: 'Seguindo', icon: Users },
    { id: 'trending', label: 'Em alta', icon: Flame },
  ] as const

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Feed</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* New posts notification */}
      {newPostsCount > 0 && (
        <button
          onClick={fetchPosts}
          className="w-full mb-4 bg-cyan-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-cyan-600 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {newPostsCount} novo{newPostsCount > 1 ? 's' : ''} post{newPostsCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Create post */}
      {user && (
        <div className="mb-4">
          <CreatePostCard onPost={fetchPosts} />
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-slate-400 mb-4">
            {tab === 'following' ? <Users className="mx-auto h-12 w-12" /> : tab === 'trending' ? <Flame className="mx-auto h-12 w-12" /> : <Sparkles className="mx-auto h-12 w-12" />}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {tab === 'following' ? 'Nenhum post de quem você segue' : 'Nenhum post ainda'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
            {tab === 'following'
              ? 'Siga pessoas para ver o conteúdo delas aqui.'
              : 'Seja o primeiro a publicar algo!'}
          </p>
          {tab === 'following' && (
            <Button variant="gradient" onClick={() => setTab('discover')}>
              Descobrir pessoas
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} onUpdate={handleUpdatePost} />
          ))}
        </div>
      )}
    </div>
  )
}
