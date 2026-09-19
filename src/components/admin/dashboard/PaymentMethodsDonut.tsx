'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethodItem, getPaymentMethodsBreakdown } from '@/lib/dashboard-service';

export function PaymentMethodsDonut() {
  const [data, setData] = useState<PaymentMethodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const res = await getPaymentMethodsBreakdown();
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.monto, 0);
  const chartData = total > 0 ? data : [{ name: 'Sin cobros', monto: 1, porcentaje: 0, color: '#e4e4e7' }];

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
          <CreditCard className="w-3.5 h-3.5 text-cyan-600" />
          <span>Canales de Cobro</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Hoy
        </span>
      </div>

      {/* Gráfico Donut y Métricas */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Gráfico Recharts */}
        <div className="h-44 w-44 relative shrink-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
              Cargando...
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {total > 0 && (
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as PaymentMethodItem;
                          return (
                            <div className="rounded-xl bg-zinc-950 p-2.5 text-white text-xs shadow-xl border border-zinc-800 font-mono">
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-emerald-400 font-bold">{formatCurrency(item.monto)}</p>
                              <p className="text-zinc-400 text-[10px]">{item.porcentaje}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  )}
                  <Pie
                    data={chartData}
                    dataKey="monto"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={70}
                    paddingAngle={total > 0 ? 4 : 0}
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centro de la dona con Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                  Total
                </span>
                <span className="text-sm font-bold font-mono text-zinc-950">
                  {formatCurrency(total)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Leyenda y Detalles */}
        <div className="flex-1 w-full space-y-2.5">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-zinc-700 font-medium">{item.name}</span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-zinc-950">{formatCurrency(item.monto)}</span>
                <span className="text-[10px] text-zinc-400 ml-1.5 font-normal">
                  ({item.porcentaje}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
