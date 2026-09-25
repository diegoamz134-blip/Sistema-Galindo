'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
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

  // Duración dinámica según el número de tarjetas (velocidad más ágil y rápida)
  const animationDuration = Math.max(14, duplicatedCursos.length * 2.2);

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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Duración sobre la imagen */}
                    <div className="absolute bottom-2.5 left-2.5 text-white text-[11px] font-mono">
                      <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                        {curso.duracion_semanas} Semanas • {curso.horas_academicas || 60} Horas
                      </span>
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
