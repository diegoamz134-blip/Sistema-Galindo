'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Barcode,
  Package,
  X,
  Check,
  Plus,
  Store,
  Tag,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { SedeId, SEDES } from '@/lib/constants';

interface POSProductCatalogProps {
  productos: Producto[];
  sedeId?: SedeId;
  isLoading?: boolean;
  onAddToCart: (producto: Producto) => void;
}

const BATCH_SIZE = 24; // Carga progresiva en lotes para máxima fluidez y velocidad en el mostrador

// Función inteligente de coincidencia con sinónimos (Tattoo = Tatuaje, Maquina = Clipper, etc.)
function matchesSmartSearch(producto: Producto, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase().trim();
  const nombre = (producto.nombre || '').toLowerCase();
  const sku = (producto.sku || '').toLowerCase();
  const cat = (producto.categoria?.nombre || '').toLowerCase();
  const desc = (producto.descripcion || '').toLowerCase();

  // Coincidencia directa
  if (nombre.includes(t) || sku.includes(t) || cat.includes(t) || desc.includes(t)) {
    return true;
  }

  // Sinónimos de Barbería, Peluquería y Tattoo
  if (t.includes('tatu') || t.includes('tatto')) {
    if (
      nombre.includes('tattoo') ||
      nombre.includes('tatuaje') ||
      cat.includes('tattoo') ||
      cat.includes('tatuaje')
    )
      return true;
  }
  if (t.includes('maquin') || t.includes('clipper') || t.includes('trimmer')) {
    if (
      nombre.includes('máquina') ||
      nombre.includes('maquina') ||
      nombre.includes('clipper') ||
      nombre.includes('trimmer') ||
      nombre.includes('wahl') ||
      nombre.includes('babyliss') ||
      nombre.includes('jrl') ||
      nombre.includes('andis')
    )
      return true;
  }
  if (t.includes('tinta') || t.includes('pigment')) {
    if (
      nombre.includes('tinta') ||
      nombre.includes('pigmento') ||
      nombre.includes('dynamic') ||
      cat.includes('tinta')
    )
      return true;
  }
  if (t.includes('tijer') || t.includes('navaj')) {
    if (
      nombre.includes('tijera') ||
      nombre.includes('navaja') ||
      nombre.includes('navajin') ||
      nombre.includes('shavette') ||
      cat.includes('tijera')
    )
      return true;
  }
  if (t.includes('aguja') || t.includes('cartuch')) {
    if (
      nombre.includes('aguja') ||
      nombre.includes('cartucho') ||
      cat.includes('aguja') ||
      cat.includes('cartucho')
    )
      return true;
  }

  return false;
}

