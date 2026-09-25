'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function AcademyUrgencyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border-2 border-zinc-800 p-6 sm:p-8 lg:p-10 shadow-2xl group"
    >
      {/* Luz ambiente sutil */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Ribbon sutil estilo Barber Pole en el borde superior */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #e11d48, #e11d48 10px, #ffffff 10px, #ffffff 20px, #2563eb 20px, #2563eb 30px, #ffffff 30px, #ffffff 40px)',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        
        {/* Columna Izquierda: Información de Ciclo */}
        <div className="space-y-4 max-w-2xl">

          {/* Título Principal */}
          <div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
              Próximo Ciclo: Inicio 1 de Octubre
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed font-medium">
              Aprende corte profesional con práctica real desde la primera semana. Grupos reducidos de máximo 10 alumnos con estaciones individuales y modelos reales para garantizar tu progreso.
            </p>
          </div>

          {/* Beneficios directos en pastillas limpias */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <div className="text-zinc-300 bg-zinc-800/90 px-3 py-1.5 rounded-xl border border-zinc-700/60 font-medium">
              <span>Turnos: Mañana, Tarde o Sábados</span>
            </div>

            <div className="text-zinc-300 bg-zinc-800/90 px-3 py-1.5 rounded-xl border border-zinc-700/60 font-medium">
              <span>Certificado de la Academia al Egresar</span>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Botones de Acción directos a Cursos & Academia */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-72">
          {/* Botón Principal: Separar Vacante y Elegir Curso */}
          <Link
            href="/cursos"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-100 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 text-center cursor-pointer"
          >
            <span>Separar Vacante & Elegir Curso</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Botón Secundario: Explorar Temarios y Sedes */}
          <Link
            href="/cursos"
            className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 font-bold text-xs uppercase tracking-wider transition-all duration-200 text-center cursor-pointer"
          >
            <span>Ver Temarios, Horarios & Sedes</span>
          </Link>

          <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
            Elige tu curso, turno y sede (Ica o Huancayo) en nuestro módulo académico.
          </p>
        </div>

      </div>
    </motion.div>
  );
}

