'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  User,
  Sparkles,
  CreditCard,
  History,
  Percent,
  ChevronDown,
  ChevronUp,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { VentaItemPOS } from '@/lib/pos-service';
import { formatCurrency } from '@/lib/utils';

interface POSCartTicketProps {
  items: VentaItemPOS[];
  codigoTicket: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteDni: string;
  descuento: number;
  onUpdateQuantity: (productoId: string, delta: number) => void;
  onRemoveItem: (productoId: string) => void;
  onClearCart: () => void;
  onChangeCliente: (datos: { nombre?: string; telefono?: string; dni?: string }) => void;
  onChangeDescuento: (monto: number) => void;
  onOpenCobroModal: () => void;
  onOpenHistorialModal: () => void;
}

export function POSCartTicket({
  items,
  codigoTicket,
  clienteNombre,
  clienteTelefono,
  clienteDni,
  descuento,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onChangeCliente,
  onChangeDescuento,
  onOpenCobroModal,
  onOpenHistorialModal,
}: POSCartTicketProps) {
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mostrarDescuentoInput, setMostrarDescuentoInput] = useState(false);
  const [descuentoTemp, setDescuentoTemp] = useState(descuento.toString());

  // Cálculos del ticket
  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - descuento);
  const totalArticulos = items.reduce((acc, item) => acc + item.cantidad, 0);

  const handleAplicarDescuento = () => {
    const val = parseFloat(descuentoTemp) || 0;
    onChangeDescuento(Math.min(subtotal, Math.max(0, val)));
    setMostrarDescuentoInput(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* 1. Encabezado del Ticket de Mostrador */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-200 bg-zinc-50/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-950">
                Ticket de Mostrador
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">{codigoTicket}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenHistorialModal}
              title="Ventas del Turno"
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline text-[11px]">Turno</span>
            </button>
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                title="Vaciar ticket"
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-500 hover:text-rose-600 text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>


        {/* Selector de Cliente */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-700">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-semibold truncate max-w-[170px]">
                {clienteNombre || 'Cliente Mostrador'}
              </span>
              {clienteDni && <span className="font-mono text-[10px] text-zinc-400">({clienteDni})</span>}
            </div>
            <button
              type="button"
              onClick={() => setMostrarFormCliente(!mostrarFormCliente)}
              className="text-[11px] font-bold text-zinc-600 hover:text-black flex items-center gap-0.5 cursor-pointer"
            >
              <span>{mostrarFormCliente ? 'Ocultar' : 'Editar Datos'}</span>
              {mostrarFormCliente ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <AnimatePresence>
            {mostrarFormCliente && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2 pt-1"
              >
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => onChangeCliente({ nombre: e.target.value })}
                  placeholder="Nombre del Cliente (Ej: Carlos Rojas)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs outline-none focus:border-black bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={clienteDni}
                    onChange={(e) => onChangeCliente({ dni: e.target.value })}
                    placeholder="DNI / RUC"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono outline-none focus:border-black bg-white"
                  />
                  <input
                    type="text"
                    value={clienteTelefono}
                    onChange={(e) => onChangeCliente({ telefono: e.target.value })}
                    placeholder="Celular (WhatsApp)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono outline-none focus:border-black bg-white"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Lista de Ítems en el Carrito */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-300">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-zinc-700">Ticket Vacío</p>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Haz clic en cualquier producto del catálogo para agregarlo a la venta.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.producto.id}
              className="p-2.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex items-center justify-between gap-2 text-xs shadow-2xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 font-bold text-zinc-900 truncate">
                  <span className="truncate">{item.producto.nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                  <span>{formatCurrency(item.precioUnitario)} c/u</span>
                  <span>•</span>
                  <span className="truncate">{item.producto.sku}</span>
                </div>
              </div>

              {/* Controles de Cantidad */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.producto.id, -1)}
                    className="p-1 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 font-mono font-bold text-xs text-zinc-900">
                    {item.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.producto.id, 1)}
                    className="p-1 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right font-mono font-black text-xs text-zinc-950">
                  {formatCurrency(item.subtotal)}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.producto.id)}
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Resumen de Totales y Botón de Cobro */}
      <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-zinc-50/90 space-y-3">
        <div className="space-y-1.5 font-mono text-xs">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal ({totalArticulos} art.):</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>

          {/* Descuento manual */}
          <div className="flex items-center justify-between text-zinc-600">
            <button
              type="button"
              onClick={() => setMostrarDescuentoInput(!mostrarDescuentoInput)}
              className="text-[11px] font-sans font-bold text-zinc-700 hover:text-black underline flex items-center gap-1 cursor-pointer"
            >
              <Percent className="w-3 h-3 text-indigo-600" />
              <span>{descuento > 0 ? `Descuento (S/ ${descuento.toFixed(2)})` : 'Aplicar Descuento'}</span>
            </button>
            {descuento > 0 && (
              <span className="font-bold text-emerald-700">-{formatCurrency(descuento)}</span>
            )}
          </div>

          <AnimatePresence>
            {mostrarDescuentoInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 pt-1"
              >
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">S/</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="1"
                    value={descuentoTemp}
                    onChange={(e) => setDescuentoTemp(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-2 py-1 rounded-lg border border-zinc-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAplicarDescuento}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 text-white font-bold text-xs"
                >
                  Ok
                </button>
                {descuento > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDescuento(0);
                      setDescuentoTemp('0');
                      setMostrarDescuentoInput(false);
                    }}
                    className="px-2 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs"
                  >
                    Quitar
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gran Total */}
          <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200 text-zinc-950">
            <span className="font-black text-sm uppercase tracking-tight">TOTAL A COBRAR:</span>
            <span className="font-mono font-black text-2xl text-black">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Botón Principal de Cobro */}
        <motion.button
          whileHover={{ scale: items.length > 0 ? 1.01 : 1 }}
          whileTap={{ scale: items.length > 0 ? 0.98 : 1 }}
          type="button"
          disabled={items.length === 0}
          onClick={onOpenCobroModal}
          className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
            items.length > 0
              ? 'bg-black text-white hover:bg-zinc-800 active:scale-95'
              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Cobrar {formatCurrency(total)}</span>
        </motion.button>
      </div>
    </div>
  );
}