export function POSProductCatalog({
  productos,
  sedeId = 'ica',
  isLoading = false,
  onAddToCart,
}: POSProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('TODAS');
  const [productoAgregadoId, setProductoAgregadoId] = useState<string | null>(null);
  const [limiteVisible, setLimiteVisible] = useState(BATCH_SIZE);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar el desplegable de sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce rápido para que escribir o usar el lector de barras sea 100% fluido sin lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 120);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrado estricto por sede activa:
  // Si estamos en Huancayo, SOLO se muestran productos con stock_huancayo > 0.
  // Si estamos en Ica, SOLO productos con stock_ica > 0 (o stock general > 0).
  const productosDeSede = useMemo(() => {
    return productos.filter((p) => {
      const stockEnSede =
        sedeId === 'huancayo'
          ? (p.stock_huancayo ?? 0)
          : (p.stock_ica ?? p.stock ?? 0);
      return stockEnSede > 0;
    });
  }, [productos, sedeId]);

  // Extraer categorías únicas disponibles EXCLUSIVAMENTE para la sede activa
  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    productosDeSede.forEach((p) => {
      if (p.categoria?.id && p.categoria?.nombre) {
        map.set(p.categoria.id, p.categoria.nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [productosDeSede]);

  // Si la categoría seleccionada no existe en esta sede, volver a TODAS
  useEffect(() => {
    if (
      categoriaSeleccionada !== 'TODAS' &&
      !categorias.some((c) => c.id === categoriaSeleccionada)
    ) {
      setCategoriaSeleccionada('TODAS');
    }
  }, [categorias, categoriaSeleccionada]);

  // Sugerencias de Categorías en el Autocomplete desplegable (Estilo Tienda / Falabella)
  const sugerenciasCategorias = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.trim().toLowerCase();
    return categorias
      .filter((c) => {
        const matchCatName = c.nombre.toLowerCase().includes(term);
        const matchProdsInCat = productosDeSede.some(
          (p) => p.categoria_id === c.id && matchesSmartSearch(p, term)
        );
        return matchCatName || matchProdsInCat;
      })
      .slice(0, 3)
      .map((c) => ({
        ...c,
        count: productosDeSede.filter(
          (p) => p.categoria_id === c.id && matchesSmartSearch(p, term)
        ).length,
      }));
  }, [categorias, productosDeSede, searchTerm]);

  // Sugerencias de Productos en el Autocomplete desplegable
  const sugerenciasProductos = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    return productosDeSede
      .filter((p) => matchesSmartSearch(p, searchTerm))
      .slice(0, 6);
  }, [productosDeSede, searchTerm]);

  // Filtrado por búsqueda inteligente y categoría en el catálogo principal
  const productosFiltrados = useMemo(() => {
    return productosDeSede.filter((p) => {
      const matchCategoria =
        categoriaSeleccionada === 'TODAS' || p.categoria_id === categoriaSeleccionada;

      if (!debouncedSearch) return matchCategoria;

      return matchCategoria && matchesSmartSearch(p, debouncedSearch);
    });
  }, [productosDeSede, debouncedSearch, categoriaSeleccionada]);

  // Reiniciar límite de carga progresiva cuando cambian los filtros
  useEffect(() => {
    setLimiteVisible(BATCH_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [debouncedSearch, categoriaSeleccionada, sedeId]);

  // Productos visibles en el lote actual (Lazy rendering)
  const productosVisibles = useMemo(() => {
    return productosFiltrados.slice(0, limiteVisible);
  }, [productosFiltrados, limiteVisible]);

  // Scroll infinito inteligente: al acercarse al final, carga el siguiente lote
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + clientHeight) < 260) {
      if (limiteVisible < productosFiltrados.length) {
        setLimiteVisible((prev) => Math.min(prev + BATCH_SIZE, productosFiltrados.length));
      }
    }
  };

  const handleItemClick = (p: Producto) => {
    const stockEnSede =
      sedeId === 'huancayo' ? (p.stock_huancayo ?? 0) : (p.stock_ica ?? p.stock ?? 0);
    if (stockEnSede <= 0) return;
    onAddToCart(p);
    setProductoAgregadoId(p.id);
    setTimeout(() => setProductoAgregadoId(null), 600);
  };

  const sedeActual = SEDES[sedeId] || SEDES['ica'];

  return (
    <div className="flex flex-col h-full space-y-3.5">
      {/* Barra de Búsqueda y Filtros de Categoría */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs space-y-3 relative z-30">
        {/* Input Buscador con Soporte para Lector de Código de Barras y Autocomplete */}
        <div ref={searchContainerRef} className="relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onFocus={() => {
                if (searchTerm.trim().length >= 2) setIsDropdownOpen(true);
              }}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.trim().length >= 2) {
                  setIsDropdownOpen(true);
                } else {
                  setIsDropdownOpen(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsDropdownOpen(false);
                  // Si el término coincide con un SKU exactamente (lector de barras), agregarlo directamente
                  const matchSku = productosDeSede.find(
                    (p) => p.sku.toLowerCase() === searchTerm.trim().toLowerCase()
                  );
                  if (matchSku) {
                    handleItemClick(matchSku);
                    setSearchTerm('');
                  }
                }
              }}
              placeholder={`Buscar máquina, tinta, tatuaje, agujas, SKU en Sede ${sedeActual.ciudad}...`}
              className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 text-sm font-medium focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all placeholder:text-zinc-400"
              autoFocus
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setIsDropdownOpen(false);
                  }}
                  className="p-1 text-zinc-400 hover:text-black rounded-md cursor-pointer"
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

          {/* Menú Desplegable de Sugerencias y Autocompletado (Estilo Tienda / Falabella) */}
          <AnimatePresence>
            {isDropdownOpen && searchTerm.trim().length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden z-50 divide-y divide-zinc-100 max-h-[420px] overflow-y-auto"
              >
                {/* 1. Categorías Sugeridas */}
                {sugerenciasCategorias.length > 0 && (
                  <div className="p-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 block mb-1 font-semibold">
                      Categorías sugeridas
                    </span>
                    <div className="space-y-0.5">
                      {sugerenciasCategorias.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoriaSeleccionada(cat.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-zinc-700 hover:text-black hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors group"
                        >
                          <Tag className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black" />
                          <span className="font-semibold text-zinc-950">{searchTerm}</span>
                          <span className="text-zinc-400 font-mono text-[11px]">en</span>
                          <span className="font-bold text-black bg-zinc-100 px-2 py-0.5 rounded text-[11px] group-hover:bg-zinc-200">
                            {cat.nombre}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 ml-auto">
                            {cat.count} artículos
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Productos Sugeridos con Agregado Rápido al Ticket */}
                {sugerenciasProductos.length > 0 ? (
                  <div className="p-2.5">
                    <div className="flex items-center justify-between px-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                        Productos sugeridos en {sedeActual.ciudad}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Clic para agregar al ticket
                      </span>
                    </div>
                    <div className="space-y-1">
                      {sugerenciasProductos.map((prod) => {
                        const stockEnSede =
                          sedeId === 'huancayo'
                            ? (prod.stock_huancayo ?? 0)
                            : (prod.stock_ica ?? prod.stock ?? 0);
                        const precioAplicado = prod.precio_oferta || prod.precio_venta;

                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              handleItemClick(prod);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-zinc-50 flex items-center justify-between gap-3 cursor-pointer transition-colors group border border-transparent hover:border-zinc-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden flex items-center justify-center">
                                {prod.imagenes && prod.imagenes.length > 0 ? (
                                  <img
                                    src={prod.imagenes[0]}
                                    alt={prod.nombre}
                                    className="w-full h-full object-contain p-1"
                                    loading="lazy"
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-zinc-900 group-hover:text-black truncate">
                                  {prod.nombre}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                                  <span>SKU: {prod.sku}</span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Stock: {stockEnSede} un.
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="font-mono font-black text-xs text-zinc-950">
                                {formatCurrency(precioAplicado)}
                              </span>
                              <button
                                type="button"
                                className="w-6 h-6 rounded-lg bg-zinc-950 text-white flex items-center justify-center hover:bg-zinc-800 transition-all shadow-2xs group-hover:scale-105 active:scale-95 cursor-pointer"
                                title="Agregar al ticket"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    No hay productos que coincidan con &ldquo;{searchTerm}&rdquo; en Sede {sedeActual.ciudad}
                  </div>
                )}

                {/* Footer del Desplegable */}
                <div className="p-2.5 bg-zinc-50 text-[11px] text-zinc-500 flex items-center justify-between">
                  <span>
                    Presiona <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded font-mono text-[10px] text-zinc-800 shadow-2xs">Enter</kbd> para filtrar todo el catálogo
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="font-bold text-zinc-800 hover:text-black cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Píldoras de Categorías (solo con productos en esta sede) */}
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
            Todos ({productosDeSede.length})
          </button>
          {categorias.map((cat) => {
            const count = productosDeSede.filter((p) => p.categoria_id === cat.id).length;
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
                <span
                  className={`text-[10px] font-mono ${activa ? 'text-zinc-300' : 'text-zinc-400'}`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Productos con Scroll Infinito */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-1"
      >
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
        ) : productosDeSede.length === 0 ? (
          /* Estado Vacío cuando la sede no tiene stock físico cargado */
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-6 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Store className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-black text-zinc-950 text-base">
                Sin stock físico en Sede {sedeActual.ciudad}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {sedeId === 'huancayo'
                  ? 'Actualmente no hay productos con inventario registrado en Jr. Guido 654 (Huancayo). Los productos solo aparecerán aquí cuando tengan unidades asignadas a esta sede.'
                  : 'No se encontraron productos activos con stock físico en Sede Ica.'}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <a
                href="/admin/inventario"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Ir a Inventario y Traspasos</span>
              </a>
            </div>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">No se encontraron productos</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Intenta con otra palabra clave o selecciona otra categoría en Sede {sedeActual.ciudad}.
              </p>
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 cursor-pointer"
              >
                Limpiar Búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {productosVisibles.map((p) => {
              const stockEnSede =
                sedeId === 'huancayo' ? (p.stock_huancayo ?? 0) : (p.stock_ica ?? p.stock ?? 0);
              const bajoStock = stockEnSede > 0 && stockEnSede <= (p.stock_minimo || 3);
              const precioAplicado = p.precio_oferta || p.precio_venta;
              const recientementeAgregado = productoAgregadoId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => handleItemClick(p)}
                  className="group relative rounded-2xl border border-zinc-200 hover:border-black hover:shadow-md bg-white p-3 flex flex-col justify-between transition-all select-none cursor-pointer active:scale-[0.98]"
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
                        decoding="async"
                      />
                    ) : (
                      <div className="text-zinc-300 flex flex-col items-center gap-1">
                        <Package className="w-8 h-8" />
                        <span className="text-[9px] font-mono">Sin foto</span>
                      </div>
                    )}

                    {/* Badge de Stock flotante de la sede */}
                    <div className="absolute top-1.5 right-1.5">
                      {bajoStock ? (
                        <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          Stock: {stockEnSede}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full shadow-2xs">
                          {stockEnSede} un.
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
                      className="w-7 h-7 rounded-xl flex items-center justify-center transition-all bg-zinc-950 text-white hover:bg-zinc-800 shadow-2xs group-hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Botón e Indicador de Carga Progresiva / Lazy Loading */}
            {limiteVisible < productosFiltrados.length && (
              <div className="col-span-full py-4 flex flex-col items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setLimiteVisible((prev) => Math.min(prev + BATCH_SIZE, productosFiltrados.length))
                  }
                  className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Cargar más artículos</span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    ({productosVisibles.length} de {productosFiltrados.length})
                  </span>
                </button>
                <span className="text-[10px] text-zinc-400">
                  Desplaza hacia abajo para cargar automáticamente
                </span>
              </div>
            )}

            {productosFiltrados.length > BATCH_SIZE && limiteVisible >= productosFiltrados.length && (
              <div className="col-span-full py-3 text-center text-[11px] font-mono text-zinc-400">
                ✓ Todos los productos cargados ({productosFiltrados.length})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
