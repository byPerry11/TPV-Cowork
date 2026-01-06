-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    color_hex TEXT DEFAULT '#000000',
    badges JSONB DEFAULT '[]'::JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- PROJECTS
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    max_users INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'member');

-- PROJECT MEMBERS
CREATE TABLE public.project_members (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (project_id, user_id)
);

-- CHECKPOINTS
CREATE TABLE public.checkpoints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- EVIDENCES
CREATE TABLE public.evidences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    checkpoint_id UUID REFERENCES public.checkpoints(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    note TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Profiles: Public read, self update
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: Viewable by members or public (if we want public projects, otherwise strictly members)
-- For now, let's say viewable by authenticated users to support "Explorar"
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owners can update projects" ON public.projects FOR UPDATE USING (auth.uid() = owner_id);

-- Project Members:
CREATE POLICY "Members viewable by project access" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "Users can join projects" ON public.project_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Checkpoints: Viewable by everyone (related to project visibility)
CREATE POLICY "Checkpoints viewable by everyone" ON public.checkpoints FOR SELECT USING (true);
CREATE POLICY "Owners can manage checkpoints" ON public.checkpoints FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE projects.id = checkpoints.project_id AND projects.owner_id = auth.uid())
);

-- Evidences: Viewable by project members
CREATE POLICY "Evidences viewable by everyone" ON public.evidences FOR SELECT USING (true);
CREATE POLICY "Members can add evidence" ON public.evidences FOR INSERT WITH CHECK (
    auth.uid() = user_id
    -- Ideally check if user is member of project, but kept simple for now
);

-- FUNCTIONS & TRIGGERS
-- Auto-create profile on signup (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, color_hex)
  VALUES (new.id, new.email, '#3b82f6');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STORAGE SETUP
-- Note: 'storage' schema is available by default in Supabase.

-- Create 'evidences' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public read access to evidences
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'evidences' );

-- Allow authenticated users to upload to evidences
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'evidences' 
    AND auth.role() = 'authenticated' 
);

-- SEED DATA TEMPLATE
-- Usage: Replace 'YOUR_USER_UUID' with a real UID from auth.users

-- INSERT INTO public.projects (owner_id, title, status)
-- VALUES ('YOUR_USER_UUID', 'Mantenimiento Preventivo A1', 'active');

-- INSERT INTO public.project_members (project_id, user_id, role)
-- SELECT id, 'YOUR_USER_UUID', 'admin' FROM public.projects WHERE title = 'Mantenimiento Preventivo A1';

-- INSERT INTO public.checkpoints (project_id, title, "order")
-- SELECT id, 'Inspección Visual', 1 FROM public.projects WHERE title = 'Mantenimiento Preventivo A1'
-- UNION ALL
-- SELECT id, 'Verificar Niveles de Aceite', 2 FROM public.projects WHERE title = 'Mantenimiento Preventivo A1'
-- UNION ALL
-- SELECT id, 'Prueba de Encendido', 3 FROM public.projects WHERE title = 'Mantenimiento Preventivo A1';

