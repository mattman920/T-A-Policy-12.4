
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://wcndkhrkqwocpflcuygr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmRraHJrcXdvY3BmbGN1eWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjg5MTYsImV4cCI6MjA3OTc0NDkxNn0.Hikq3ZiuxLye0KZjICa9_RCylo2EMl028RNwy_bpZ_o";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    try {
        const { data, error } = await supabase.from('employees').select('*');
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Success! Data:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

test();
