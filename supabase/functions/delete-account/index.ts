import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders })

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return Response.json({ error: 'Authentication required.' }, { status: 401, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json({ error: 'Account deletion is not configured on the server.' }, { status: 500, headers: corsHeaders })
  }

  const token = authorization.slice('Bearer '.length)
  const authenticatedClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: authenticationError } = await authenticatedClient.auth.getUser(token)
  if (authenticationError || !user) return Response.json({ error: 'The session is invalid or expired.' }, { status: 401, headers: corsHeaders })

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deletionError) return Response.json({ error: deletionError.message }, { status: 500, headers: corsHeaders })

  return Response.json({ deleted: true }, { headers: corsHeaders })
})
