'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminBottomNav } from '@/components/layout/AdminBottomNav';
import { useAuth } from '@/context/AuthContext';
import { ModuloId, LISTA_MODULOS, obtenerRutaInicio } from '@/lib/permisos';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

function obtenerModuloDeRuta(pathname: string): ModuloId | null {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/pos')) return 'pos';
  if (pathname.startsWith('/admin/pedidos')) return 'pedidos';
  if (pathname.startsWith('/admin/productos')) return 'productos';
  if (pathname.startsWith('/admin/inventario')) return 'inventario';
  if (pathname.startsWith('/admin/matriculas')) return 'matriculas';
  if (pathname.startsWith('/admin/reportes')) return 'reportes';
  if (pathname.startsWith('/admin/configuracion')) return 'configuracion';
  return null;
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userMeta, isLoading, hasPermission, signOut } = useAuth();
  const isLoginPage = pathname === '/admin/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!user) {
        router.replace('/admin/login');
      } else if (!userMeta.activo) {
        // Cuenta suspendida
      } else {
        const modulo = obtenerModuloDeRuta(pathname);
        // Si entra a cualquier módulo donde no tiene permisos, redirigir de inmediato a su módulo autorizado
        if (modulo && !hasPermission(modulo)) {
          const rutaAlternativa = obtenerRutaInicio(userMeta.permisos, userMeta.es_superadmin);
          if (rutaAlternativa !== pathname) {
            router.replace(rutaAlternativa);
          }
        }
      }
    }
  }, [isLoading, user, userMeta, isLoginPage, pathname, router, hasPermission]);

  // Si estamos en la página de login, no aplicar envoltorio del panel
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Estado de carga mientras se verifica la sesión en Supabase
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-white animate-pulse">
            <img
              src="/logo.jpg"
              alt="Galindo Barber"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -inset-1 rounded-full border border-white/20 animate-ping pointer-events-none" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-300">
            Galindo Barber Academy & Supply
          </h2>
          <p className="text-xs font-mono text-zinc-500">
            Verificando credenciales del sistema...
          </p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no renderizar el contenido protegido
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs font-mono">
        Redirigiendo al inicio de sesión...
      </div>
    );
  }

  // Cuenta desactivada por el administrador
  if (!userMeta.activo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-white shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black">Acceso Suspendido</h2>
            <p className="text-xs text-zinc-400">
              Tu cuenta de usuario ha sido suspendida temporalmente por la administración del sistema. Comunícate con el administrador general para reactivar tus permisos.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Comprobar si el módulo actual está permitido
  const moduloActual = obtenerModuloDeRuta(pathname);
  const tieneAcceso = moduloActual ? hasPermission(moduloActual) : true;
  const moduloInfo = moduloActual ? LISTA_MODULOS.find((m) => m.id === moduloActual) : null;
  const rutaPermitida = obtenerRutaInicio(userMeta.permisos, userMeta.es_superadmin);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar fijo para escritorio y Drawer deslizante para móviles */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <AdminHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-full min-w-0">
          {!tieneAcceso ? (
            <div className="max-w-lg mx-auto mt-12 bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-zinc-900">
                  Módulo Restringido
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No tienes permisos asignados para acceder a{' '}
                  <span className="font-bold text-zinc-800">
                    {moduloInfo?.label || 'este módulo'}
                  </span>
                  . Tu cuenta solo tiene autorización para los módulos asignados por la administración.
                </p>
              </div>
              <button
                onClick={() => router.push(rutaPermitida)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-950 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Ir a mi módulo asignado
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Barra de Navegación Inferior Estilo App */}
      <AdminBottomNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />
    </div>
  );
}
