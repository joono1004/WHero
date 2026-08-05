"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null when the env vars aren't configured (e.g. local dev without
// .env.local) - callers must treat cloud backup/restore as unavailable
// rather than crashing, same spirit as GameEntry's `storage` being null
// during server-side render.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
