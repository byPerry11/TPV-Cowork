export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  username: string | null
  color_hex: string
  badges: string[]
  avatar_url: string | null
  display_name: string | null
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  title: string
  description?: string | null
  category?: string | null
  color?: string | null
  project_icon?: string | null
  tags?: string[]
  is_public?: boolean
  start_date: string
  end_date: string | null
  max_users: number
  status: 'active' | 'completed' | 'archived'
  created_at: string
}

export type Role = 'admin' | 'manager' | 'member'
export type MemberStatus = 'pending' | 'active' | 'rejected' | 'left'

export interface ProjectMember {
  project_id: string
  user_id: string
  role: Role
  status: MemberStatus
  member_color?: string
  joined_at: string
}

export interface Checkpoint {
  id: string
  project_id: string
  title: string
  is_completed: boolean
  order: number
  created_at: string
}

export interface Evidence {
  id: string
  checkpoint_id: string
  user_id: string
  note: string | null
  image_url: string | null
  created_at: string
}

// Achievement system types
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Achievement {
  id: string
  name: string
  description: string | null
  icon: string | null
  tier: AchievementTier
  requirement_type: string | null
  requirement_value: number | null
  created_at: string
}

export interface UserAchievement {
  user_id: string
  achievement_id: string
  earned_at: string
  achievements: Achievement
}

export interface AchievementWithStatus extends Achievement {
  is_earned: boolean
  earned_at: string | null
}

