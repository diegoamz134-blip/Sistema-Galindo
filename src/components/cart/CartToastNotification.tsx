'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingCart, X, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';

export function CartToastNotification() {
  const { toastNotification, dismissToast, setCartOpen } = useCart();

  return (
    <AnimatePresence>
      {toastNotification && (
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed top-24 right-4 sm:right-6 z-[9998] max-w-[calc(100vw-2rem)] sm:max-w-md w-full bg-zinc-950/95 backdrop-blur-xl text-white border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Barra superior de progreso de auto-cierre */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3.5, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 w-full"
          />

          <div className="p-3.5 sm:p-4 flex items-center gap-3">
            {/* Miniatura del producto */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 shrink-0">
              <img
                src={toastNotification.producto.imagenes?.[0] || '/logo.jpg'}
                alt={toastNotification.producto.nombre}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-tl bg-emerald-500 text-black flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>

            {/* Información del producto */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  ¡Agregado al Carrito!
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate mt-0.5">
                {toastNotification.producto.nombre}
              </h4>
              <p className="text-[11px] font-mono font-bold text-zinc-300">
                {formatCurrency(toastNotification.precio)}
              </p>
            </div>

            {/* Botón Ver Carrito */}
            <button
              type="button"
              onClick={() => {
                dismissToast();
                setCartOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Ver Carrito</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={dismissToast}
              className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0 cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
