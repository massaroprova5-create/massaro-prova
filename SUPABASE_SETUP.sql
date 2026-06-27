-- ============================================================
-- TRENDHUB - SUPABASE COMPLETE SETUP SQL
-- ============================================================
-- Execute this SQL in the Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. AUTH CONFIGURATION (handled by Supabase Auth automatically)
-- Email/Password login, signup and password recovery are
-- enabled by default in the Supabase dashboard.
-- Go to: Authentication > Providers > Email
-- Make sure "Enable Email Signup" is ON
-- "Confirm email" can be ON or OFF depending on your preference
-- ============================================================

-- ============================================================
-- 3. TABLES
-- ============================================================

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POSTS
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  community_id UUID,
  hashtags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNITIES
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  cover_url TEXT,
  rules TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from posts to communities
ALTER TABLE public.posts
  ADD CONSTRAINT posts_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;

-- COMMUNITY MEMBERS
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

-- FOLLOWERS
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATIONS (DMs)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (participant_one, participant_two),
  CHECK (participant_one <> participant_two)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'message')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. VIEWS (helper views)
-- ============================================================

-- Posts with author info and counts
CREATE OR REPLACE VIEW public.posts_with_details AS
SELECT
  p.*,
  pr.username,
  pr.full_name,
  pr.avatar_url,
  pr.verified,
  c.title AS community_title,
  c.category AS community_category,
  (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) AS likes_count,
  (SELECT COUNT(*) FROM public.comments cm WHERE cm.post_id = p.id) AS comments_count
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id
LEFT JOIN public.communities c ON p.community_id = c.id;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger: auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function: get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Normalize order
  IF user_a < user_b THEN
    p1 := user_a; p2 := user_b;
  ELSE
    p1 := user_b; p2 := user_a;
  END IF;

  SELECT id INTO conv_id FROM public.conversations
  WHERE participant_one = p1 AND participant_two = p2;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_one, participant_two)
    VALUES (p1, p2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$;

-- Function: unread message count
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.messages m
  JOIN public.conversations c ON m.conversation_id = c.id
  WHERE (c.participant_one = p_user_id OR c.participant_two = p_user_id)
    AND m.sender_id <> p_user_id
    AND m.read = FALSE;
  RETURN cnt;
END;
$$;

-- Function: mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id <> p_user_id
    AND read = FALSE;
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POSTS policies
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT USING (TRUE);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- COMMUNITIES policies
CREATE POLICY "Communities are viewable by everyone"
  ON public.communities FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their communities"
  ON public.communities FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their communities"
  ON public.communities FOR DELETE USING (auth.uid() = owner_id);

-- COMMUNITY MEMBERS policies
CREATE POLICY "Members are viewable by everyone"
  ON public.community_members FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can join communities"
  ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE USING (auth.uid() = user_id);

-- FOLLOWERS policies
CREATE POLICY "Followers are viewable by everyone"
  ON public.followers FOR SELECT USING (TRUE);

CREATE POLICY "Users can follow others"
  ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- LIKES policies
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT USING (TRUE);

CREATE POLICY "Users can like posts"
  ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can comment"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS policies
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- MESSAGES policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE POLICY "Users can update messages they received (mark as read)"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

-- NOTIFICATIONS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 7. REALTIME
-- ============================================================
-- Enable realtime for these tables in Supabase Dashboard:
-- Supabase Dashboard > Database > Replication > Tables
-- OR run these commands:

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase SQL Editor:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    TRUE,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'covers',
    'covers',
    TRUE,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'posts',
    'posts',
    TRUE,
    20971520, -- 20MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
  ),
  (
    'communities',
    'communities',
    TRUE,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. STORAGE BUCKET POLICIES
-- ============================================================

-- AVATARS bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- COVERS bucket
CREATE POLICY "Cover images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Users can upload their own cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'covers' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- POSTS bucket
CREATE POLICY "Post media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own post media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'posts' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own post media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- COMMUNITIES bucket
CREATE POLICY "Community images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'communities');

CREATE POLICY "Community owners can upload community images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'communities' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Community owners can update community images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'communities' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Community owners can delete community images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'communities' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- ============================================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON public.posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);

-- ============================================================
-- DONE! Your TrendHub database is ready.
-- ============================================================
-- Next steps:
-- 1. Update your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
-- 2. In Supabase Dashboard > Authentication > Email Templates,
--    customize the password recovery email template.
-- 3. In Supabase Dashboard > Authentication > URL Configuration,
--    add your site URL and redirect URLs.
-- ============================================================
