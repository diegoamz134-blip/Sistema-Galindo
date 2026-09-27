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
  // Lista directa de productos para el carrusel
  const productosFiltrados = productos;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  // Determinar cuántas tarjetas se ven según el ancho de pantalla
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(3);
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

  // Reiniciar índice si el índice excede el nuevo máximo
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [maxIndex, currentIndex]);

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
      {/* Header del Carrusel con Controles */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        {/* Título y Subtítulo */}
        <div className="space-y-1.5 max-w-xl">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
            Equipamiento Profesional
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
            Productos Destacados
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
            Máquinas originales con garantía oficial, herramientas de precisión y suministros para barberos en Ica y Huancayo.
          </p>
        </div>

        {/* Controles de Navegación del Carrusel */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
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
                <Pause className="w-3 h-3 text-zinc-900" />
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
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={maxIndex === 0}
              className="p-2 rounded-xl bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-black active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del Carrusel (Viewport) */}
      <div className="relative overflow-hidden py-1">
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
            const tieneOferta = Boolean(prod.precio_oferta && prod.precio_oferta < prod.precio_venta);
            const etiquetaBadge = prod.categoria?.nombre || 'OFICIAL';

            return (
              <div
                key={prod.id}
                style={{ width: `${100 / itemsPerPage}%` }}
                className="shrink-0 px-1.5 sm:px-2.5"
              >
                <div className="h-full rounded-xl sm:rounded-2xl bg-white border border-zinc-200 overflow-hidden flex flex-col justify-between hover:border-zinc-900 hover:shadow-xl transition-all duration-300 group relative">
                  
                  {/* Imagen del Producto con Overlay y Badges */}
                  <div className="relative aspect-square w-full bg-zinc-50 overflow-hidden border-b border-zinc-100 flex items-center justify-center p-2 sm:p-3">
                    {prod.imagenes && prod.imagenes.length > 0 ? (
                      <img
                        src={prod.imagenes[0]}
                        alt={prod.nombre}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400 opacity-60">
                        <Boxes className="w-8 h-8 sm:w-10 sm:h-10 mb-1" />
                        <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest">Sin Foto</span>
                      </div>
                    )}

                    {/* Insignia de Oferta (si aplica) */}
                    {tieneOferta && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-1.5 sm:px-2 py-0.5 rounded bg-zinc-950 text-white text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider shadow-xs">
                        Oferta
                      </div>
                    )}

                    {/* Insignia de Marca o Categoría */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 rounded bg-white/95 text-zinc-900 text-[8px] sm:text-[9px] font-mono uppercase font-bold border border-zinc-200 shadow-2xs truncate max-w-[75%]">
                      {etiquetaBadge}
                    </div>

                    {/* Botón flotante para ver Ficha Técnica (en pantallas medianas y grandes) */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center p-4">
                      <button
                        type="button"
                        onClick={() => onQuickView(prod)}
                        className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs shadow-md hover:bg-zinc-50 transition-all transform translate-y-1 group-hover:translate-y-0 cursor-pointer active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalle</span>
                      </button>
                    </div>
                  </div>

                  {/* Detalle y Precios */}
                  <div className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-medium truncate">
                        {etiquetaBadge}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-950 mt-0.5 sm:mt-1 line-clamp-1 group-hover:text-black">
                        {prod.nombre}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                        {prod.descripcion}
                      </p>
                      <div className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                        <span className="truncate">Recojo en tienda</span>
                      </div>
                    </div>

                    {/* Precio y Botón de Añadir */}
                    <div className="pt-2 sm:pt-3 border-t border-zinc-100 flex items-center justify-between gap-1.5 sm:gap-2">
                      <div className="min-w-0">
                        <span className="text-[8px] sm:text-[10px] text-zinc-400 block font-mono">
                          {tieneOferta ? 'Oferta' : 'Precio'}
                        </span>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 font-mono">
                          <span className="text-xs sm:text-base font-black text-zinc-950 truncate">
                            {formatCurrency(precioVenta)}
                          </span>
                          {tieneOferta && (
                            <span className="text-[10px] sm:text-xs text-zinc-400 line-through truncate hidden xs:inline">
                              {formatCurrency(prod.precio_venta)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCardAdd(prod, e)}
                        className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-2xs flex items-center gap-1 sm:gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                          esAnadido
                            ? 'bg-zinc-950 text-white'
                            : 'bg-zinc-950 hover:bg-black text-white'
                        }`}
                      >
                        {esAnadido ? (
                          <>
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                            <span>¡Listo!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

      {/* Paginación Minimalista de Barras */}
      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentIndex === idx ? 'w-6 bg-zinc-950' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
              }`}
              aria-label={`Ir a grupo ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Pilares Editoriales de Confianza (Sin emojis ni iconos) */}
      <div className="pt-6 border-t border-zinc-200/80 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-zinc-200 bg-white">
            <span className="text-xs font-bold text-zinc-950 uppercase tracking-tight block">
              Garantía Oficial
            </span>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Equipos 100% originales sellados de fábrica con respaldo de marca y repuestos.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-zinc-200 bg-white">
            <span className="text-xs font-bold text-zinc-950 uppercase tracking-tight block">
              Recojo en Tienda Física
            </span>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Retiro inmediato en mostrador Sede Ica (Calle Bolívar) o Huancayo (Jr. Guido).
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-zinc-200 bg-white">
            <span className="text-xs font-bold text-zinc-950 uppercase tracking-tight block">
              Asesoría Especializada
            </span>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Atención directa por WhatsApp para orientarte según tu nivel o uso diario.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-zinc-500 font-medium">
            Equipos y herramientas de barbería profesional con garantía oficial.
          </span>
          <Link
            href="/tienda"
            className="font-bold text-zinc-950 hover:text-black uppercase tracking-wider text-xs border-b border-zinc-950 pb-0.5 hover:border-black transition-colors shrink-0"
          >
            Explorar Todo el Catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
