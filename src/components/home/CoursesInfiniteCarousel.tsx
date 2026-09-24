'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin,
  ArrowRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { Curso } from '@/types/database';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';

interface CoursesInfiniteCarouselProps {
  cursos: Curso[];
  sedeActual: {
    nombre: string;
    ciudad: string;
    direccion: string;
    whatsapp: string;
  };
}

export function CoursesInfiniteCarousel({
  cursos,
  sedeActual,
}: CoursesInfiniteCarouselProps) {
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Duplicar cursos para asegurar un bucle visual infinito sin cortes
  // Si hay 2 cursos, multiplicamos x 4 = 8 tarjetas. Si hay 4, x 2 = 8 tarjetas.
  const repeatCount = Math.max(2, Math.ceil(8 / (cursos.length || 1)));
  const duplicatedCursos = Array.from({ length: repeatCount }).flatMap(() => cursos);

  // Control manual con botones de flecha (desplaza suavemente 380px)
  const handleScrollManual = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const offset = direction === 'left' ? -380 : 380;
    container.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Duración dinámica según el número de tarjetas
  const animationDuration = Math.max(30, duplicatedCursos.length * 6);

  return (
    <div className="relative w-full space-y-6">
      {/* Estilos CSS para el desplazamiento infinito 60fps con pausa por hover o touch */}
      <style>{`
        @keyframes marqueeInfinite {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: marqueeInfinite ${animationDuration}s linear infinite;
        }
        .marquee-track.is-paused,
        .marquee-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Controles de cabecera del carrusel: Indicador de estado y botones manuales */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPaused ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isPaused ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            {isPaused ? 'Carrusel en Pausa (Listo para Seleccionar)' : 'En Desplazamiento Continuo'}
          </span>
          <span className="hidden sm:inline text-zinc-300">•</span>
          <span className="hidden sm:inline text-[11px] text-zinc-400 font-medium">
            Pasa el cursor o presiona con el dedo para detener
          </span>
        </div>

        {/* Botones de control interactivo */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              isPaused
                ? 'bg-zinc-950 text-white border-zinc-900 shadow-xs'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
            title={isPaused ? 'Reanudar movimiento' : 'Pausar carrusel'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-bold">{isPaused ? 'Reanudar' : 'Pausar'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleScrollManual('left')}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer active:scale-95"
            aria-label="Anterior curso"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollManual('right')}
            className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer active:scale-95"
            aria-label="Siguiente curso"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ÁREA DEL CARRUSEL INFINITO CON DEGRADADOS LATERALES */}
      <div
        className="relative overflow-hidden py-4 -my-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Máscara de desvanecimiento lateral izquierda */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#F1F3F5] via-[#F1F3F5]/80 to-transparent z-10" />

        {/* Máscara de desvanecimiento lateral derecha */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-[#F1F3F5] via-[#F1F3F5]/80 to-transparent z-10" />

        {/* Pista de tarjetas en movimiento continuo */}
        <div
          ref={scrollContainerRef}
          className={`marquee-track gap-6 sm:gap-8 ${isPaused ? 'is-paused' : ''}`}
        >
          {duplicatedCursos.map((curso, idx) => {
            const turnosConPrecio = (curso.turnos || []).filter((t) => t.costo_mensualidad);
            const precioMinimo = turnosConPrecio.length > 0
              ? Math.min(...turnosConPrecio.map((t) => t.costo_mensualidad!))
              : (curso.costo_mensualidad || curso.costo_matricula);

            return (
              <div
                key={`${curso.id}-${idx}`}
                className="w-[320px] sm:w-[380px] md:w-[420px] shrink-0 bg-white rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.13)] border border-zinc-200/80 transition-all duration-300 flex flex-col justify-between space-y-5 group select-none cursor-pointer"
              >
                {/* Cabecera con Imagen y Badges */}
                <div className="space-y-4">
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-2xs">
                    <img
                      src={curso.imagen_url}
                      alt={curso.titulo}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                    {/* Insignia de Sede */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-950/90 backdrop-blur-md text-amber-300 text-[10px] font-mono font-bold border border-amber-400/30 flex items-center gap-1 shadow-sm">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>Sede {sedeActual.ciudad}</span>
                      </span>
                    </div>

                    {/* Insignia de Modalidad */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-zinc-900 text-[10px] font-mono font-bold shadow-sm">
                        Ciclo 2026
                      </span>
                    </div>

                    {/* Duración sobre la imagen */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-mono">
                      <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                        {curso.duracion_semanas} Semanas • {curso.horas_academicas || 60} Horas
                      </span>
                      {curso.incluye_kit && (
                        <span className="bg-emerald-600/90 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                          Kit Incluido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Título y Descripción */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight group-hover:text-black transition-colors line-clamp-2 leading-tight">
                      {curso.titulo}
                    </h3>
                    <p className="text-xs text-zinc-600 mt-2 leading-relaxed line-clamp-2 font-medium">
                      {curso.descripcion_corta}
                    </p>
                  </div>

                  {/* Modalidades / Opciones del Volante (Huancayo e Ica) */}
                  {turnosConPrecio.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        <span>{turnosConPrecio.length} Opciones de Duración:</span>
                        <span className="text-emerald-600">Presencial</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {turnosConPrecio.map((t) => (
                          <div
                            key={t.id}
                            className="p-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left flex flex-col justify-between hover:bg-zinc-100/70 transition-colors"
                          >
                            <span className="text-[11px] font-bold text-zinc-900 leading-tight truncate">
                              {t.nombre.replace(/—.*$/, '').replace(/Opción \d+/, '').replace(/^—/, '').trim() || t.nombre}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                              <span className="text-zinc-500 font-medium">
                                {t.duracion_meses ? `${t.duracion_meses} Meses` : ''}
                              </span>
                              <span className="font-bold text-zinc-950 bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                                S/ {t.costo_mensualidad}/m
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : curso.temario_detallado ? (
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                        Módulos Principales:
                      </span>
                      <ul className="space-y-1.5">
                        {curso.temario_detallado.slice(0, 3).map((mod, i) => (
                          <li key={i} className="flex items-center gap-2 text-[11px] text-zinc-700 font-medium truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 shrink-0" />
                            <span className="truncate">{mod}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {/* Pie de la Tarjeta: Precios y Acciones */}
                <div className="pt-4 border-t border-zinc-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                        Mensualidad desde
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-zinc-950 font-mono">
                          {formatCurrency(precioMinimo)}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500 font-medium">/mes</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-zinc-400 block">Matrícula</span>
                      <span className="text-sm font-bold text-zinc-700 font-mono">
                        {formatCurrency(curso.costo_matricula)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/cursos"
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-center font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 group/btn"
                    >
                      <span>Ver Horarios</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>

                    <a
                      href={`https://wa.me/${sedeActual.whatsapp}?text=${encodeURIComponent(
                        `Hola Galindo Barber Academy (${sedeActual.nombre}). Deseo información y separar vacante para el curso: ${curso.titulo} en ${sedeActual.ciudad}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
