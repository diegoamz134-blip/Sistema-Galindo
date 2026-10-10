'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  FolderPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Categoria } from '@/types/database';
import { createCategory, deleteCategory } from '@/lib/products-service';

interface ModalGestionCategoriasProps {
  isOpen: boolean;
  onClose: () => void;
  categoriasExistentes: Categoria[];
  onCategoriaCreada: (nuevaCat: Categoria) => void;
  onCategoriaEliminada?: (id: string) => void;
}

export function ModalGestionCategorias({
  isOpen,
  onClose,
  categoriasExistentes,
  onCategoriaCreada,
  onCategoriaEliminada,
}: ModalGestionCategoriasProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Ingresa el nombre de la categoría.');
      return;
    }

    // Verificar si ya existe una categoría con nombre similar
    const yaExiste = categoriasExistentes.some(
      (c) => c.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    );
    if (yaExiste) {
      setError('Ya existe una categoría con este nombre.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await createCategory({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });

      if (res.success && res.data) {
        setExito(true);
        onCategoriaCreada(res.data);
        setTimeout(() => {
          setNombre('');
          setDescripcion('');
          setExito(false);
          onClose();
        }, 600);
      } else {
        setError(res.error || 'No se pudo guardar la categoría.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al crear categoría.');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarCategoria = async (cat: Categoria) => {
    setEliminandoId(cat.id);
    setError(null);

    try {
      const res = await deleteCategory(cat.id);
      if (res.success) {
        setCategoriaAEliminar(null);
        if (onCategoriaEliminada) {
          onCategoriaEliminada(cat.id);
        }
      } else {
        setError(res.error || 'No se pudo eliminar la categoría.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al eliminar categoría.');
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-zinc-200 z-10 space-y-4 max-h-[92vh] flex flex-col"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950 uppercase tracking-tight">
                Gestión de Categorías
              </h3>
              <p className="text-xs text-zinc-500">
                Crea nuevas categorías o administra las existentes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {exito && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Categoría creada y seleccionada exitosamente!</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Nombre de la Categoría */}
          <div>
            <label className="block font-bold text-zinc-800 mb-1">
              Nombre de la Categoría <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cuidado Facial, Geles y Fijadores, Navajas Premium..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black focus:bg-white transition-all text-xs font-medium"
            />
          </div>

          {/* Descripción Corta */}
          <div>
            <label className="block font-bold text-zinc-800 mb-1">
              Descripción Corta <span className="text-zinc-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Artículos de afeitado profesional y toallas calientes"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black focus:bg-white transition-all text-xs"
            />
          </div>

          {/* Categorías actuales con botón de eliminar */}
          <div className="pt-2 border-t border-zinc-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                Categorías Registradas ({categoriasExistentes.length})
              </span>
              <span className="text-[10px] text-zinc-400">
                Clic en <Trash2 className="w-2.5 h-2.5 inline text-rose-500 mx-0.5" /> para eliminar
              </span>
            </div>

            {/* Confirmación inline para eliminar categoría */}
            {categoriaAEliminar && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">
                      ¿Deseas eliminar la categoría &quot;{categoriaAEliminar.nombre}&quot;?
                    </p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Solo se puede eliminar si no tiene productos vinculados en el catálogo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaAEliminar(null);
                      setError(null);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={eliminandoId === categoriaAEliminar.id}
                    onClick={() => handleEliminarCategoria(categoriaAEliminar)}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {eliminandoId === categoriaAEliminar.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        <span>Sí, eliminar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {categoriasExistentes.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/80 text-zinc-800 text-[11px] font-medium transition-colors"
                >
                  <span className="truncate max-w-[150px]">{c.nombre}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaAEliminar(c);
                      setError(null);
                    }}
                    title={`Eliminar categoría "${c.nombre}"`}
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={cargando || !nombre.trim()}
              className="py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {cargando ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Categoría</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
