// =========================================================================
// SERVICIO DE GESTIÓN DE USUARIOS Y PERMISOS - GALINDO BARBER
// =========================================================================

import { supabase } from '@/lib/supabase';
import { PerfilUsuarioSistema, ModuloId, TODOS_LOS_MODULOS } from './permisos';

const LOCAL_STORAGE_USERS_KEY = 'galindo_usuarios_sistema_cache';

// Usuario administrador inicial de contingencia
const USUARIO_ADMIN_DEFAULT: PerfilUsuarioSistema = {
  id: 'admin-master-001',
  email: 'admin@galindobarber.pe',
  nombre_completo: 'Diego Galindo (Administrador General)',
  telefono: '914614424',
  rol: 'superadmin',
  permisos: TODOS_LOS_MODULOS,
  sede_asignada: 'todas',
  es_superadmin: true,
  activo: true,
  creado_en: new Date().toISOString(),
};

/**
 * Carga la lista completa de usuarios desde Supabase con fallback a caché local
 */
export async function listarUsuariosSistema(): Promise<PerfilUsuarioSistema[]> {
  try {
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      console.warn('Aviso: No se pudo leer perfiles_usuario desde Supabase, usando respaldo local:', error.message);
      return obtenerUsuariosCache();
    }

    if (data && data.length > 0) {
      const usuariosFormateados: PerfilUsuarioSistema[] = data.map((item) => ({
        id: item.id,
        auth_user_id: item.auth_user_id,
        email: item.email,
        nombre_completo: item.nombre_completo || 'Usuario del Sistema',
        telefono: item.telefono || '',
        rol: item.rol || 'personal',
        permisos: Array.isArray(item.permisos) && item.permisos.length > 0 
          ? (item.permisos as ModuloId[]) 
          : (item.es_superadmin ? TODOS_LOS_MODULOS : ['pos']),
        sede_asignada: item.sede_asignada || 'todas',
        es_superadmin: Boolean(item.es_superadmin),
        activo: item.activo !== false,
        creado_en: item.creado_en,
        actualizado_en: item.actualizado_en,
      }));

      guardarUsuariosCache(usuariosFormateados);
      return usuariosFormateados;
    }

    return obtenerUsuariosCache();
  } catch (err) {
    console.warn('Excepción al listar usuarios:', err);
    return obtenerUsuariosCache();
  }
}

/**
 * Obtiene el perfil y permisos de un usuario por su email
 */
export async function obtenerPerfilPorEmail(email: string): Promise<PerfilUsuarioSistema | null> {
  const emailNorm = email.toLowerCase().trim();
  try {
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('email', emailNorm)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        auth_user_id: data.auth_user_id,
        email: data.email,
        nombre_completo: data.nombre_completo,
        telefono: data.telefono,
        rol: data.rol,
        permisos: Array.isArray(data.permisos) && data.permisos.length > 0
          ? (data.permisos as ModuloId[])
          : (data.es_superadmin ? TODOS_LOS_MODULOS : ['pos']),
        sede_asignada: data.sede_asignada || 'todas',
        es_superadmin: Boolean(data.es_superadmin),
        activo: data.activo !== false,
      };
    }
  } catch (err) {
    console.warn('Excepción buscando perfil por email:', err);
  }

  const usuariosLocal = obtenerUsuariosCache();
  const encontrado = usuariosLocal.find((u) => u.email.toLowerCase().trim() === emailNorm);
  return encontrado || null;
}

/**
 * Guarda o actualiza un usuario (cambio de permisos, sede, contraseña, estado activo/inactivo)
 */
