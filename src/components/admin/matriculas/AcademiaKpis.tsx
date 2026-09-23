'use client';

import React from 'react';
import { Users, DollarSign, Clock, PackageCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EstadisticasAcademia } from '@/lib/academia-service';
import { formatCurrency } from '@/lib/utils';

interface AcademiaKpisProps {
  stats: EstadisticasAcademia;
}

export function AcademiaKpis({ stats }: AcademiaKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Alumnos Inscritos */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Total Alumnos
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-950">
              {stats.totalAlumnos}
            </span>
            <span className="text-xs text-zinc-500 font-medium">estudiantes</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>{stats.alumnosAlDia} al día con sus cuotas</span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Total Recaudado */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Recaudación Total
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-zinc-950 font-mono">
              {formatCurrency(stats.totalRecaudado)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Matrículas + cuotas cobradas
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Saldo Pendiente por Cobrar */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Saldo por Cobrar
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {formatCurrency(stats.saldoPendiente)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            En cronograma de mensualidades
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Alertas: Kits & Cuotas Vencidas */}
      <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Alertas & Logística
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`text-xl font-bold font-mono ${stats.cuotasVencidas > 0 ? 'text-rose-600' : 'text-zinc-700'}`}>
                {stats.cuotasVencidas}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Mora
              </span>
            </div>
            <span className="text-zinc-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xl font-bold font-mono ${stats.kitsPendientes > 0 ? 'text-amber-600' : 'text-zinc-700'}`}>
                {stats.kitsPendientes}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Kits Pend.
              </span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            {stats.cuotasVencidas > 0 ? 'Requiere gestión de cobranza' : 'Kits por entregar al alumno'}
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
          {stats.cuotasVencidas > 0 ? (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          ) : (
            <PackageCheck className="w-5 h-5 text-zinc-600" />
          )}
        </div>
      </div>

    </div>
  );
}
