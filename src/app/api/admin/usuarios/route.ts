import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.galindobarber.com';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-anon-key';

// Crear cliente con service_role si está disponible, o cliente aislado sin persistencia de sesión
const getAdminClient = () => {
  const key = serviceRoleKey || anonKey;
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, nombre_completo, telefono, permisos, sede_asignada, es_superadmin } = body;

    if (!email || !password || !nombre_completo) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre completo son obligatorios.' },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();

    // 1. Si tenemos service_role_key, creamos usuario en auth.admin directamente
    if (serviceRoleKey) {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          nombre: nombre_completo,
          telefono: telefono || '',
          permisos: permisos || ['pos'],
          sede: sede_asignada || 'todas',
          role: es_superadmin ? 'superadmin' : 'cajero',
          es_superadmin: Boolean(es_superadmin),
        },
      });

      if (authError) {
        console.warn('Error en auth.admin.createUser:', authError.message);
        // Si el usuario ya existe, continuamos para al menos registrar/actualizar el perfil
      }

      return NextResponse.json({
        success: true,
        usuario: authData?.user || null,
        message: 'Usuario registrado satisfactoriamente en Supabase Auth',
      });
    }

    // 2. Si no hay service_role, intentar signUp con cliente aislado
    const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          nombre: nombre_completo,
          telefono: telefono || '',
          permisos: permisos || ['pos'],
          sede: sede_asignada || 'todas',
          role: es_superadmin ? 'superadmin' : 'cajero',
          es_superadmin: Boolean(es_superadmin),
        },
      },
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.warn('Aviso en signUp aislado:', signUpError.message);
    }

    return NextResponse.json({
      success: true,
      usuario: signUpData?.user || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno en la creación de usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    // Si hay service_role_key podemos eliminar de auth.users si se desea
    if (serviceRoleKey) {
      const adminClient = getAdminClient();
      const { data: users } = await adminClient.auth.admin.listUsers();
      const targetUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (targetUser) {
        await adminClient.auth.admin.deleteUser(targetUser.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
