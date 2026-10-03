import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuth() {
  console.log("1. Testing Registration (Teacher)...")
  const email = `test_teacher_${Date.now()}@gmail.com`
  const password = "Password123!"

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error("❌ Registration Failed:", error.message)
    return
  }

  console.log("✅ Registration Success:", data.user?.email)

  console.log("2. Testing Profile Creation...")
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      full_name: 'Test Teacher',
      role: 'teacher',
    })
    .select()

  if (profileError) {
    console.error("❌ Profile Creation Failed (Did you run the SQL schema?):", profileError.message)
    return
  }
  
  console.log("✅ Profile Creation Success:", profileData)
  console.log("🎉 All Backend Tests Passed!")
}

testAuth()
