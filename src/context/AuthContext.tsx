'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';

interface AuthUserMeta {
  nombre?: string;
  role?: string;
  sede?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isVpsConnected: boolean | null;
  userMeta: AuthUserMeta;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVpsConnected, setIsVpsConnected] = useState<boolean | null>(null);

  // Verificar la conectividad con el servidor Supabase
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const res = await checkSupabaseConnection();
      setIsVpsConnected(res.ok);
      return res.ok;
    } catch {
      setIsVpsConnected(false);
      return false;
    }
  }, []);

  // Inicializar sesión y suscripción a cambios de auth
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Probar conectividad con Supabase
      checkConnection();

      // 2. Obtener sesión actual de Supabase
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error al obtener sesión de Supabase:', error.message);
        }
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (err) {
        console.warn('Excepción al conectar con Supabase Auth:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // 3. Suscribirse a cambios en tiempo real del estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [checkConnection]);

  // Iniciar sesión estrictamente con email y contraseña en Supabase
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let friendlyMessage = 'Credenciales de acceso incorrectas. Verifique su correo y contraseña.';
        const msg = (error.message || '').toLowerCase();

        if (
          msg.includes('invalid login credentials') ||
          msg.includes('email not confirmed') ||
          msg.includes('invalid_grant') ||
          msg.includes('user not found')
        ) {
          // Práctica de seguridad OWASP: Mensaje uniforme para evitar enumeración de usuarios
          friendlyMessage = 'Credenciales de acceso incorrectas. Verifique su correo y contraseña.';
        } else if (error.status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
          friendlyMessage = 'Demasiadas solicitudes. Por motivos de seguridad, espere unos momentos antes de reintentar.';
        } else if (error.status === 0 || msg.includes('failed to fetch') || msg.includes('networkerror')) {
          friendlyMessage = 'No se pudo conectar con el servidor de autenticación. Verifique su conexión a internet.';
        } else {
          // No exponer nombres de tablas, esquemas o errores internos de Supabase
          friendlyMessage = 'No fue posible iniciar sesión. Verifique sus credenciales de acceso.';
        }

        return { success: false, error: friendlyMessage };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: 'No se pudo generar la sesión de acceso.' };
    } catch {
      // Sanitizar excepción para nunca exponer trazas de error ni variables sensibles
      return {
        success: false,
        error: 'No se pudo conectar con el servidor de autenticación. Verifique su conexión.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Cierre de sesión completo
  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error al cerrar sesión en Supabase:', err);
    } finally {
      setUser(null);
      setSession(null);
      try {
        localStorage.removeItem('galindo_auth_user');
        localStorage.removeItem('galindo_demo_auth');
      } catch {}
      setIsLoading(false);
    }
  };

  // Metadatos calculados del usuario actual estrictamente desde Supabase
  const userMeta: AuthUserMeta = {
    nombre:
      user?.user_metadata?.nombre ||
      user?.user_metadata?.full_name ||
      (user?.email ? user.email.split('@')[0] : 'Administrador'),
    role: user?.user_metadata?.role || 'Administrador',
    sede: user?.user_metadata?.sede || 'Sede Central Ica (Calle Bolívar)',
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isVpsConnected,
        userMeta,
        signIn,
        signOut,
        checkConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
