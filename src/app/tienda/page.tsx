'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Eye, ShoppingCart, UserCheck, RefreshCw, Boxes } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { Producto, Categoria } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    cartOpen,
    setCartOpen,
  } = useCart();

  const [quickViewProducto, setQuickViewProducto] = useState<Producto | null>(null);

  // Marcas comunes en barbería y tattoo
  const marcas = ['Wahl', 'BaBylissPRO', 'Andis', 'JRL', 'Dynamic', 'Galindo'];

  useEffect(() => {
    let isMounted = true;
    async function loadStoreData() {
      try {
        const [prodsRes, catsRes] = await Promise.all([
          supabase
            .from('productos')
            .select('*, categoria:categorias(*)')
            .eq('activo', true)
            .order('creado_en', { ascending: false }),
          supabase
            .from('categorias')
            .select('*')
            .eq('activo', true)
            .order('orden', { ascending: true }),
        ]);

        if (!isMounted) return;
        setProductos((prodsRes.data as unknown as Producto[]) || []);
        setCategorias((catsRes.data as Categoria[]) || []);
      } catch (err) {
        console.error('Error al cargar catálogo de tienda:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStoreData();
    return () => {
      isMounted = false;
    };
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideCat =
        categoriaSeleccionada === 'todas' || p.categoria_id === categoriaSeleccionada;

      const coincideMarca =
        marcaSeleccionada === 'todas' ||
        p.nombre.toLowerCase().includes(marcaSeleccionada.toLowerCase()) ||
        p.sku.toLowerCase().includes(marcaSeleccionada.toLowerCase());

      const coincideTexto =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.sku.toLowerCase().includes(busqueda.toLowerCase());

      return coincideCat && coincideMarca && coincideTexto;
    });
  }, [productos, categoriaSeleccionada, marcaSeleccionada, busqueda]);

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

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200 selection:text-black">
      <Navbar
        cartItemCount={cartItems.reduce((acc, i) => acc + i.cantidad, 0)}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Header de la Tienda */}
      <section className="py-12 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                Galindo Supply — Tienda Oficial
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight">
                Herramientas & Suministros
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 max-w-xl leading-relaxed">
                Distribución autorizada de máquinas profesionales, patilleras, repuestos y kits de aprendizaje.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <section className="py-10 flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Barra Lateral de Filtros */}
          <aside className="lg:w-64 shrink-0 space-y-5">
            {/* Categorías */}
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-3 block mb-2">
                Categorías
              </span>
              <button
                type="button"
                onClick={() => setCategoriaSeleccionada('todas')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  categoriaSeleccionada === 'todas'
                    ? 'bg-black text-white font-semibold'
                    : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                }`}
              >
                Todas las Categorías ({productos.length})
              </button>
              {categorias.map((cat) => {
                const count = productos.filter((p) => p.categoria_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      categoriaSeleccionada === cat.id
                        ? 'bg-black text-white font-semibold'
                        : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                    }`}
                  >
                    {cat.nombre} ({count})
                  </button>
                );
              })}
            </div>

            {/* Filtro rápido por Marca */}
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-1 block mb-1">
                Marcas
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMarcaSeleccionada('todas')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
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

          {/* Área de Productos */}
          <main className="flex-1 space-y-6">
            {/* Buscador en vivo */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar máquinas, agujas, tintas, repuestos por nombre o SKU..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-xs focus:border-black outline-none shadow-sm transition-colors"
              />
              {busqueda && (
                <span className="absolute right-3.5 top-3 text-[11px] font-mono text-zinc-400">
                  {productosFiltrados.length} resultado(s)
                </span>
              )}
            </div>

            {/* Grid de Productos o Estado Vacío */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-zinc-400" />
                <p className="text-xs text-zinc-400 font-mono">Cargando catálogo oficial...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-20 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3 px-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {productos.length === 0
                    ? 'Catálogo en Actualización'
                    : 'No se encontraron artículos con esos filtros'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  {productos.length === 0
                    ? 'Pronto estarán disponibles los productos en nuestra tienda oficial.'
                    : 'Prueba buscando con otros términos o seleccionando todas las categorías.'}
                </p>
                {(busqueda || categoriaSeleccionada !== 'todas' || marcaSeleccionada !== 'todas') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setCategoriaSeleccionada('todas');
                      setMarcaSeleccionada('todas');
                    }}
                    className="text-xs text-black font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {productosFiltrados.map((prod, index) => {
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
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      key={prod.id}
                      className="rounded-xl bg-white border border-zinc-200 overflow-hidden flex flex-col justify-between hover:border-zinc-400 hover:shadow-md transition-all group"
                    >
                      {/* Imagen con botón de vista rápida en hover */}
                      <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden border-b border-zinc-100 flex items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={prod.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 opacity-60">
                            <Boxes className="w-8 h-8" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Sin Foto</span>
                          </div>
                        )}

                        {/* Badges superiores */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          {prod.stock <= prod.stock_minimo && (
                            <span className="px-2 py-0.5 rounded bg-zinc-900/90 text-white text-[10px] font-mono">
                              Últimas {prod.stock} un.
                            </span>
                          )}
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
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            <span>{prod.sku}</span>
                            <span>Stock: {prod.stock}</span>
                          </div>
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

                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(prod, e)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Comprar</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </section>

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