export async function actualizarPerfilUsuario(
  id: string,
  cambios: Partial<PerfilUsuarioSistema> & { email?: string; password?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Si se especificó una nueva contraseña, actualizarla a través del RPC en auth.users
    if (cambios.password && cambios.email) {
      try {
        await supabase.rpc('crear_o_actualizar_usuario_auth', {
          p_email: cambios.email.toLowerCase().trim(),
          p_password: cambios.password,
          p_nombre: cambios.nombre_completo || '',
          p_telefono: cambios.telefono || '',
          p_sede: cambios.sede_asignada || 'todas',
          p_permisos: cambios.permisos || ['pos'],
          p_es_superadmin: Boolean(cambios.es_superadmin),
        });
      } catch (errRpc) {
        console.warn('Aviso: RPC no ejecutado para actualización de password:', errRpc);
      }
    }

    const payload: Record<string, unknown> = {
      actualizado_en: new Date().toISOString(),
    };

    if (cambios.nombre_completo !== undefined) payload.nombre_completo = cambios.nombre_completo;
    if (cambios.telefono !== undefined) payload.telefono = cambios.telefono;
    if (cambios.permisos !== undefined) payload.permisos = cambios.permisos;
    if (cambios.sede_asignada !== undefined) payload.sede_asignada = cambios.sede_asignada;
    if (cambios.activo !== undefined) payload.activo = cambios.activo;
    if (cambios.rol !== undefined) payload.rol = cambios.rol;

    const { error } = await supabase
      .from('perfiles_usuario')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.warn('Error al actualizar en Supabase:', error.message);
    }

    const usuarios = obtenerUsuariosCache();
    const actualizados = usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u));
    guardarUsuariosCache(actualizados);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar usuario';
    return { success: false, error: msg };
  }
}

/**
 * Crea un nuevo usuario y su perfil con permisos modulares.
 * Utiliza el RPC crear_o_actualizar_usuario_auth para habilitar el login en auth.users inmediatamente
 * sin depender de confirmación de correo ni SMTP.
 */
