'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Scissors } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export function WelcomeSedeModal() {
  const { isWelcomeModalOpen, setIsWelcomeModalOpen, seleccionarSedeBienvenida } = useCart();
  const [recordar, setRecordar] = useState(true);
  const [imgError, setImgError] = useState(false);

  if (!isWelcomeModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-sede-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
      >
        <motion.div
          key="welcome-sede-modal-content"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg rounded-3xl bg-black border border-zinc-800 text-white p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,1)] overflow-hidden space-y-5 my-auto"
        >
          {/* Botón de cerrar */}
          <button
            type="button"
            onClick={() => setIsWelcomeModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer z-10"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Cabecera limpia */}
          <div className="text-center space-y-2.5 relative pt-1">
            <div className="relative mx-auto w-14 h-14 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center shadow-inner">
              {!imgError ? (
                <img
                  src="/logo.jpg"
                  alt="Galindo Barber"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Scissors className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Elige tu Sede
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Selecciona tu ciudad para mostrarte el catálogo con stock disponible en tienda física, precios exactos y convocatorias presenciales:
              </p>
            </div>
          </div>

          {/* Cuadros compactos con flecha: Sede Ica vs Sede Huancayo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
            {/* SEDE ICA */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => seleccionarSedeBienvenida('ica', recordar)}
              className="group py-4 px-4 sm:px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-white transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md"
            >
              <span className="font-black text-sm sm:text-base uppercase tracking-wider text-white">
                Sede Ica
              </span>
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 group-hover:bg-white group-hover:text-black text-zinc-400 flex items-center justify-center transition-all shrink-0">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>

            {/* SEDE HUANCAYO */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => seleccionarSedeBienvenida('huancayo', recordar)}
              className="group py-4 px-4 sm:px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-500 text-white transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md"
            >
              <span className="font-black text-sm sm:text-base uppercase tracking-wider text-white">
                Sede Huancayo
              </span>
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 group-hover:bg-white group-hover:text-black text-zinc-400 flex items-center justify-center transition-all shrink-0">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          </div>

          {/* Pie: Recordar sede y aviso */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2 text-xs text-zinc-500">
            <label className="inline-flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-white focus:ring-zinc-700 cursor-pointer accent-white"
              />
              <span className="text-[11px] sm:text-xs">Recordar mi sede</span>
            </label>

            <span className="text-[10px] sm:text-[11px] text-zinc-600 text-right">
              Puedes cambiarla en cualquier momento
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
