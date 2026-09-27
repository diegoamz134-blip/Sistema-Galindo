'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { formatCurrency, getFormattedCurrentDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AdminHeaderProps {
  onOpenMobileMenu?: () => void;
}

export function AdminHeader({ onOpenMobileMenu }: AdminHeaderProps) {
  const { userMeta } = useAuth();
  const [fechaStr, setFechaStr] = useState<string>('Hoy');

  useEffect(() => {
    let isMounted = true;
    const todayStr = getFormattedCurrentDate(new Date());
    if (isMounted) setFechaStr(todayStr);
    return () => { isMounted = false; };
  }, []);

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/95 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Boton Menu Movil + Fecha y Sede */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-xl text-zinc-700 hover:text-black hover:bg-zinc-100 lg:hidden transition-colors cursor-pointer shrink-0"
          title="Abrir menu de navegacion"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 truncate">
          <span suppressHydrationWarning className="text-xs font-semibold text-zinc-900 capitalize block truncate">
            {fechaStr}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">
            {userMeta.nombre || 'Administrador'}
          </span>
        </div>
      </div>

      {/* Right: Accesos */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Acceso a Nueva Matricula */}
        <Link
          href="/admin/matriculas"
          className="inline-flex items-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <span className="hidden sm:inline">Nueva Matricula</span>
          <span className="sm:hidden">+ Matricula</span>
        </Link>
      </div>
    </header>
  );
}
