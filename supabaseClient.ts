import { createClient } from '@supabase/supabase-js'

// Use environment variables or fallback to the provided keys for immediate testing
// process.env variables are defined in vite.config.ts
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://tblbeancnzikjlazzscl.supabase.co"
const supabaseKey = process.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibGJlYW5jbnppa2psYXp6c2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MTg5ODEsImV4cCI6MjA4MDM5NDk4MX0.oJNcYpHXtXGIMv-Rj16ynYH7zCOYTeY5afCUF162tTE"

export const supabase = createClient(supabaseUrl, supabaseKey)