'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Store, Check, Shield } from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface QuickViewModalProps {
  producto: Producto | null;
  onClose: () => void;
  onAddToCart: (producto: Producto, coords?: { x: number; y: number }) => void;
}

export function QuickViewModal({
  producto,
  onClose,
  onAddToCart,
}: QuickViewModalProps) {
  if (!producto) return null;

  const precioFinal = producto.precio_oferta || producto.precio_venta;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors z-20 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Imagen Principal */}
            <div className="bg-zinc-100 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200">
              <div className="relative aspect-square w-full max-w-xs rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-sm">
                <img
                  src={producto.imagenes[0]}
                  alt={producto.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Información Técnica */}
            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>SKU: {producto.sku}</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Stock ({producto.stock})
                  </span>
                </div>

                <h3 className="text-lg font-bold text-zinc-950 leading-snug">
                  {producto.nombre}
                </h3>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  {producto.descripcion}
                </p>

                {/* Sellos de Confianza */}
                <div className="pt-2 border-t border-zinc-100 flex flex-wrap gap-2 text-[10px] text-zinc-500 font-medium">
                  <div className="flex items-center gap-1 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100">
                    <Shield className="w-3 h-3 text-zinc-700" />
                    <span>Garantía Oficial</span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100">
                    <Store className="w-3 h-3 text-zinc-700" />
                    <span>Recojo en Sede o Envío</span>
                  </div>
                </div>
              </div>

              {/* Precios y Botón */}
              <div className="pt-4 border-t border-zinc-100 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Precio Final</span>
                    <span className="text-2xl font-black text-zinc-950 font-mono">
                      {formatCurrency(precioFinal)}
                    </span>
                    {producto.precio_oferta && producto.precio_oferta < producto.precio_venta && (
                      <span className="text-[11px] text-zinc-400 line-through font-mono block mt-0.5">
                        {formatCurrency(producto.precio_venta)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    const coords = {
                      x: e.clientX,
                      y: e.clientY,
                    };
                    onAddToCart(producto, coords);
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-xs bg-black text-white hover:bg-zinc-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir al Pedido</span>
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
