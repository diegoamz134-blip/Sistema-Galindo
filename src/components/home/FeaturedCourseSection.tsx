'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Clock,
  MapPin,
} from 'lucide-react';
import { Curso } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface FeaturedCourseSectionProps {
  cursos: Curso[];
  sedeActual: {
    nombre: string;
    ciudad: string;
    direccion: string;
    whatsapp: string;
  };
}

export function FeaturedCourseSection({
  cursos,
  sedeActual,
}: FeaturedCourseSectionProps) {
  // Encontrar el curso marcado como destacado o tomar el primero activo disponible
  const cursoRecomendado =
    cursos.find((c) => c.destacado && c.activo !== false) ||
    cursos.find((c) => c.activo !== false) ||
    cursos[0];

  if (!cursoRecomendado) return null;

  const turnosConPrecio = (cursoRecomendado.turnos || []).filter((t) => t.costo_mensualidad);
  const precioMinimo =
    turnosConPrecio.length > 0
      ? Math.min(...turnosConPrecio.map((t) => t.costo_mensualidad!))
      : cursoRecomendado.costo_mensualidad || cursoRecomendado.costo_matricula;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* COLUMNA 1: INFORMACIÓN DEL CURSO Y BOTÓN VER MÁS CURSOS */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8 order-2 lg:order-1">
          {/* Título de la Sección */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-950 uppercase tracking-tight leading-[1.15]">
              Formación Profesional en Barbería &amp; Estética
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl font-normal">
              Aprende técnicas reales desde el primer día con instructores de alto nivel en nuestra sede de {sedeActual.ciudad}. Diseñado tanto para quienes inician desde cero como para quienes buscan perfeccionamiento.
            </p>
          </div>

          {/* Puntos de Valor Clave (Sobrios, Profesionales y Concretos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                  Prácticas con Modelos Reales
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  Cortes, desvanecidos y perfilados en vivo bajo supervisión.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4 text-zinc-950" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                  Certificación Oficial
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  Diploma acreditado a nombre de Galindo Barber Academy.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-zinc-950" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                  Horarios Flexibles
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  Turnos mañana, tarde o sábados intensivos a tu elección.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-zinc-950" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-tight">
                  Descuento en Herramientas
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  Precios especiales de alumno en nuestro supply oficial.
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/cursos"
              className="px-6 py-3.5 rounded-2xl bg-zinc-950 hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Ver Más Cursos</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href={`https://wa.me/${sedeActual.whatsapp}?text=${encodeURIComponent(
                `Hola Galindo Barber Academy (${sedeActual.nombre}). Quisiera consultar sobre el curso ${cursoRecomendado.titulo} y las vacantes en ${sedeActual.ciudad}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-900 font-bold text-xs uppercase tracking-wider transition-all border border-zinc-200/80 shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Consultar con Asesor</span>
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sede actual: {sedeActual.nombre} — {sedeActual.direccion}</span>
          </div>
        </div>

        {/* COLUMNA 2: LA TARJETA DEL CURSO EXACTAMENTE IDÉNTICA A TU DISEÑO */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
          <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.13)] border border-zinc-200/80 transition-all duration-300 flex flex-col justify-between space-y-5 select-none">
            
            {/* Cabecera con Imagen y Badges */}
            <div className="space-y-4">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-2xs">
                <img
                  src={cursoRecomendado.imagen_url}
                  alt={cursoRecomendado.titulo}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Duración sobre la imagen */}
                <div className="absolute bottom-2.5 left-2.5 text-white text-[11px] font-mono">
                  <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                    {cursoRecomendado.duracion_semanas} Semanas • {cursoRecomendado.horas_academicas || 60} Horas
                  </span>
                </div>
              </div>

              {/* Título y Descripción */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight line-clamp-2 leading-tight">
                  {cursoRecomendado.titulo}
                </h3>
                <p className="text-xs text-zinc-600 mt-2 leading-relaxed line-clamp-2 font-medium">
                  {cursoRecomendado.descripcion_corta}
                </p>
              </div>

              {/* Modalidades / Opciones del Volante */}
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
              ) : cursoRecomendado.temario_detallado ? (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                    Módulos Principales:
                  </span>
                  <ul className="space-y-1.5">
                    {cursoRecomendado.temario_detallado.slice(0, 3).map((mod, i) => (
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
                    {formatCurrency(cursoRecomendado.costo_matricula)}
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
                    `Hola Galindo Barber Academy (${sedeActual.nombre}). Deseo información y separar vacante para el curso: ${cursoRecomendado.titulo} en ${sedeActual.ciudad}.`
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
        </div>

      </div>
    </div>
  );
}
