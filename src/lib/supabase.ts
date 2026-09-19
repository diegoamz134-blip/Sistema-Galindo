// =========================================================================
// CLIENTE DE SUPABASE (SELF-HOSTED VPS & SUPABASE CLOUD)
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-anon-key';

// Cliente para el navegador / cliente React
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper para verificar conectividad con el VPS
export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('categorias').select('*', { count: 'exact', head: true });
    if (error) {
      return { ok: false, message: `Error de conexión: ${error.message}` };
    }
    return { ok: true, message: 'Conexión exitosa con el VPS de Supabase' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    return { ok: false, message: `No se pudo alcanzar el servidor: ${errorMsg}` };
  }
}
