'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  History,
  Receipt,
  RotateCcw,
  Printer,
  Calendar,
  Wallet,
  TrendingUp,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getVentasHoyPOS, VentaRegistradaPOS } from '@/lib/pos-service';
import { formatCurrency } from '@/lib/utils';
import { METODOS_PAGO_LABELS } from '@/lib/constants';

interface POSSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeleccionarParaReimprimir?: (venta: any) => void;
}

export function POSSalesHistoryModal({
  isOpen,
  onClose,
  onSeleccionarParaReimprimir,
}: POSSalesHistoryModalProps) {
  const [ventas, setVentas] = useState<VentaRegistradaPOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');

  const cargarVentas = async () => {
    setLoading(true);
    try {
      const data = await getVentasHoyPOS();
      setVentas(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarVentas();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ventasFiltradas = ventas.filter((v) => {
    const q = filtroTexto.toLowerCase().trim();
    if (!q) return true;
    return (
      v.codigo_pedido.toLowerCase().includes(q) ||
      v.cliente_nombre.toLowerCase().includes(q) ||
      (v.cliente_dni && v.cliente_dni.includes(q))
    );
  });

  const totalVendido = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 border border-zinc-200 z-10 space-y-4 max-h-[92vh] flex flex-col"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950 uppercase tracking-tight">
                Ventas del Turno / Día
              </h3>
              <p className="text-xs text-zinc-500">
                Historial de tickets emitidos en mostrador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarVentas}
              title="Recargar"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen del Turno */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
              Total Ventas
            </span>
            <span className="text-xl font-black font-mono text-zinc-950">
              {formatCurrency(totalVendido)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">
              Tickets Emitidos
            </span>
            <span className="text-xl font-black font-mono text-zinc-950">
              {ventas.length} pedidos
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block font-mono">
              Estado
            </span>
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Caja y Stock en Vivo
            </span>
          </div>
        </div>

        {/* Buscador de Ventas */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Buscar por ticket #, nombre de cliente o DNI..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 outline-none focus:border-black"
          />
        </div>

        {/* Listado de Ventas */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-mono">
              Cargando ventas del día...
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
              <Receipt className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="font-bold text-zinc-700">No se encontraron ventas</p>
              <p className="text-[11px] text-zinc-400">
                Las ventas que realices en mostrador aparecerán listadas aquí.
              </p>
            </div>
          ) : (
            ventasFiltradas.map((v) => {
              const metaLabel = METODOS_PAGO_LABELS[v.metodo_pago] || {
                label: v.metodo_pago,
                color: 'bg-zinc-800 text-white',
              };
              const fecha = new Date(v.creado_en).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={v.id || v.codigo_pedido}
                  className="p-3 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-black bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                        {v.codigo_pedido}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">{fecha}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${metaLabel.color}`}>
                        {metaLabel.label}
                      </span>
                    </div>

                    <div className="font-bold text-zinc-900 truncate">
                      {v.cliente_nombre || 'Cliente Mostrador'}
                      {v.cliente_dni && (
                        <span className="font-mono text-[10px] text-zinc-400 ml-1.5">
                          ({v.cliente_dni})
                        </span>
                      )}
                    </div>

                    {v.items_resumen && (
                      <p className="text-[10px] text-zinc-500 font-mono truncate">
                        {v.items_resumen}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block font-mono">Total</span>
                      <span className="font-mono font-black text-sm text-zinc-950">
                        {formatCurrency(v.total)}
                      </span>
                    </div>

                    {onSeleccionarParaReimprimir && (v as any).ventaCompleta && (
                      <button
                        type="button"
                        onClick={() => onSeleccionarParaReimprimir((v as any).ventaCompleta)}
                        className="p-2 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Reimprimir Ticket"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Ticket</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