export async function crearNuevoUsuario(datos: {
  email: string;
  password?: string;
  nombre_completo: string;
  telefono?: string;
  permisos: ModuloId[];
  sede_asignada: 'ica' | 'huancayo' | 'todas';
  es_superadmin?: boolean;
}): Promise<{ success: boolean; error?: string; usuario?: PerfilUsuarioSistema }> {
  const emailNorm = datos.email.toLowerCase().trim();
  const password = datos.password || 'Galindo2026*';

  try {
    let authUserId: string | undefined = undefined;
    let rpcExitoso = false;

    // 1. Invocar RPC directo en PostgreSQL (crea usuario en auth.users con contraseña bcrypt y email confirmado)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('crear_o_actualizar_usuario_auth', {
        p_email: emailNorm,
        p_password: password,
        p_nombre: datos.nombre_completo,
        p_telefono: datos.telefono || '',
        p_sede: datos.sede_asignada,
        p_permisos: datos.permisos,
        p_es_superadmin: Boolean(datos.es_superadmin),
      });

      if (!rpcError && rpcData?.success) {
        authUserId = rpcData.user_id;
        rpcExitoso = true;
      } else if (rpcError) {
        console.warn('RPC crear_o_actualizar_usuario_auth no disponible aún:', rpcError.message);
      }
    } catch (e) {
      console.warn('Excepción ejecutando RPC crear_o_actualizar_usuario_auth:', e);
    }

    // 2. Si el RPC se ejecutó exitosamente, consultar el perfil sincronizado
    if (rpcExitoso) {
      const { data: perfilCreado } = await supabase
        .from('perfiles_usuario')
        .select('*')
        .eq('email', emailNorm)
        .maybeSingle();

      const usuarioFinal: PerfilUsuarioSistema = perfilCreado
        ? {
            id: perfilCreado.id,
            auth_user_id: perfilCreado.auth_user_id,
            email: perfilCreado.email,
            nombre_completo: perfilCreado.nombre_completo,
            telefono: perfilCreado.telefono,
            rol: perfilCreado.rol,
            permisos: perfilCreado.permisos as ModuloId[],
            sede_asignada: perfilCreado.sede_asignada,
            es_superadmin: perfilCreado.es_superadmin,
            activo: perfilCreado.activo,
            creado_en: perfilCreado.creado_en,
          }
        : {
            id: authUserId || crypto.randomUUID(),
            auth_user_id: authUserId,
            email: emailNorm,
            nombre_completo: datos.nombre_completo,
            telefono: datos.telefono || '',
            rol: datos.es_superadmin ? 'superadmin' : 'cajero',
            permisos: datos.permisos,
            sede_asignada: datos.sede_asignada,
            es_superadmin: Boolean(datos.es_superadmin),
            activo: true,
          };

      const usuarios = obtenerUsuariosCache();
      const filtrados = usuarios.filter((u) => u.email.toLowerCase() !== emailNorm);
      guardarUsuariosCache([usuarioFinal, ...filtrados]);

      return { success: true, usuario: usuarioFinal };
    }

    // 3. Respaldo: Guardar directamente en perfiles_usuario
    const nuevoPerfil: Partial<PerfilUsuarioSistema> = {
      email: emailNorm,
      nombre_completo: datos.nombre_completo,
      telefono: datos.telefono || '',
      rol: datos.es_superadmin ? 'superadmin' : 'cajero',
      permisos: datos.permisos,
      sede_asignada: datos.sede_asignada,
      es_superadmin: Boolean(datos.es_superadmin),
      activo: true,
      auth_user_id: authUserId,
    };

    const { data, error } = await supabase
      .from('perfiles_usuario')
      .upsert([nuevoPerfil], { onConflict: 'email' })
      .select()
      .single();

    if (error || !data) {
      console.error('Error al insertar usuario en perfiles_usuario:', error);
      let errorLegible = error?.message || 'Error al guardar usuario en la base de datos.';
      if (error?.code === '23505') {
        errorLegible = 'Ya existe un usuario registrado con este correo electrónico.';
      }
      return { success: false, error: errorLegible };
    }

    const usuarioCreado: PerfilUsuarioSistema = {
      id: data.id,
      auth_user_id: data.auth_user_id,
      email: data.email,
      nombre_completo: data.nombre_completo,
      telefono: data.telefono,
      rol: data.rol,
      permisos: data.permisos as ModuloId[],
      sede_asignada: data.sede_asignada,
      es_superadmin: data.es_superadmin,
      activo: data.activo,
      creado_en: data.creado_en,
    };

    const usuarios = obtenerUsuariosCache();
    const filtrados = usuarios.filter((u) => u.email.toLowerCase() !== emailNorm);
    guardarUsuariosCache([usuarioCreado, ...filtrados]);

    return { success: true, usuario: usuarioCreado };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado al crear usuario';
    return { success: false, error: msg };
  }
}

/**
 * Elimina un usuario del sistema (tanto de auth.users como de perfiles_usuario)
 */
export async function eliminarUsuarioSistema(id: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const emailNorm = email.toLowerCase().trim();

    // 1. Invocar RPC para eliminar de auth.users y perfiles_usuario de forma segura
    try {
      await supabase.rpc('eliminar_usuario_auth', { p_email: emailNorm });
    } catch (e) {
      console.warn('Aviso RPC eliminar_usuario_auth:', e);
    }

    // 2. Eliminar de perfiles_usuario
    await supabase.from('perfiles_usuario').delete().eq('id', id);

    // 3. Actualizar caché
    const usuarios = obtenerUsuariosCache();
    guardarUsuariosCache(usuarios.filter((u) => u.id !== id && u.email.toLowerCase() !== emailNorm));

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar usuario';
    return { success: false, error: msg };
  }
}

// ----------------- Helpers de almacenamiento en caché -----------------
function obtenerUsuariosCache(): PerfilUsuarioSistema[] {
  if (typeof window === 'undefined') return [USUARIO_ADMIN_DEFAULT];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [USUARIO_ADMIN_DEFAULT];
}

function guardarUsuariosCache(usuarios: PerfilUsuarioSistema[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(usuarios));
  } catch {}
}
