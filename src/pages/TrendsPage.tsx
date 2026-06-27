import { useState, useEffect } from 'react'
import { supabase, PostWithDetails } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import PostCard from '@/components/posts/PostCard'
import { TrendingUp, Flame, Hash, Clock } from 'lucide-react'

export default function TrendsPage() {
  const { user } = useAuth()
  const [trendingPosts, setTrendingPosts] = useState<PostWithDetails[]>([])
  const [hashtags, setHashtags] = useState<{ tag: string; count: number }[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending()
  }, [])

  const fetchTrending = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts_with_details')
      .select('*')
      .order('likes_count', { ascending: false })
      .limit(20)

    if (data) {
      if (user) {
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        const likedIds = new Set(likes?.map(l => l.post_id) || [])
        setTrendingPosts(data.map(p => ({ ...p, user_has_liked: likedIds.has(p.id) })) as PostWithDetails[])
      } else {
        setTrendingPosts(data as PostWithDetails[])
      }
    }

    // Fetch hashtags
    const { data: postsWithTags } = await supabase.from('posts').select('hashtags').not('hashtags', 'is', null)
    if (postsWithTags) {
      const tagCount: Record<string, number> = {}
      postsWithTags.forEach(p => {
        p.hashtags?.forEach((tag: string) => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      })
      setHashtags(Object.entries(tagCount).sort(([, a], [, b]) => b - a).slice(0, 15).map(([tag, count]) => ({ tag, count })))
    }

    setLoading(false)
  }

  const fetchByTag = async (tag: string) => {
    setSelectedTag(tag)
    const { data } = await supabase
      .from('posts_with_details')
      .select('*')
      .contains('hashtags', [tag])
      .order('created_at', { ascending: false })
    if (data) setTrendingPosts(data as PostWithDetails[])
  }

  const handleUpdatePost = (updatedPost: PostWithDetails) => {
    setTrendingPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-cyan-500" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Trends</h1>
      </div>

      {/* Hashtag pills */}
      {hashtags.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trending agora</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTag(null); fetchTrending() }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                !selectedTag
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> Todos
              </span>
            </button>
            {hashtags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => fetchByTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  selectedTag === tag
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="h-3 w-3" />
                {tag.replace('#', '')}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedTag === tag ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="flex items-center gap-2 mb-4">
        {selectedTag ? (
          <>
            <Hash className="h-4 w-4 text-cyan-500" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Posts com {selectedTag}</h2>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Posts mais curtidos</h2>
          </>
        )}
      </div>

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
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : trendingPosts.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500">Nenhuma trend ainda</p>
          <p className="text-sm text-slate-400 mt-1">Seja o primeiro a usar hashtags nos posts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trendingPosts.map((post, index) => (
            <div key={post.id} className="relative">
              {!selectedTag && index < 3 && (
                <div className={`absolute -left-2 -top-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${
                  index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                }`}>
                  {index + 1}
                </div>
              )}
              <PostCard post={post} onUpdate={handleUpdatePost} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
