'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { SEDES } from '@/lib/constants';

export function SedeTransitionOverlay() {
  const { isTransitioningSede, targetSede, transitionMessage } = useCart();

  const sedeInfo = targetSede ? SEDES[targetSede] : null;

  return (
    <AnimatePresence>
      {isTransitioningSede && (
        <motion.div
          key="sede-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-7 sm:p-8 text-center shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden space-y-6"
          >
            {/* Resplandor ambiental de fondo sutil blanco/zinc */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            {/* Icono central animado estilo negro/blanco minimalista */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              {/* Anillo de pulso exterior */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-2xl bg-white/10 blur-xs"
              />

              {/* Anillo giratorio de carga */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-2xl border-2 border-dashed border-zinc-600"
              />

              {/* Contenedor del icono monocromático */}
              <div className="relative w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
                <MapPin className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>

            {/* Textos Informativos */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-zinc-900 text-zinc-300 border border-zinc-700">
                <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
                <span>Actualizando Sede</span>
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {sedeInfo ? sedeInfo.nombre : 'Sede Galindo'}
              </h3>

              <p className="text-xs text-zinc-400 font-medium">
                {sedeInfo?.direccion} ({sedeInfo?.ciudad})
              </p>
            </div>

            {/* Barra de progreso animada minimalista (blanco/zinc) */}
            <div className="space-y-2.5">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-full w-2/3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                />
              </div>

              <p className="text-[11px] font-mono text-zinc-400 tracking-wide">
                {transitionMessage || 'Cambiando de sede...'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
