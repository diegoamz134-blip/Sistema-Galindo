'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw } from 'lucide-react';
import { SEDES, SedeId, SedeInfo, DEFAULT_SEDE_ID } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'galindo_sede_activa';

interface SedeContextType {
  sedeActiva: SedeId;
  sedeInfo: SedeInfo;
  setSede: (id: SedeId) => void;
  sedes: typeof SEDES;
  puedeCambiarSede: boolean;
  sedesDisponibles: SedeInfo[];
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

export function SedeProvider({ children }: { children: React.ReactNode }) {
  const { userMeta, isLoading: isAuthLoading } = useAuth();
  const [sedeActiva, setSedeActiva] = useState<SedeId>(DEFAULT_SEDE_ID);
  const [isChanging, setIsChanging] = useState(false);
  const [targetSede, setTargetSede] = useState<SedeId | null>(null);

  const sedeAsignada = userMeta?.sede_asignada;
  const esSuper = Boolean(userMeta?.es_superadmin);
  const puedeCambiarSede = esSuper || !sedeAsignada || sedeAsignada === 'todas';

  // 1. Cargar sede persistida al iniciar (para visitantes públicos o superadmins)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SedeId | null;
      if (stored && SEDES[stored]) {
        setSedeActiva(stored);
      }
    } catch {}
  }, []);

  // 2. REGLA ESTRICTA DE SEGURIDAD:
  // Si el usuario tiene una sede asignada específica (ej. 'ica' o 'huancayo') y no es superadmin,
  // forzar automáticamente y permanentemente su sede asignada.
  useEffect(() => {
    if (!isAuthLoading && !puedeCambiarSede && (sedeAsignada === 'ica' || sedeAsignada === 'huancayo')) {
      if (sedeActiva !== sedeAsignada) {
        setSedeActiva(sedeAsignada as SedeId);
        try {
          localStorage.setItem(STORAGE_KEY, sedeAsignada);
        } catch {}
        window.dispatchEvent(new CustomEvent('galindo_sede_changed', { detail: { sedeId: sedeAsignada } }));
      }
    }
  }, [isAuthLoading, puedeCambiarSede, sedeAsignada, sedeActiva]);

  const setSede = useCallback((id: SedeId) => {
    if (id === sedeActiva) return;

    // Bloquear si el usuario no tiene permiso de cambiar de sede
    if (!puedeCambiarSede && (sedeAsignada === 'ica' || sedeAsignada === 'huancayo') && id !== sedeAsignada) {
      console.warn('Acceso denegado: tu cuenta solo tiene acceso a Sede', sedeAsignada);
      return;
    }
    
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
        setTimeout(() => setTargetSede(null), 300);
      }, 500); 
    }, 100);
  }, [sedeActiva, puedeCambiarSede, sedeAsignada]);

  const sedesDisponibles = puedeCambiarSede
    ? Object.values(SEDES)
    : sedeAsignada && (sedeAsignada === 'ica' || sedeAsignada === 'huancayo')
    ? [SEDES[sedeAsignada as SedeId]]
    : [SEDES[DEFAULT_SEDE_ID]];

  // Sede blindada efectiva: Si el usuario no puede cambiar de sede, siempre devuelve su sede asignada
  const sedeSegura: SedeId = (!puedeCambiarSede && (sedeAsignada === 'ica' || sedeAsignada === 'huancayo'))
    ? (sedeAsignada as SedeId)
    : sedeActiva;

  return (
    <SedeContext.Provider
      value={{
        sedeActiva: sedeSegura,
        sedeInfo: SEDES[sedeSegura] || SEDES[DEFAULT_SEDE_ID],
        setSede,
        sedes: SEDES,
        puedeCambiarSede,
        sedesDisponibles,
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
                  {SEDES[targetSede]?.nombre || targetSede}
                </span>
              </p>
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
    throw new Error('useSede debe usarse dentro de un SedeProvider');
  }
  return context;
}
