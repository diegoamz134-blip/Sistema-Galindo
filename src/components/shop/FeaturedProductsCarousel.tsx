'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingCart,
  Check,
  Pause,
  Play,
  ArrowRight,
  Sparkles,
  Boxes,
} from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface FeaturedProductsCarouselProps {
  productos: Producto[];
  onAddToCart: (producto: Producto, coords?: { x: number; y: number }) => void;
  onQuickView: (producto: Producto) => void;
}

export function FeaturedProductsCarousel({
  productos,
  onAddToCart,
  onQuickView,
}: FeaturedProductsCarouselProps) {
  // Categoría seleccionada para filtro rápido
  const [categoriaActiva, setCategoriaActiva] = useState<string>('TODOS');
  
  // Filtrado de productos (Soporta IDs de Supabase, slugs y nombres)
  const productosFiltrados = productos.filter((prod) => {
    if (categoriaActiva === 'TODOS') return true;
    
    const catSlug = (prod.categoria?.slug || '').toLowerCase();
    const catNom = (prod.categoria?.nombre || '').toLowerCase();
    const prodNom = (prod.nombre || '').toLowerCase();

    if (categoriaActiva === 'MAQUINAS') {
      return (
        prod.categoria_id === 'cat-1' ||
        prod.categoria_id === 'cat-2' ||
        prod.categoria_id === 'cat-3' ||
        catSlug.includes('maquina') ||
        catSlug.includes('clipper') ||
        catSlug.includes('patillera') ||
        catSlug.includes('shaver') ||
        catNom.includes('máquina') ||
        catNom.includes('clipper') ||
        catNom.includes('patillera') ||
        prodNom.includes('clipper') ||
        prodNom.includes('shaver') ||
        prodNom.includes('trimmer') ||
        prodNom.includes('máquina')
      );
    }
    if (categoriaActiva === 'TIJERAS_ACC') {
      return (
        prod.categoria_id === 'cat-4' ||
        prod.categoria_id === 'cat-5' ||
        catSlug.includes('tijera') ||
        catSlug.includes('accesorio') ||
        catNom.includes('tijera') ||
        catNom.includes('accesorio') ||
        prodNom.includes('tijera') ||
        prodNom.includes('navaja') ||
        prodNom.includes('peine') ||
        prodNom.includes('capa')
      );
    }
    if (categoriaActiva === 'KITS') {
      return (
        prod.categoria_id === 'cat-7' ||
        catSlug.includes('kit') ||
        catNom.includes('kit') ||
        prodNom.includes('kit') ||
        prodNom.includes('combo')
      );
    }
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Determinar cuántas tarjetas se ven según el ancho de pantalla
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalCards = productosFiltrados.length;
  const maxIndex = Math.max(0, totalCards - itemsPerPage);

  // Reiniciar índice si cambiamos filtro y el índice excede el nuevo máximo
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [maxIndex, currentIndex, categoriaActiva]);

  // Autoplay inteligente: avanza cada 3.8s si no está en pausa
  useEffect(() => {
    if (isPaused || maxIndex <= 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused, maxIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleCardAdd = (prod: Producto, e?: React.MouseEvent) => {
    setAddedId(prod.id);
    const coords = e ? { x: e.clientX, y: e.clientY } : undefined;
    onAddToCart(prod, coords);
    setTimeout(() => {
      setAddedId(null);
    }, 1500);
  };

  // Porcentaje de avance para la barra animada de progreso
  const progressPercent = maxIndex > 0 ? ((currentIndex + 1) / (maxIndex + 1)) * 100 : 100;

  return (
    <div
      className="space-y-6 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Pausa temporal en táctil para permitir inspeccionar antes de reanudar
        setTimeout(() => setIsPaused(false), 2500);
      }}
    >
      {/* Header del Carrusel con Filtros y Controles */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        {/* Títulos y Pestañas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold block">
              Equipamiento Profesional
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
            Herramientas Seleccionadas
          </h2>

          {/* Filtro de Pestañas Rápidas */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setCategoriaActiva('TODOS');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoriaActiva === 'TODOS'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200'
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoriaActiva('MAQUINAS');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoriaActiva === 'MAQUINAS'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200'
              }`}
            >
              Máquinas & Trimmers
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoriaActiva('TIJERAS_ACC');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoriaActiva === 'TIJERAS_ACC'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200'
              }`}
            >
              Tijeras & Pomadas
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoriaActiva('KITS');
                setCurrentIndex(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoriaActiva === 'KITS'
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:text-black hover:bg-zinc-200'
              }`}
            >
              Kits para Alumno
            </button>
          </div>
        </div>

        {/* Controles de Navegación del Carrusel */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Indicador de Pausa / Reproducción */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-[11px] font-mono font-semibold text-zinc-600 hover:text-black hover:border-zinc-300 transition-colors shadow-2xs cursor-pointer"
            title={isPaused ? 'Reanudar carrusel automático' : 'Pausar carrusel'}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-zinc-900" />
                <span className="hidden sm:inline">Pausado</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline text-zinc-800">Auto</span>
              </>
            )}
          </button>

          {/* Contador de posición */}
          <span className="text-xs font-mono text-zinc-500 font-semibold">
            {String(currentIndex + 1).padStart(2, '0')} / {String(maxIndex + 1).padStart(2, '0')}
          </span>

          {/* Flechas de desplazamiento */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={maxIndex === 0}
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-black active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Anterior máquina"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={maxIndex === 0}
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-black active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Siguiente máquina"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Progreso Animada estilo Luxury */}
      <div className="w-full bg-zinc-200/80 h-1 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: 'easeInOut', duration: 0.3 }}
          className="h-full bg-black rounded-full"
        />
      </div>

      {/* Contenedor del Carrusel (Viewport) */}
      <div className="relative overflow-hidden py-2">
        <motion.div
          className="flex"
          animate={{
            x: `-${currentIndex * (100 / itemsPerPage)}%`,
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        >
          {productosFiltrados.map((prod) => {
            const esAnadido = addedId === prod.id;
            const precioVenta = prod.precio_oferta || prod.precio_venta;

            return (
              <div
                key={prod.id}
                style={{ width: `${100 / itemsPerPage}%` }}
                className="shrink-0 px-2.5"
              >
                <div className="h-full rounded-2xl bg-white border border-zinc-200 overflow-hidden flex flex-col justify-between hover:border-zinc-900 hover:shadow-xl transition-all duration-300 group relative">
                  
                  {/* Imagen del Producto con Overlay y Badges */}
                  <div className="relative aspect-square w-full bg-zinc-100 overflow-hidden border-b border-zinc-100 flex items-center justify-center">
                    {prod.imagenes && prod.imagenes.length > 0 ? (
                      <img
                        src={prod.imagenes[0]}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 opacity-60">
                        <Boxes className="w-10 h-10 mb-1" />
                        <span className="text-[9px] font-mono uppercase tracking-widest">Sin Foto</span>
                      </div>
                    )}

                    {/* Insignia de Oferta (si aplica) */}
                    {prod.precio_oferta && prod.precio_oferta < prod.precio_venta && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-mono font-bold shadow-md">
                        OFERTA
                      </div>
                    )}

                    {/* Insignia de Stock o SKU */}
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-zinc-900 text-[9px] font-mono uppercase font-bold border border-zinc-200 shadow-2xs">
                      {prod.sku.split('-')[0] || 'OFICIAL'}
                    </div>

                    {/* Botón flotante para ver Ficha Técnica */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                      <button
                        type="button"
                        onClick={() => onQuickView(prod)}
                        className="px-4 py-2 rounded-xl bg-white/95 text-zinc-950 font-bold text-xs shadow-lg hover:bg-white flex items-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha Técnica</span>
                      </button>
                    </div>
                  </div>

                  {/* Detalle y Precios */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                        SKU: {prod.sku}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-950 mt-1 line-clamp-1 group-hover:text-black">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                        {prod.descripcion}
                      </p>
                    </div>

                    {/* Precio y Botón de Añadir */}
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          Precio Regular
                        </span>
                        <span className="text-base font-black text-zinc-950 font-mono">
                          {formatCurrency(precioVenta)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCardAdd(prod, e)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          esAnadido
                            ? 'bg-emerald-600 text-white'
                            : 'bg-black text-white hover:bg-zinc-800'
                        }`}
                      >
                        {esAnadido ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>¡Añadido!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Añadir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Pie del Carrusel con Enlace al Catálogo Completo */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 border-t border-zinc-200/60">
        <span className="font-medium text-zinc-600">
          Equipos y herramientas 100% originales con garantía oficial de fábrica.
        </span>
        <Link
          href="/tienda"
          className="font-bold text-black hover:underline flex items-center gap-1 group shrink-0"
        >
          <span>Explorar Todo el Catálogo</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
