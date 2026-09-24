'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Check, Phone, Clock, Store, Building2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { SEDES, SedeId } from '@/lib/constants';

interface SedeSelectorProps {
  variant?: 'pill' | 'dropdown' | 'segmented';
  className?: string;
  showDetails?: boolean;
}

export function SedeSelector({
  variant = 'dropdown',
  className = '',
  showDetails = false,
}: SedeSelectorProps) {
  const { sedeSeleccionada, setSedeSeleccionada, openWelcomeModal } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sedeActual = SEDES[sedeSeleccionada] || SEDES['ica'];

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const uniqueId = React.useId();

  // VARIANTE: Segmented Control (Estilo toggle [ Ica | Huancayo ])
  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 shadow-2xs ${className}`}>
        {(Object.keys(SEDES) as SedeId[]).map((key) => {
          const sede = SEDES[key];
          const isSelected = sedeSeleccionada === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSedeSeleccionada(key)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                isSelected
                  ? 'text-white shadow-xs'
                  : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId={`activeSedeSegment-${uniqueId}`}
                  className="absolute inset-0 bg-black rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <MapPin className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{sede.ciudad}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // VARIANTE: Dropdown moderno con información de dirección y horarios
  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-zinc-100/90 hover:bg-zinc-200/80 border border-zinc-200 text-zinc-900 transition-all cursor-pointer shadow-2xs active:scale-98"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="w-5 h-5 rounded-md bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-800 shadow-2xs shrink-0">
          <MapPin className="w-3 h-3 text-emerald-600" />
        </div>
        <div className="text-left flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 leading-none">
            Sede Activa
          </span>
          <span className="text-xs font-bold text-zinc-950 leading-tight">
            {sedeActual.nombre}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ml-0.5 ${
            isOpen ? 'rotate-180 text-black' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-zinc-200 shadow-2xl p-3 z-50 overflow-hidden"
          >
            <div className="px-2 py-1.5 border-b border-zinc-100 mb-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                  Cambiar Ciudad / Sucursal
                </span>
                <p className="text-xs font-bold text-zinc-900">
                  ¿Dónde deseas consultar inventario?
                </p>
              </div>
              <Store className="w-4 h-4 text-zinc-400" />
            </div>

            <div className="space-y-1.5">
              {(Object.keys(SEDES) as SedeId[]).map((key) => {
                const sede = SEDES[key];
                const isSelected = sedeSeleccionada === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSedeSeleccionada(key);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-black shadow-sm'
                        : 'bg-zinc-50/70 hover:bg-zinc-100/80 border-zinc-200/80 text-zinc-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                          }`}
                        >
                          {sede.ciudad}
                        </span>
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-950'}`}>
                          {sede.nombre}
                        </span>
                      </div>

                      <p className={`text-[11px] truncate ${isSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {sede.direccion}
                      </p>

                      {showDetails && (
                        <div
                          className={`pt-1.5 text-[10px] space-y-0.5 ${
                            isSelected ? 'text-zinc-400' : 'text-zinc-500'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{sede.horario}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>WA: {sede.whatsappDisplay}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-black shrink-0 mt-1">
                        Elegir
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-2.5 border-t border-zinc-100 px-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>Stock sincronizado por sede</span>
              <span>Ica & Huancayo</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openWelcomeModal();
              }}
              className="w-full mt-2.5 py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-zinc-600" />
              <span>Ver Pantalla Completa de Sedes</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
