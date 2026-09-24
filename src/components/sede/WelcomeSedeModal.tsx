'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { SEDES, SedeId } from '@/lib/constants';

export function WelcomeSedeModal() {
  const { isWelcomeModalOpen, setIsWelcomeModalOpen, seleccionarSedeBienvenida } = useCart();
  const [recordar, setRecordar] = useState(true);
  const [hoveredSede, setHoveredSede] = useState<SedeId | null>(null);

  if (!isWelcomeModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-sede-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
      >
        <motion.div
          key="welcome-sede-modal-content"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-3xl rounded-3xl bg-[#0B0B0D] border border-zinc-800 text-white p-6 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden space-y-8 my-auto"
        >
          {/* Resplandor superior sutil blanco/zinc */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {/* Cabecera Estilo Licorería / Verificación Inicial */}
          <div className="text-center space-y-4 relative">
            {/* Logo Circular Oficial */}
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-zinc-700 shadow-md">
              <img
                src="/logo.jpg"
                alt="Galindo Barber Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                ¿Qué sede deseas visitar hoy?
              </h2>

              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Para mostrarte el catálogo con stock disponible en tienda física, precios exactos y convocatorias presenciales, indícanos tu ciudad de atención:
              </p>
            </div>
          </div>

          {/* Tarjetas de Selección de Sedes (Ica vs Huancayo) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative">
            {/* OPCIÓN 1: SEDE ICA */}
            <motion.div
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredSede('ica')}
              onMouseLeave={() => setHoveredSede(null)}
              onClick={() => seleccionarSedeBienvenida('ica', recordar)}
              className="relative p-6 sm:p-7 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-500 transition-all duration-300 flex flex-col justify-between space-y-5 cursor-pointer shadow-lg group text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Sede Central
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-white group-hover:text-black text-zinc-300 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-zinc-200 transition-colors">
                    Sede Ica
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Calle Bolívar 536, Ica</span>
                  </p>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  Tienda Supply oficial con stock físico completo de máquinas, tijeras y cosmética, más la Escuela de Barbería central.
                </p>

                <ul className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Stock inmediato en mostrador</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Clases presenciales de Barbería</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Envíos a todo el Perú</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-white group-hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Ingresar a Sede Ica</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* OPCIÓN 2: SEDE HUANCAYO */}
            <motion.div
              whileHover={{ y: -4, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredSede('huancayo')}
              onMouseLeave={() => setHoveredSede(null)}
              onClick={() => seleccionarSedeBienvenida('huancayo', recordar)}
              className="relative p-6 sm:p-7 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-500 transition-all duration-300 flex flex-col justify-between space-y-5 cursor-pointer shadow-lg group text-left"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Nueva Sede
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-white group-hover:text-black text-zinc-300 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-zinc-200 transition-colors">
                    Sede Huancayo
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Jr. Guido 654, Huancayo</span>
                  </p>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                  Galindo Tattoo & Barber Studio. Convocatorias exclusivas de Barbería Fade y Academia de Tatuaje profesional.
                </p>

                <ul className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cursos de Barbería & Fade (2 a 4 meses)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Curso Profesional de Tatuaje</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Stock Supply para Huancayo</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-white group-hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Ingresar a Sede Huancayo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>

          {/* Pie del Modal: Recordar selección y aclaratoria */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-zinc-200">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-white focus:ring-zinc-600 cursor-pointer"
              />
              <span>Recordar mi sede en este navegador</span>
            </label>

            <span className="text-[11px] font-mono text-zinc-400">
              Podrás cambiar de sede en cualquier momento desde el menú superior
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
