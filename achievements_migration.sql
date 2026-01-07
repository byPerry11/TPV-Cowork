-- ============================================
-- Profile & Achievements System Migration
-- ============================================

-- 1. UPDATE PROFILES TABLE
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. CREATE ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name from lucide-react
    tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    requirement_type TEXT, -- e.g., 'projects_created', 'projects_completed', 'collaborations'
    requirement_value INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. CREATE USER_ACHIEVEMENTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, achievement_id)
);

-- 4. ENABLE RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 5. CREATE POLICIES
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements FOR SELECT USING (true);

CREATE POLICY "User achievements viewable by everyone" 
ON public.user_achievements FOR SELECT USING (true);

CREATE POLICY "Users can earn achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. CREATE STORAGE BUCKET FOR AVATARS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 7. STORAGE POLICIES FOR AVATARS
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 8. SEED BASIC ACHIEVEMENTS
INSERT INTO public.achievements (name, description, icon, tier, requirement_type, requirement_value) VALUES
('Primer Proyecto', 'Crea tu primer proyecto', 'Rocket', 'bronze', 'projects_created', 1),
('Colaborador', 'Colabora en un proyecto', 'Users', 'bronze', 'collaborations', 1),
('Primer Éxito', 'Completa tu primer proyecto', 'Trophy', 'silver', 'projects_completed', 1),
('Productivo', 'Crea 5 proyectos', 'Target', 'silver', 'projects_created', 5),
('Verificador', 'Completa 10 checkpoints', 'CheckCircle', 'silver', 'checkpoints_completed', 10),
('Equipo Fuerte', 'Colabora en 5 proyectos diferentes', 'UsersRound', 'gold', 'collaborations', 5),
('Experto', 'Completa 10 proyectos', 'Award', 'gold', 'projects_completed', 10),
('Master', 'Completa 25 proyectos', 'Crown', 'platinum', 'projects_completed', 25)
ON CONFLICT DO NOTHING;
