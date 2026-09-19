'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { TopProductItem, getTopProductsRanking } from '@/lib/dashboard-service';

export function TopProductsRanking() {
  const [products, setProducts] = useState<TopProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const res = await getTopProductsRanking();
      if (isMounted) {
        setProducts(res);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Ventas Top / Productos Estrella</span>
        </div>
        <Link
          href="/admin/productos"
          className="text-xs font-medium text-zinc-600 hover:text-black flex items-center gap-1 group transition-colors"
        >
          <span>Inventario</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Lista de Ranking */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-zinc-400 font-mono">
            Calculando ranking de ventas...
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-2">
            <p className="text-xs font-semibold text-zinc-700">Sin ventas registradas</p>
            <p className="text-[11px] text-zinc-400">
              No hay ventas ni productos en la base de datos.
            </p>
          </div>
        ) : (
          products.map((item, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:bg-zinc-50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Badge de posición */}
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-xs ${
                        isFirst
                          ? 'bg-amber-400 text-zinc-950 font-black'
                          : isSecond
                          ? 'bg-zinc-300 text-zinc-950 font-bold'
                          : isThird
                          ? 'bg-amber-700/80 text-white font-bold'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-950 truncate leading-tight">
                        {item.nombre}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {item.categoria} • {item.unidadesVendidas} unidades
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold font-mono text-zinc-950">
                      {formatCurrency(item.ingresos)}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                      {item.porcentaje}% del total
                    </span>
                  </div>
                </div>

                {/* Barra de Porcentaje */}
                <div className="w-full h-1.5 bg-zinc-200/80 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.porcentaje}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFirst
                        ? 'bg-emerald-500'
                        : isSecond
                        ? 'bg-zinc-800'
                        : 'bg-zinc-600'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-1 text-center">
        <p className="text-[11px] text-zinc-400 font-mono">
          Datos calculados según órdenes y ventas de mostrador
        </p>
      </div>
    </div>
  );
}
