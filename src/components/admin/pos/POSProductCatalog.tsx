'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Barcode,
  Package,
  X,
  Check,
  Plus,
  AlertCircle,
  Tag,
  Scissors,
  Sparkles,
  Zap,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface POSProductCatalogProps {
  productos: Producto[];
  isLoading?: boolean;
  onAddToCart: (producto: Producto) => void;
}

export function POSProductCatalog({
  productos,
  isLoading = false,
  onAddToCart,
}: POSProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [productoAgregadoId, setProductoAgregadoId] = useState<string | null>(null);

  // Extraer categorías únicas disponibles
  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    productos.forEach((p) => {
      if (p.categoria?.id && p.categoria?.nombre) {
        map.set(p.categoria.id, p.categoria.nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  // Filtrado reactivo en tiempo real
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCategoria =
        categoriaSeleccionada === 'TODAS' || p.categoria_id === categoriaSeleccionada;

      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.categoria?.nombre && p.categoria.nombre.toLowerCase().includes(q));

      return matchCategoria && matchSearch;
    });
  }, [productos, searchTerm, categoriaSeleccionada]);

  const handleItemClick = (p: Producto) => {
    if (p.stock <= 0) return;
    onAddToCart(p);
    setProductoAgregadoId(p.id);
    setTimeout(() => setProductoAgregadoId(null), 700);
  };

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Barra de Búsqueda y Filtros de Categoría */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
        {/* Input Buscador con Soporte para Lector de Código de Barras */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, SKU o escanea código de barras..."
            className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-zinc-400"
            autoFocus
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-zinc-400 hover:text-black rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded shadow-2xs">
              <Barcode className="w-3 h-3 text-zinc-600" />
              SKU
            </span>
          </div>
        </div>

        {/* Píldoras de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setCategoriaSeleccionada('TODAS')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              categoriaSeleccionada === 'TODAS'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            Todos ({productos.length})
          </button>
          {categorias.map((cat) => {
            const count = productos.filter((p) => p.categoria_id === cat.id).length;
            const activa = categoriaSeleccionada === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activa
                    ? 'bg-zinc-950 text-white font-bold shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                <span>{cat.nombre}</span>
                <span className={`text-[10px] font-mono ${activa ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-zinc-200 p-3 h-48 animate-pulse flex flex-col justify-between"
              >
                <div className="w-full h-24 bg-zinc-100 rounded-xl" />
                <div className="space-y-2">
                  <div className="w-3/4 h-3 bg-zinc-200 rounded" />
                  <div className="w-1/2 h-3 bg-zinc-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">No se encontraron productos</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Intenta con otra palabra clave o selecciona otra categoría.
              </p>
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
              >
                Limpiar Búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {productosFiltrados.map((p) => {
              const agotado = p.stock <= 0;
              const bajoStock = p.stock > 0 && p.stock <= (p.stock_minimo || 3);
              const precioAplicado = p.precio_oferta || p.precio_venta;
              const recientementeAgregado = productoAgregadoId === p.id;

              return (
                <motion.div
                  key={p.id}
                  whileTap={{ scale: agotado ? 1 : 0.96 }}
                  onClick={() => handleItemClick(p)}
                  className={`group relative rounded-2xl border bg-white p-3 flex flex-col justify-between transition-all select-none ${
                    agotado
                      ? 'opacity-60 border-zinc-200 cursor-not-allowed bg-zinc-50/60'
                      : 'border-zinc-200 hover:border-black hover:shadow-md cursor-pointer active:border-black'
                  }`}
                >
                  {/* Badge de Feedback de Agregado */}
                  <AnimatePresence>
                    {recientementeAgregado && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 bg-black/75 rounded-2xl z-10 flex flex-col items-center justify-center text-white backdrop-blur-2xs"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-1 shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <span className="text-[11px] font-bold">¡Agregado!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Imagen del Producto o Placeholder */}
                  <div className="relative w-full h-24 sm:h-28 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden flex items-center justify-center mb-2.5">
                    {p.imagenes && p.imagenes.length > 0 ? (
                      <img
                        src={p.imagenes[0]}
                        alt={p.nombre}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-zinc-300 flex flex-col items-center gap-1">
                        <Package className="w-8 h-8" />
                        <span className="text-[9px] font-mono">Sin foto</span>
                      </div>
                    )}

                    {/* Badge de Stock flotante */}
                    <div className="absolute top-1.5 right-1.5">
                      {agotado ? (
                        <span className="text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          Agotado
                        </span>
                      ) : bajoStock ? (
                        <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          Stock: {p.stock}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          {p.stock} un.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info de Producto */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-zinc-400">
                      <span className="truncate">{p.sku}</span>
                      {p.categoria && (
                        <span className="truncate max-w-[80px] text-zinc-500">
                          {p.categoria.nombre}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-zinc-900 line-clamp-2 leading-snug group-hover:text-black">
                      {p.nombre}
                    </h4>
                  </div>

                  {/* Precios y Botón Rápido */}
                  <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-black text-sm text-zinc-950">
                        {formatCurrency(precioAplicado)}
                      </div>
                      {p.precio_oferta && (
                        <span className="text-[9px] font-mono line-through text-zinc-400 block">
                          {formatCurrency(p.precio_venta)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={agotado}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        agotado
                          ? 'bg-zinc-100 text-zinc-300'
                          : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-2xs group-hover:scale-110 active:scale-95'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
