-- FRIEND REQUESTS SYSTEM

-- Enum for status
DO $$ BEGIN
    CREATE TYPE public.friend_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status friend_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_friendship UNIQUE(sender_id, receiver_id)
);

-- RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. View: Sender or Receiver can see the request
CREATE POLICY "Users can view own requests" ON public.friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 2. Insert: Only authenticated users can send, and sender_id must be themselves
CREATE POLICY "Users can send requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 3. Update: Receiver can update status (accept/reject)
CREATE POLICY "Receiver can update status" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = receiver_id);

-- 4. Delete: Sender can cancel, Receiver can delete? Let's allow both for cleanup
CREATE POLICY "Users can delete own requests" ON public.friend_requests
    FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
