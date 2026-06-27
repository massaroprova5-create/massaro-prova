import { createClient } from '@supabase/supabase-js'

const normalizeEnvValue = (value: string | undefined) => {
  if (!value) return ''
  const trimmed = value.trim()
  return trimmed === 'undefined' || trimmed === 'null' ? '' : trimmed
}

const rawSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL)
const rawSupabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)
const supabaseUrl = rawSupabaseUrl || 'https://placeholder.supabase.co'
const supabaseAnonKey = rawSupabaseAnonKey || 'placeholder-key'

if (!rawSupabaseUrl || !rawSupabaseAnonKey) {
  console.warn('Supabase environment variables not set. Please configure .env file.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Post, 'id' | 'created_at'>>
      }
      communities: {
        Row: Community
        Insert: Omit<Community, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Community, 'id' | 'created_at'>>
      }
      community_members: {
        Row: CommunityMember
        Insert: Omit<CommunityMember, 'id' | 'joined_at'>
        Update: Partial<Omit<CommunityMember, 'id'>>
      }
      followers: {
        Row: Follower
        Insert: Omit<Follower, 'id' | 'created_at'>
        Update: never
      }
      likes: {
        Row: Like
        Insert: Omit<Like, 'id' | 'created_at'>
        Update: never
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Comment, 'id' | 'created_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
    }
  }
}

export interface Profile {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  website: string | null
  verified: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  video_url: string | null
  community_id: string | null
  hashtags: string[] | null
  created_at: string
  updated_at: string
}

export interface PostWithDetails extends Post {
  username: string
  full_name: string | null
  avatar_url: string | null
  verified: boolean
  community_title: string | null
  community_category: string | null
  likes_count: number
  comments_count: number
  user_has_liked?: boolean
}

export interface Community {
  id: string
  owner_id: string
  title: string
  description: string
  category: string
  cover_url: string | null
  rules: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CommunityWithDetails extends Community {
  member_count?: number
  is_member?: boolean
  owner?: Profile
}

export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  joined_at: string
}

export interface Follower {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Conversation {
  id: string
  participant_one: string
  participant_two: string
  created_at: string
  updated_at: string
  other_user?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message'
  post_id: string | null
  community_id: string | null
  read: boolean
  created_at: string
  actor?: Profile
}
