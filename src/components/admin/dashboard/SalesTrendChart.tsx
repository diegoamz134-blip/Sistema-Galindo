'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SalesDataPoint, getSalesTrendData } from '@/lib/dashboard-service';

export function SalesTrendChart() {
  const [periodo, setPeriodo] = useState<'7d' | '30d' | 'año'>('7d');
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const res = await getSalesTrendData(periodo);
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [periodo]);

  const totalPeriodo = data.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-6">
      {/* Header del Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Evolución de Ingresos y Tendencia</span>
          </div>
          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-2xl font-bold font-mono text-zinc-950">
              {formatCurrency(totalPeriodo)}
            </span>
            {totalPeriodo > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                Sin ventas registradas
              </span>
            )}
          </div>
        </div>

        {/* Filtros de Periodo */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriodo('7d')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              periodo === '7d'
                ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            7 Días
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('30d')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              periodo === '30d'
                ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Este Mes
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('año')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              periodo === 'año'
                ? 'bg-white text-zinc-950 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Año 2026
          </button>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="h-64 w-full min-h-[256px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
            Cargando métricas de Supabase...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTienda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(v) => `S/${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl bg-zinc-950 p-3 text-white text-xs shadow-xl border border-zinc-800 space-y-1">
                        <p className="font-semibold text-zinc-300 font-mono">{label}</p>
                        <p className="text-emerald-400 font-mono font-bold">
                          Total: {formatCurrency(Number(payload[0]?.value || 0))}
                        </p>
                        {payload[1] && (
                          <p className="text-zinc-400 text-[11px] font-mono">
                            Tienda: {formatCurrency(Number(payload[1]?.value || 0))}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="tienda"
                stroke="#27272a"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorTienda)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Leyenda y Notas */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Ingresos Totales (Tienda + Academia)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            Ventas de Productos Tienda
          </span>
        </div>
        <span className="hidden sm:inline font-mono">Actualizado en vivo</span>
      </div>
    </div>
  );
}
