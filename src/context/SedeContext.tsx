'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw } from 'lucide-react';
import { SEDES, SedeId, SedeInfo, DEFAULT_SEDE_ID } from '@/lib/constants';

const STORAGE_KEY = 'galindo_sede_activa';

interface SedeContextType {
  sedeActiva: SedeId;
  sedeInfo: SedeInfo;
  setSede: (id: SedeId) => void;
  sedes: typeof SEDES;
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const [sedeActiva, setSedeActiva] = useState<SedeId>(DEFAULT_SEDE_ID);
  const [isChanging, setIsChanging] = useState(false);
  const [targetSede, setTargetSede] = useState<SedeId | null>(null);

  // Cargar sede persistida al iniciar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SedeId | null;
      if (stored && SEDES[stored]) {
        setSedeActiva(stored);
      }
    } catch {}
  }, []);

  const setSede = useCallback((id: SedeId) => {
    if (id === sedeActiva) return;
    
    // Iniciar transición visual
    setTargetSede(id);
    setIsChanging(true);

    // Cambiar la sede y disparar eventos ligeramente después para que la animación fluya
    setTimeout(() => {
      setSedeActiva(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
      window.dispatchEvent(new CustomEvent('galindo_sede_changed', { detail: { sedeId: id } }));
      
      // Quitar overlay después de un tiempo para asegurar que todo se recargó debajo
      setTimeout(() => {
        setIsChanging(false);
        setTimeout(() => setTargetSede(null), 300); // Limpiar después de animación de salida
      }, 500); 
    }, 100);
  }, [sedeActiva]);

  return (
    <SedeContext.Provider
      value={{
        sedeActiva,
        sedeInfo: SEDES[sedeActiva],
        setSede,
        sedes: SEDES,
      }}
    >
      {children}
      
      {/* Overlay de Transición de Sede */}
      <AnimatePresence>
        {isChanging && targetSede && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-white/70 flex flex-col items-center justify-center pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white p-8 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border border-zinc-200/50 flex flex-col items-center max-w-sm w-[90%] mx-4"
            >
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center mb-6 relative overflow-hidden shadow-inner">
                <RefreshCw className="w-8 h-8 text-zinc-300 animate-spin absolute" />
                <MapPin className="w-6 h-6 text-zinc-900 relative z-10" />
              </div>
              
              <h2 className="text-xl font-black text-zinc-900 mb-2 text-center tracking-tight">
                Cambiando de Sede
              </h2>
              
              <p className="text-sm text-zinc-500 text-center leading-relaxed">
                Preparando el entorno para <br/>
                <span className="text-zinc-900 font-bold bg-zinc-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {SEDES[targetSede].nombre}
                </span>
              </p>
              
              <div className="w-full h-1.5 bg-zinc-100 rounded-full mt-7 overflow-hidden relative">
                <motion.div 
                  initial={{ width: '0%', left: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-y-0 left-0 bg-zinc-900 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SedeContext.Provider>
  );
}

export function useSede() {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error('useSede debe ser utilizado dentro de un SedeProvider');
  }
  return context;
}
