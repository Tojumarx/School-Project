import { createClient } from '@supabase/supabase-js';

// Driven by local dev environment defaults or optional VITE_ overrides
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjE4ODgyODAwLCJleHAiOjE5MzQ0NTg4MDB9.sample-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
