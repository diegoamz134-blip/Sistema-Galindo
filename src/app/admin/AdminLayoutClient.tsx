'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminBottomNav } from '@/components/layout/AdminBottomNav';
import { useAuth } from '@/context/AuthContext';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isLoginPage = pathname === '/admin/login';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isLoading, user, isLoginPage, router]);

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

  // Si no está autenticado, no renderizar el contenido protegido mientras se ejecuta el replace
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs font-mono">
        Redirigiendo al inicio de sesión...
      </div>
    );
  }

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
          {children}
        </main>
      </div>

      {/* Barra de Navegación Inferior Estilo App (Instagram / Facebook) */}
      <AdminBottomNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />
    </div>
  );
}
