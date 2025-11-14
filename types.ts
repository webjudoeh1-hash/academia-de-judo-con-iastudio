
import { User } from '@supabase/supabase-js';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  file_path: string;
  file_type: 'document' | 'image';
  group_id?: string | null;
  uploader_id?: string;
  uploader_email?: string;
  created_at: string;
  groups?: Group; // For joins
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  surnames?: string;
  phone?: string;
  age?: number;
  address?: string;
  tutor_name?: string;
  belt?: string;
  group_id?: string | null;
  role: UserRole;
  created_at: string;
  groups?: Group;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<any>;
}