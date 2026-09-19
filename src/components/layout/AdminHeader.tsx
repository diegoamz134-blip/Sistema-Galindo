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
  const [cajaAbierta, setCajaAbierta] = useState<boolean>(false);
  const [saldoCaja, setSaldoCaja] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCajaHeader() {
      try {
        const todayStr = getFormattedCurrentDate(new Date());
        const { data } = await supabase
          .from('cajas')
          .select('estado, saldo_teorico_efectivo, total_ventas_efectivo')
          .order('fecha_apertura', { ascending: false })
          .limit(1);

        if (!isMounted) return;
        setFechaStr(todayStr);
        if (data && data.length > 0) {
          const c = data[0];
          setCajaAbierta(c.estado === 'ABIERTA');
          setSaldoCaja(Number(c.saldo_teorico_efectivo ?? c.total_ventas_efectivo ?? 0));
        } else {
          setCajaAbierta(false);
          setSaldoCaja(0);
        }
      } catch (err) {
        console.error('Error al verificar caja en header:', err);
      }
    }

    loadCajaHeader();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/95 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Botón de Menú Móvil + Fecha y Sede */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-xl text-zinc-700 hover:text-black hover:bg-zinc-100 lg:hidden transition-colors cursor-pointer shrink-0"
          title="Abrir menú de navegación"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 truncate">
          <span
            suppressHydrationWarning
            className="text-xs font-semibold text-zinc-900 capitalize block truncate"
          >
            {fechaStr}
          </span>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">
            {userMeta.sede || 'Sede Principal'}
          </span>
        </div>
      </div>

      {/* Right: Estado de Caja Chica y Accesos */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Pill de Caja Chica */}
        <Link
          href="/admin/caja"
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 transition-colors text-xs"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cajaAbierta ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
            }`}
          />
          <span className="text-zinc-500 hidden sm:inline">Caja:</span>
          <span className="text-zinc-950 font-bold font-mono text-[11px] sm:text-xs">
            {cajaAbierta ? formatCurrency(saldoCaja) : 'Cerrada'}
          </span>
        </Link>

        {/* Acceso a Nueva Matrícula */}
        <Link
          href="/admin/matriculas"
          className="inline-flex items-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <span className="hidden sm:inline">Nueva Matrícula</span>
          <span className="sm:hidden">+ Matrícula</span>
        </Link>
      </div>
    </header>
  );
}
