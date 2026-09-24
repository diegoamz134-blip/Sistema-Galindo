'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  ShoppingCart,
  RefreshCw,
  Boxes,
  ChevronDown,
  ArrowUp,
  Sparkles,
  X,
  SlidersHorizontal,
  ArrowRight,
  Tag,
  MapPin,
  AlertTriangle,
  Store,
  MessageCircle,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { Producto, Categoria } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { SEDES, SedeId } from '@/lib/constants';

interface CategoriaConConteo extends Categoria {
  conteoProductos?: number;
}

interface SugerenciasBusqueda {
  categorias: CategoriaConConteo[];
  productos: Producto[];
}

const PAGE_SIZE = 18; // Lote de productos por llamada a la base de datos (estilo Falabella)

// Función auxiliar para búsqueda inteligente con sinónimos (Tattoo = Tatuaje, etc.)
function getSearchFilter(term: string): string {
  const t = term.trim().toLowerCase();
  if (t.includes('tatu') || t.includes('tatto')) {
    return `nombre.ilike.%${term}%,nombre.ilike.%tattoo%,nombre.ilike.%tatuaje%,sku.ilike.%${term}%`;
  }
  if (t.includes('maquin') || t.includes('clipper')) {
    return `nombre.ilike.%${term}%,nombre.ilike.%clipper%,nombre.ilike.%maquina%,sku.ilike.%${term}%`;
  }
  if (t.includes('tinta') || t.includes('pigment')) {
    return `nombre.ilike.%${term}%,nombre.ilike.%tinta%,nombre.ilike.%dynamic%,sku.ilike.%${term}%`;
  }
  if (t.includes('tijer') || t.includes('navaj')) {
    return `nombre.ilike.%${term}%,nombre.ilike.%tijera%,nombre.ilike.%navaja%,sku.ilike.%${term}%`;
  }
  return `nombre.ilike.%${term}%,sku.ilike.%${term}%`;
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaConConteo[]>([]);
  const [totalProductos, setTotalProductos] = useState<number>(0);
  const [totalCatalogo, setTotalCatalogo] = useState<number>(0);
  const [page, setPage] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');
  const [debouncedBusqueda, setDebouncedBusqueda] = useState<string>('');

  // Estados para el desplegable de sugerencias y autocompletado (Estilo Falabella)
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [sugerencias, setSugerencias] = useState<SugerenciasBusqueda>({ categorias: [], productos: [] });
  const [isCargandoSugerencias, setIsCargandoSugerencias] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const requestIdRef = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    cartOpen,
    setCartOpen,
    sedeSeleccionada,
    setSedeSeleccionada,
  } = useCart();

  const sedeActual = SEDES[sedeSeleccionada] || SEDES['ica'];
  const otraSedeKey: SedeId = sedeSeleccionada === 'ica' ? 'huancayo' : 'ica';
  const otraSede = SEDES[otraSedeKey];

  const [quickViewProducto, setQuickViewProducto] = useState<Producto | null>(null);

  // Marcas comunes en barbería y tattoo
  const marcas = ['Wahl', 'BaBylissPRO', 'Andis', 'JRL', 'Dynamic', 'Galindo'];

  // Control de scroll para botón flotante "Volver arriba"
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Debounce inteligente para la búsqueda general (espera a que el usuario termine de tipear)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(busqueda.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Autocomplete en tiempo real: consulta categorías y productos sugeridos mientras escribe (estilo Falabella)
  useEffect(() => {
    const term = busqueda.trim().toLowerCase();
    if (term.length < 2) {
      setSugerencias({ categorias: [], productos: [] });
      setIsDropdownOpen(false);
      return;
    }

    let isMounted = true;
    setIsCargandoSugerencias(true);
    setIsDropdownOpen(true);

    const timer = setTimeout(async () => {
      try {
        const isTattoo = term.includes('tatu') || term.includes('tatto');
        const isBarber = term.includes('barber') || term.includes('corte') || term.includes('maquin');
        const isInk = term.includes('tinta') || term.includes('pigment');

        // 1. Categorías coincidentes
        const matchedCats = categorias
          .filter((c) => {
            const name = c.nombre.toLowerCase();
            if (name.includes(term)) return true;
            if (isTattoo && (name.includes('tattoo') || name.includes('tatuar') || name.includes('piercing'))) return true;
            if (isBarber && (name.includes('corte') || name.includes('patillera') || name.includes('afeitadora'))) return true;
            if (isInk && name.includes('tinta')) return true;
            return false;
          })
          .slice(0, 4);

        // 2. Productos sugeridos (Top 4 con foto, categoría y precio)
        const filter = getSearchFilter(term);
        let prodsQuery = supabase
          .from('productos')
          .select('id, sku, nombre, precio_venta, precio_oferta, stock, stock_ica, stock_huancayo, stock_minimo, imagenes, categoria_id, categoria:categorias(nombre)')
          .eq('activo', true)
          .or(filter);

        if (sedeSeleccionada === 'huancayo') {
          prodsQuery = prodsQuery.gt('stock_huancayo', 0);
        } else {
          prodsQuery = prodsQuery.gt('stock_ica', 0);
        }

        const { data: prodsData } = await prodsQuery
          .order('creado_en', { ascending: false })
          .limit(4);

        if (!isMounted) return;

        setSugerencias({
          categorias: matchedCats,
          productos: (prodsData as unknown as Producto[]) || [],
        });
      } catch (err) {
        console.error('Error al consultar sugerencias de búsqueda:', err);
      } finally {
        if (!isMounted) return;
        setIsCargandoSugerencias(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [busqueda, categorias, sedeSeleccionada]);

  // 1. Cargar lista de categorías con su conteo oficial
  useEffect(() => {
    async function loadCategorias() {
      try {
        const { data, error } = await supabase
          .from('categorias')
          .select('id, nombre, slug, orden, activo, productos(count)')
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (error) {
          console.error('Error al cargar categorías:', error.message || error);
          return;
        }

        let sumaTotal = 0;
        const mappedCats: CategoriaConConteo[] = (data || []).map((cat: any) => {
          const count = Array.isArray(cat.productos) && cat.productos[0]?.count
            ? Number(cat.productos[0].count)
            : 0;
          sumaTotal += count;
          return {
            id: cat.id,
            nombre: cat.nombre,
            slug: cat.slug,
            orden: cat.orden,
            activo: cat.activo,
            conteoProductos: count,
          };
        });

        setCategorias(mappedCats);
        setTotalCatalogo(sumaTotal);
      } catch (err) {
        console.error('Error al inicializar categorías de tienda:', err);
      }
    }

    loadCategorias();
  }, []);

  // 2. Función para pedir productos por lotes (Buscador inteligente y Paginación bajo demanda)
  const fetchProductsBatch = async (
    pageNum: number,
    cat: string,
    marca: string,
    queryText: string,
    isAppend: boolean = false
  ) => {
    const currentRequestId = ++requestIdRef.current;

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      let query = supabase
        .from('productos')
        .select('*, categoria:categorias(*)', { count: 'exact' })
        .eq('activo', true);

      // Filtro estricto por Sede: Solo mostrar productos disponibles físicamente en la sede seleccionada
      if (sedeSeleccionada === 'huancayo') {
        query = query.gt('stock_huancayo', 0);
      } else {
        query = query.gt('stock_ica', 0);
      }

      // Filtro por Categoría
      if (cat !== 'todas') {
        query = query.eq('categoria_id', cat);
      }

      // Filtro por Marca
      if (marca !== 'todas') {
        query = query.or(`nombre.ilike.%${marca}%,sku.ilike.%${marca}%`);
      }

      // Buscador inteligente con sinónimos (solo filtra si tiene >= 2 caracteres)
      if (queryText.length >= 2) {
        query = query.or(getSearchFilter(queryText));
      }

      // Rango de la página solicitada (18 items)
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('creado_en', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error al consultar lote de productos de Supabase:', error.message || error);
        return;
      }

      if (currentRequestId !== requestIdRef.current) return;

      const newItems = (data as unknown as Producto[]) || [];

      if (isAppend) {
        setProductos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNewItems = newItems.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setProductos(newItems);
      }

      setTotalProductos(count || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Error al procesar consulta de tienda:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 3. Efecto al cambiar de categoría, marca, texto de búsqueda o sede seleccionada
  useEffect(() => {
    setPage(0);
    fetchProductsBatch(0, categoriaSeleccionada, marcaSeleccionada, debouncedBusqueda, false);
  }, [categoriaSeleccionada, marcaSeleccionada, debouncedBusqueda, sedeSeleccionada]);

  // Manejador del botón "Cargar más productos"
  const handleCargarMas = () => {
    if (isLoadingMore || productos.length >= totalProductos) return;
    fetchProductsBatch(page + 1, categoriaSeleccionada, marcaSeleccionada, debouncedBusqueda, true);
  };

  const hasMore = productos.length < totalProductos;
  const porcentajeProgreso = totalProductos > 0
    ? Math.min(100, Math.round((productos.length / totalProductos) * 100))
    : 0;

  const hayFiltrosActivos =
    categoriaSeleccionada !== 'todas' ||
    marcaSeleccionada !== 'todas' ||
    debouncedBusqueda.length >= 2;

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setDebouncedBusqueda('');
    setCategoriaSeleccionada('todas');
    setMarcaSeleccionada('todas');
    setIsDropdownOpen(false);
  };

  const handleAddToCart = (
    producto: Producto,
    origin?: React.MouseEvent | { x: number; y: number }
  ) => {
    let coords: { x: number; y: number } | undefined;
    if (origin) {
      if ('clientX' in origin) {
        coords = { x: origin.clientX, y: origin.clientY };
      } else {
        coords = origin;
      }
    }
    addToCart(producto, false, coords);
  };

  const handleUpdateQuantity = (productoId: string, delta: number) => {
    updateQuantity(productoId, delta);
  };

  const handleRemoveFromCart = (productoId: string) => {
    removeFromCart(productoId);
  };

  const categoriaActualObj = categorias.find((c) => c.id === categoriaSeleccionada);

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200 selection:text-black">
      <Navbar
        cartItemCount={cartItems.reduce((acc, i) => acc + i.cantidad, 0)}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Header de la Tienda */}
      <section className="py-10 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1">
              Galindo Supply — Tienda Oficial
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight">
              Herramientas & Suministros
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-xl leading-relaxed">
              Distribución autorizada de máquinas profesionales, patilleras, repuestos y kits de aprendizaje en Ica y Huancayo.
            </p>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <section className="py-8 flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* BARRA LATERAL STICKY (Acompaña el scroll con espacio holgado y separación elegante del header) */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-36 lg:self-start">
            
            {/* 1. Categorías (Limpio, con buen espaciado y sin barras de desplazamiento apretadas) */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-1 block mb-2 font-semibold">
                Categorías
              </span>
              <button
                type="button"
                onClick={() => setCategoriaSeleccionada('todas')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  categoriaSeleccionada === 'todas'
                    ? 'bg-black text-white font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                }`}
              >
                <span>Todas las Categorías</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  categoriaSeleccionada === 'todas' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {totalCatalogo || totalProductos}
                </span>
              </button>
              
              <div className="space-y-1 pt-1">
                {categorias.map((cat) => {
                  const count = cat.conteoProductos ?? 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaSeleccionada(cat.id)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        categoriaSeleccionada === cat.id
                          ? 'bg-black text-white font-semibold shadow-xs'
                          : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                      }`}
                    >
                      <span className="truncate pr-2">{cat.nombre}</span>
                      <span className={`text-[10px] font-mono shrink-0 px-2 py-0.5 rounded-full ${
                        categoriaSeleccionada === cat.id ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Filtro rápido por Marca */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs space-y-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-1 block font-semibold">
                Marcas Oficiales
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMarcaSeleccionada('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    marcaSeleccionada === 'todas'
                      ? 'bg-black text-white font-bold'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Todas
                </button>
                {marcas.map((marca) => (
                  <button
                    key={marca}
                    type="button"
                    onClick={() => setMarcaSeleccionada(marca)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      marcaSeleccionada === marca
                        ? 'bg-black text-white font-bold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {marca}
                  </button>
                ))}
              </div>
            </div>

          </aside>

          {/* Área Principal de Productos */}
          <main className="flex-1 w-full space-y-5">

            {/* BUSCADOR INTELIGENTE AMPLIO CON SUGERENCIAS DESPLEGABLES (Estilo Falabella) */}
            <div ref={searchContainerRef} className="relative w-full z-30">
              <div className="relative">
                <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar máquina, tinta, tatuaje, agujas, SKU..."
                  value={busqueda}
                  onFocus={() => {
                    if (busqueda.trim().length >= 2) setIsDropdownOpen(true);
                  }}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsDropdownOpen(false);
                    }
                  }}
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white border border-zinc-200 text-zinc-950 text-sm shadow-xs focus:border-black focus:ring-4 focus:ring-zinc-100 outline-none transition-all placeholder:text-zinc-400 font-medium"
                />

                {busqueda && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setIsDropdownOpen(false);
                    }}
                    className="absolute right-4 top-3.5 text-zinc-400 hover:text-black transition-colors cursor-pointer p-0.5 rounded-md hover:bg-zinc-100"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* MENÚ DESPLEGABLE DE SUGERENCIAS Y REFERENCIAS (Estilo Falabella) */}
              <AnimatePresence>
                {isDropdownOpen && busqueda.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.99 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden z-50 divide-y divide-zinc-100"
                  >
                    {isCargandoSugerencias ? (
                      <div className="p-6 text-center text-xs text-zinc-400 font-mono flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                        <span>Buscando sugerencias para &ldquo;{busqueda}&rdquo;...</span>
                      </div>
                    ) : (
                      <>
                        {/* 1. Categorías Relacionadas (Ej: tatuaje en Máquinas de Tatuar) */}
                        {sugerencias.categorias.length > 0 && (
                          <div className="p-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 block mb-1.5 font-semibold">
                              Categorías sugeridas
                            </span>
                            <div className="space-y-0.5">
                              {sugerencias.categorias.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setCategoriaSeleccionada(cat.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-zinc-700 hover:text-black hover:bg-zinc-50 flex items-center gap-2 cursor-pointer transition-colors group"
                                >
                                  <Tag className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black" />
                                  <span className="font-semibold text-zinc-950">{busqueda}</span>
                                  <span className="text-zinc-400 font-mono text-[11px]">en</span>
                                  <span className="font-medium text-black bg-zinc-100 px-2 py-0.5 rounded text-[11px] group-hover:bg-zinc-200">
                                    {cat.nombre}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-400 ml-auto">
                                    {cat.conteoProductos ?? 0} prods
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Referencias de Productos Coincidentes con Miniatura y Precio */}
                        {sugerencias.productos.length > 0 ? (
                          <div className="p-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 block mb-1.5 font-semibold">
                              Productos sugeridos
                            </span>
                            <div className="space-y-1">
                              {sugerencias.productos.map((prod) => (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => {
                                    setQuickViewProducto(prod);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-50 flex items-center gap-3 cursor-pointer transition-colors group"
                                >
                                  <div className="w-12 h-12 rounded-lg bg-zinc-100 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-100">
                                    {prod.imagenes && prod.imagenes[0] ? (
                                      <img
                                        src={prod.imagenes[0]}
                                        alt={prod.nombre}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    ) : (
                                      <Boxes className="w-5 h-5 text-zinc-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs text-zinc-950 truncate group-hover:text-black">
                                      {prod.nombre}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                      <span>SKU: {prod.sku}</span>
                                      {prod.categoria && (
                                        <span className="text-zinc-400 truncate">• {prod.categoria.nombre}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-bold font-mono text-zinc-950 block">
                                      {formatCurrency(prod.precio_oferta || prod.precio_venta)}
                                    </span>
                                    {(() => {
                                      const stockEnSede = sedeSeleccionada === 'ica' ? (prod.stock_ica ?? prod.stock) : (prod.stock_huancayo ?? 0);
                                      return (
                                        <span className={`text-[10px] font-mono block ${stockEnSede > 0 ? 'text-zinc-500' : 'text-amber-600 font-bold'}`}>
                                          {stockEnSede > 0 ? `Stock ${sedeActual.ciudad}: ${stockEnSede}` : `Agotado en ${sedeActual.ciudad}`}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : sugerencias.categorias.length === 0 ? (
                          <div className="p-6 text-center space-y-1">
                            <p className="text-xs font-semibold text-zinc-800">
                              No hay referencias directas para &ldquo;{busqueda}&rdquo;
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              Presiona Enter para buscar en todo el catálogo de suministros.
                            </p>
                          </div>
                        ) : null}

                        {/* Pie del Desplegable: Ver todos los resultados */}
                        <div className="p-3 bg-zinc-50 text-center">
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(false)}
                            className="text-xs font-semibold text-black hover:underline cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>Ver todos los resultados para &ldquo;{busqueda}&rdquo;</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Barra de Filtros Activos y Conteo */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filtros:</span>
                </div>

                {categoriaSeleccionada !== 'todas' && categoriaActualObj && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-zinc-300 text-xs font-medium text-zinc-800 shadow-2xs">
                    Cat: {categoriaActualObj.nombre}
                    <button
                      type="button"
                      onClick={() => setCategoriaSeleccionada('todas')}
                      className="text-zinc-400 hover:text-black cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {marcaSeleccionada !== 'todas' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-zinc-300 text-xs font-medium text-zinc-800 shadow-2xs">
                    Marca: {marcaSeleccionada}
                    <button
                      type="button"
                      onClick={() => setMarcaSeleccionada('todas')}
                      className="text-zinc-400 hover:text-black cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {debouncedBusqueda.length >= 2 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-zinc-300 text-xs font-medium text-zinc-800 shadow-2xs">
                    Buscar: &ldquo;{debouncedBusqueda}&rdquo;
                    <button
                      type="button"
                      onClick={() => {
                        setBusqueda('');
                        setDebouncedBusqueda('');
                      }}
                      className="text-zinc-400 hover:text-black cursor-pointer ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {!hayFiltrosActivos && (
                  <span className="text-xs text-zinc-400 font-mono">
                    Todos los productos
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-600 font-semibold">
                  {totalProductos} {totalProductos === 1 ? 'producto' : 'productos'}
                </span>
                {hayFiltrosActivos && (
                  <button
                    type="button"
                    onClick={handleLimpiarFiltros}
                    className="text-[11px] text-zinc-500 hover:text-black underline cursor-pointer"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            </div>

            {/* Grid de Productos o Estado Vacío o Skeleton */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white border border-zinc-200 overflow-hidden animate-pulse flex flex-col justify-between h-[360px]"
                  >
                    <div className="aspect-square bg-zinc-100 w-full" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-zinc-100 rounded w-1/3" />
                      <div className="h-4 bg-zinc-200 rounded w-3/4" />
                      <div className="h-3 bg-zinc-100 rounded w-full" />
                      <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                        <div className="h-5 bg-zinc-200 rounded w-16" />
                        <div className="h-8 bg-zinc-200 rounded w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productos.length === 0 ? (
              sedeSeleccionada === 'huancayo' && !hayFiltrosActivos ? (
                <div className="text-center py-16 bg-zinc-50 border border-zinc-200 rounded-3xl space-y-4 px-6 max-w-xl mx-auto my-6 shadow-2xs">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                    <Boxes className="w-7 h-7 text-amber-600" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-700" />
                      <span>Sede Huancayo — Jr. Guido 654</span>
                    </span>
                    <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">
                      Sin Stock Físico Inmediato en Huancayo
                    </h3>
                    <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                      Actualmente el inventario de suministros y máquinas se encuentra en nuestro almacén central de Ica. Puedes cambiar a Sede Ica para comprar con envíos y delivery a todo el Perú, o consultar por WhatsApp.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSedeSeleccionada('ica')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      <span>Ver Catálogo en Sede Ica</span>
                    </button>
                    <a
                      href={`https://wa.me/${sedeActual.whatsapp}?text=${encodeURIComponent(
                        'Hola Galindo Barber Supply (Sede Huancayo). Deseo consultar por disponibilidad y encargo de productos para recoger en Jr. Guido 654.'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Consultar por WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 px-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {totalCatalogo === 0
                      ? 'Catálogo en Actualización'
                      : 'No se encontraron artículos con esos filtros'}
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    {totalCatalogo === 0
                      ? 'Pronto estarán disponibles los productos en nuestra tienda oficial.'
                      : 'Prueba buscando con otros términos o seleccionando todas las categorías.'}
                  </p>
                  {hayFiltrosActivos && (
                    <button
                      type="button"
                      onClick={handleLimpiarFiltros}
                      className="text-xs text-black font-semibold underline underline-offset-4 cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              )
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {productos.map((prod, index) => {
                    const precioMostrar = prod.precio_oferta || prod.precio_venta;

                    const img =
                      prod.imagenes && prod.imagenes.length > 0
                        ? prod.imagenes[0]
                        : null;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: (index % PAGE_SIZE) * 0.03 }}
                        key={`${prod.id}-${index}`}
                        className="rounded-xl bg-white border border-zinc-200 overflow-hidden flex flex-col justify-between hover:border-zinc-400 hover:shadow-md transition-all group"
                      >
                        {/* Imagen con botón de vista rápida en hover */}
                        <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden border-b border-zinc-100 flex items-center justify-center">
                          {img ? (
                            <img
                              src={img}
                              alt={prod.nombre}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 opacity-60">
                              <Boxes className="w-8 h-8" />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Sin Foto</span>
                            </div>
                          )}

                          {/* Badges superiores */}
                          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                            {(() => {
                              const stockEnSede = sedeSeleccionada === 'ica' ? (prod.stock_ica ?? prod.stock) : (prod.stock_huancayo ?? 0);
                              if (stockEnSede <= 0) {
                                return (
                                  <span className="px-2 py-0.5 rounded bg-zinc-950/90 text-amber-300 text-[10px] font-mono shadow-sm flex items-center gap-1 border border-amber-400/30">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                    Agotado en {sedeActual.ciudad}
                                  </span>
                                );
                              }
                              if (stockEnSede <= prod.stock_minimo) {
                                return (
                                  <span className="px-2 py-0.5 rounded bg-zinc-900/90 text-white text-[10px] font-mono">
                                    Últimas {stockEnSede} un. en {sedeActual.ciudad}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {prod.precio_oferta && prod.precio_oferta < prod.precio_venta && (
                              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono shadow-sm">
                                Oferta
                              </span>
                            )}
                          </div>

                          {/* Botón flotante de Vista Rápida */}
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <button
                              type="button"
                              onClick={() => setQuickViewProducto(prod)}
                              className="pointer-events-auto px-3.5 py-1.5 rounded-lg bg-white/95 text-zinc-950 font-semibold text-xs shadow-lg hover:bg-white flex items-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Detalles</span>
                            </button>
                          </div>
                        </div>

                        {/* Info del Producto */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div>
                            {(() => {
                              const stockEnSede = sedeSeleccionada === 'ica' ? (prod.stock_ica ?? prod.stock) : (prod.stock_huancayo ?? 0);
                              const stockOtraSede = sedeSeleccionada === 'ica' ? (prod.stock_huancayo ?? 0) : (prod.stock_ica ?? prod.stock);
                              return (
                                <>
                                  <div className="flex items-center justify-between text-[10px] font-mono">
                                    <span className="text-zinc-400">{prod.sku}</span>
                                    <span className={stockEnSede > 0 ? 'text-zinc-600 font-semibold' : 'text-amber-600 font-bold'}>
                                      {stockEnSede > 0 ? `Stock ${sedeActual.ciudad}: ${stockEnSede}` : `Agotado en ${sedeActual.ciudad}`}
                                    </span>
                                  </div>
                                  {stockEnSede <= 0 && stockOtraSede > 0 && (
                                    <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <span>✓ Disp. en Sede {otraSede.ciudad} ({stockOtraSede} un.)</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <h3 className="text-xs font-semibold text-zinc-950 mt-1 line-clamp-2">
                              {prod.nombre}
                            </h3>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                              {prod.descripcion}
                            </p>
                          </div>

                          {/* Precios y Botón Añadir */}
                          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-zinc-400 block">
                                Precio
                              </span>
                              <span className="text-sm font-bold text-zinc-950 font-mono">
                                {formatCurrency(precioMostrar)}
                              </span>
                              {prod.precio_oferta && prod.precio_oferta < prod.precio_venta && (
                                <span className="text-[10px] text-zinc-400 line-through block">
                                  Reg: {formatCurrency(prod.precio_venta)}
                                </span>
                              )}
                            </div>

                            {(() => {
                              const stockEnSede = sedeSeleccionada === 'ica' ? (prod.stock_ica ?? prod.stock) : (prod.stock_huancayo ?? 0);
                              if (stockEnSede > 0) {
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => handleAddToCart(prod, e)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>Comprar</span>
                                  </button>
                                );
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() => setQuickViewProducto(prod)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black border border-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                                  title={`Agotado en Sede ${sedeActual.ciudad}. Clic para ver detalles.`}
                                >
                                  <span>Agotado</span>
                                  <span className="text-[9px] text-zinc-400">({sedeActual.ciudad})</span>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Sección de Carga Progresiva / Paginación Falabella Style */}
                <div className="pt-10 pb-6 flex flex-col items-center justify-center space-y-4">
                  {/* Barra de Progreso y Contador */}
                  <div className="w-full max-w-xs space-y-2 text-center">
                    <p className="text-xs text-zinc-500 font-mono">
                      Mostrando <span className="font-bold text-zinc-950">{productos.length}</span> de{' '}
                      <span className="font-bold text-zinc-950">{totalProductos}</span> productos
                    </p>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                      <motion.div
                        className="h-full bg-zinc-950 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${porcentajeProgreso}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Botón Cargar Más Productos */}
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={handleCargarMas}
                      disabled={isLoadingMore}
                      className="px-6 py-3 rounded-xl bg-black text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 disabled:pointer-events-none group"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Consultando siguientes productos...</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                          <span>Cargar más productos</span>
                        </>
                      )}
                    </button>
                  ) : totalProductos > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono pt-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Has visto todo el catálogo disponible ({totalProductos} productos)</span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </main>
        </div>
      </section>

      {/* Botón flotante para Volver Arriba */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-black text-white shadow-xl hover:bg-zinc-800 transition-all cursor-pointer active:scale-90"
            title="Volver arriba"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer animado con Framer Motion */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        producto={quickViewProducto}
        onClose={() => setQuickViewProducto(null)}
        onAddToCart={handleAddToCart}
      />

      <Footer />
    </div>
  );
}
