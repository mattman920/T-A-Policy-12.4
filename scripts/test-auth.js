const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://wcndkhrkqwocpflcuygr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmRraHJrcXdvY3BmbGN1eWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjg5MTYsImV4cCI6MjA3OTc0NDkxNn0.Hikq3ZiuxLye0KZjICa9_RCylo2EMl028RNwy_bpZ_o";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    const email = `test_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`Attempting to sign up user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error("Sign up error:", error.message);
        if (error.message.includes("Signups not allowed")) {
            console.log("Signups are disabled. Please create a user manually in Supabase dashboard.");
        }
    } else {
        console.log("Sign up successful:", data);
        console.log("User ID:", data.user?.id);

        // Try to sign in
        console.log("Attempting to sign in...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            console.error("Sign in error:", signInError.message);
        } else {
            console.log("Sign in successful!");
            console.log("Session:", signInData.session ? "Active" : "None");
        }
    }
}

testAuth();
