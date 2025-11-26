
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wcndkhrkqwocpflcuygr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmRraHJrcXdvY3BmbGN1eWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjg5MTYsImV4cCI6MjA3OTc0NDkxNn0.Hikq3ZiuxLye0KZjICa9_RCylo2EMl028RNwy_bpZ_o";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
