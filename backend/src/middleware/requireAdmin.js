import { supabaseAdmin } from '../lib/supabase.js';

export async function requireAdmin(req, res, next) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('id', req.userId)
    .single();
  if (!user?.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}
