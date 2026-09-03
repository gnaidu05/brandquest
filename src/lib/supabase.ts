import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://veakvqiatmgmwdifijnh.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_o_JBThTr06PCDxKIRgc0JQ_ieGDxEKo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
