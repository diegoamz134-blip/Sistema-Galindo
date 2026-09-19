'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Boxes,
  CircleDollarSign,
  GraduationCap,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  ShieldCheck,
  X,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'Punto de Venta (POS)', icon: Store },
  { href: '/admin/productos', label: 'Productos & Tienda', icon: Package },
  { href: '/admin/inventario', label: 'Inventario (Kardex)', icon: Boxes },
  { href: '/admin/caja', label: 'Caja Chica & Arqueo', icon: CircleDollarSign },
  { href: '/admin/matriculas', label: 'Academia & Matrículas', icon: GraduationCap },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userMeta, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Cerrar drawer móvil automáticamente al cambiar de ruta
  useEffect(() => {
    onCloseMobile?.();
  }, [pathname]);

  // Despedida dinámica según la hora del día
  const getFarewell = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '¡Que tengas un buen día';
    if (hour >= 12 && hour < 19) return '¡Que tengas una buena tarde';
    return '¡Que tengas una buena noche';
  };

  const rawName =
    userMeta.nombre && userMeta.nombre !== 'Administrador'
      ? userMeta.nombre
      : 'Administrador';

  const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const initials = (userMeta.nombre || 'AD')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  const handleLogout = async () => {
    // 1. Mostrar pantalla de despedida / cierre seguro
    setIsLoggingOut(true);

    // 2. Duración exacta de 1.5 segundos
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 3. Destruir sesión y redirigir
    await signOut();
    router.push('/admin/login');
  };

  // Contenido común del Sidebar para Desktop y Mobile Drawer
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full min-h-screen">
      <div>
        {/* Brand Header con Logo Oficial Grande y Centrado */}
        <div className="relative py-6 px-4 flex flex-col items-center text-center border-b border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white">
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-black hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-900/15 bg-white shadow-md shadow-zinc-900/5 p-1 shrink-0 group transition-transform hover:scale-105 duration-200">
            <img
              src="/logo.jpg"
              alt="Galindo Barber"
              className="w-full h-full object-cover rounded-full"
            />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] text-white shadow-xs">
              ✓
            </span>
          </div>
          <div className="mt-3 space-y-1">
            <span className="text-base font-black tracking-tight text-zinc-950 block uppercase leading-tight font-sans">
              Galindo Barber
            </span>
            <span className="inline-block text-[10px] uppercase tracking-widest text-zinc-500 font-mono font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200/80">
              Panel Administrativo
            </span>
          </div>
        </div>

        {/* Links de Navegación */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) onCloseMobile?.();
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-black text-white font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-zinc-500')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-3 border-t border-zinc-200 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:text-black bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            Ver Tienda Pública
          </span>
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
            En vivo
          </span>
        </Link>

        <div className="px-2 py-2 flex items-center justify-between gap-2 rounded-xl hover:bg-zinc-50 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="text-xs truncate">
              <p className="text-zinc-900 font-semibold leading-tight truncate">
                {userMeta.nombre}
              </p>
              <p className="text-zinc-500 text-[10px] truncate">{userMeta.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión de forma segura"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Sidebar Fijo para Escritorio (Oculto en Móvil/Tablet < 1024px, Visible en Desktop lg+) */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-200 bg-white flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Drawer Móvil Deslizante con Backdrop (Solo para pantallas < 1024px) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop oscuro con blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden cursor-pointer"
            />

            {/* Panel drawer animado */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white flex flex-col justify-between shadow-2xl lg:hidden overflow-y-auto"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Pantalla Completa de Cierre de Sesión Seguro (1.5 segundos) */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-2xl flex flex-col items-center justify-center px-6 text-white"
          >
            {/* Resplandor sutil de seguridad */}
            <div className="absolute w-[450px] h-[450px] rounded-full bg-rose-600/10 blur-[130px] pointer-events-none" />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center space-y-6 max-w-sm w-full relative z-10"
            >
              {/* Logo con indicador de salida */}
              <div className="relative inline-block">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-white p-1">
                  <img
                    src="/logo.jpg"
                    alt="Galindo Barber"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute -inset-2 rounded-full border border-rose-500/30 animate-ping pointer-events-none" />
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-rose-600 border-2 border-zinc-950 flex items-center justify-center text-xs text-white shadow-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Textos de Cierre con despedida según hora */}
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-medium tracking-wide uppercase">
                  Cierre de Sesión Seguro
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  {getFarewell()}, {formattedName}!
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  Sesión finalizada de forma segura
                </p>
              </div>

              {/* Barra de Progreso de 1.5 segundos */}
              <div className="space-y-2 pt-2">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400 rounded-full shadow-lg shadow-rose-500/50"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono animate-pulse">
                  Redirigiendo a la pantalla de inicio...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
