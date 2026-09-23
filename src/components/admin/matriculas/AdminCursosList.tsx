'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  Edit,
  Power,
  ExternalLink,
  Clock,
  Package,
  BookOpen,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Curso } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface AdminCursosListProps {
  cursos: Curso[];
  onCrearCurso: () => void;
  onEditarCurso: (curso: Curso) => void;
  onToggleActivo: (cursoId: string, nuevoEstado: boolean) => void;
  onEliminarCurso: (cursoId: string) => Promise<void> | void;
  onVaciarCursos: () => Promise<void> | void;
}

export function AdminCursosList({
  cursos,
  onCrearCurso,
  onEditarCurso,
  onToggleActivo,
  onEliminarCurso,
  onVaciarCursos,
}: AdminCursosListProps) {
  const [cursoAEliminar, setCursoAEliminar] = useState<{ id: string; titulo: string } | null>(null);
  const [showConfirmVaciar, setShowConfirmVaciar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const cursosActivosCount = cursos.filter((c) => c.activo !== false).length;

  const handleConfirmarEliminar = async () => {
    if (!cursoAEliminar) return;
    setProcesando(true);
    try {
      await onEliminarCurso(cursoAEliminar.id);
      setCursoAEliminar(null);
    } catch (err) {
      console.error('Error al eliminar curso:', err);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarVaciar = async () => {
    setProcesando(true);
    try {
      await onVaciarCursos();
      setShowConfirmVaciar(false);
    } catch (err) {
      console.error('Error al vaciar catálogo:', err);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra Superior de Control */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-zinc-950 uppercase tracking-tight flex items-center gap-2">
              <span>Catálogo de Cursos ({cursos.length})</span>
              {cursos.length === 0 && (
                <span className="text-[10px] font-normal text-zinc-400 font-mono">(Vacío)</span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-500">
              {cursos.length === 0
                ? 'No hay programas publicados. Puedes crear tus cursos desde cero.'
                : `${cursosActivosCount} activos en la Portada web`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cursos.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmVaciar(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Borrar todos los cursos para dejar la lista vacía"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Todo</span>
            </button>
          )}

          <Link
            href="/cursos"
            target="_blank"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <span>Ver en Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onCrearCurso}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Curso</span>
          </button>
        </div>
      </div>

      {/* Estado Vacío */}
      {cursos.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white border border-dashed border-zinc-300 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-950 text-sm">
              Catálogo de cursos vacío
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              No tienes ningún curso registrado. Crea tus programas personalizados con su costo de matrícula, mensualidades y materias temáticas.
            </p>
          </div>
          <button
            type="button"
            onClick={onCrearCurso}
            className="px-4 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primer Curso</span>
          </button>
        </div>
      ) : (
        /* Grid de Cursos Compacto (3 columnas balanceadas) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursos.map((curso) => {
            const esActivo = curso.activo !== false;
            const materias = Array.isArray(curso.temario_detallado)
              ? curso.temario_detallado
              : [];

            return (
              <motion.div
                key={curso.id}
                layout
                className={`rounded-2xl bg-white border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                  esActivo ? 'border-zinc-200' : 'border-zinc-200/60 opacity-80'
                }`}
              >
                <div>
                  {/* Banner / Imagen Compacta (h-36) */}
                  <div className="h-36 w-full bg-zinc-100 relative overflow-hidden border-b border-zinc-200">
                    <img
                      src={curso.imagen_url || '/logo.jpg'}
                      alt={curso.titulo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Badge de Estado */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider backdrop-blur-md shadow-xs border ${
                          esActivo
                            ? 'bg-emerald-500/90 text-white border-emerald-400'
                            : 'bg-zinc-900/85 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {esActivo ? '● Visible' : '○ Pausado'}
                      </span>
                    </div>

                    {/* Badge de Duración */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[9px] font-mono flex items-center gap-1 border border-white/20">
                      <Clock className="w-2.5 h-2.5 text-zinc-400" />
                      <span>
                        {curso.duracion_semanas} Sem • {curso.horas_academicas}h
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo Compacto */}
                  <div className="p-3.5 space-y-2.5">
                    <div>
                      <h4 className="text-xs font-black text-zinc-950 uppercase tracking-tight line-clamp-1">
                        {curso.titulo}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {curso.descripcion_corta}
                      </p>
                    </div>

                    {/* Estructura Financiera Compacta */}
                    <div className="grid grid-cols-3 gap-1 p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-center font-mono">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-sans font-bold">
                          Matrícula
                        </span>
                        <span className="text-xs font-black text-zinc-950">
                          {formatCurrency(curso.costo_matricula)}
                        </span>
                      </div>
                      <div className="border-x border-zinc-200">
                        <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-sans font-bold">
                          Mensual
                        </span>
                        <span className="text-xs font-black text-emerald-700">
                          {formatCurrency(curso.costo_mensualidad)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-sans font-bold">
                          Contado
                        </span>
                        <span className="text-xs font-black text-zinc-950">
                          {curso.costo_total_contado
                            ? formatCurrency(curso.costo_total_contado)
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Materias del Temario */}
                    {materias.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 font-bold uppercase">
                          <span>Materias ({materias.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {materias.slice(0, 2).map((tema, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[9px] font-medium border border-zinc-200 truncate max-w-[130px]"
                            >
                              • {tema}
                            </span>
                          ))}
                          {materias.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 text-[9px] font-mono font-medium">
                              +{materias.length - 2} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de Acciones del Curso */}
                <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onToggleActivo(curso.id, !esActivo)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer border ${
                      esActivo
                        ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                    }`}
                    title={esActivo ? 'Pausar visibilidad' : 'Publicar en portada'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{esActivo ? 'Pausar' : 'Activar'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditarCurso(curso)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-black text-white hover:bg-zinc-800 shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCursoAEliminar({ id: curso.id, titulo: curso.titulo })}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title="Eliminar este curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmación: Eliminar Curso Individual */}
      <AnimatePresence>
        {cursoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-zinc-950">
                  ¿Eliminar este curso?
                </h4>
                <p className="text-xs text-zinc-600 font-semibold">
                  &quot;{cursoAEliminar.titulo}&quot;
                </p>
                <p className="text-[11px] text-zinc-400">
                  Esta acción eliminará el curso del catálogo y dejará de mostrarse en la portada web.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => setCursoAEliminar(null)}
                  className="w-1/2 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={handleConfirmarEliminar}
                  className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {procesando ? 'Borrando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación: Vaciar Todo el Catálogo */}
      <AnimatePresence>
        {showConfirmVaciar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-zinc-950">
                  ¿Vaciar todo el catálogo de cursos?
                </h4>
                <p className="text-xs text-zinc-500">
                  Se eliminarán todos los {cursos.length} cursos actuales para que puedas comenzar con el catálogo completamente limpio.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={() => setShowConfirmVaciar(false)}
                  className="w-1/2 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={procesando}
                  onClick={handleConfirmarVaciar}
                  className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {procesando ? 'Vaciando...' : 'Sí, Vaciar Todo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
