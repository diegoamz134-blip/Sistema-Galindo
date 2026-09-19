'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Eye, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer, CartItem } from '@/components/shop/CartDrawer';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { FeaturedProductsCarousel } from '@/components/shop/FeaturedProductsCarousel';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/lib/utils';
import { MOCK_PRODUCTOS, MOCK_CURSOS } from '@/lib/mock-data';
import { Producto } from '@/types/database';
import { AcademyUrgencyBanner } from '@/components/home/AcademyUrgencyBanner';
import { SedeCentralSection } from '@/components/home/SedeCentralSection';
import { FaqAccordion } from '@/components/home/FaqAccordion';

function AnimatedNumber({
  value,
  suffix = '',
  duration = 1.8,
  className = 'tabular-nums font-mono font-black text-3xl sm:text-4xl text-white drop-shadow-md',
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Easing out quart para una subida suave y fluida
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(ease * value));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue}{suffix}
    </span>
  );
}

export default function HomePage() {
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    cartOpen,
    setCartOpen,
  } = useCart();
  const [quickViewProducto, setQuickViewProducto] = useState<Producto | null>(null);

  const topProductos = MOCK_PRODUCTOS.filter((p) => p.destacado);
  const cursos = MOCK_CURSOS;

  const handleAddToCart = (producto: Producto, coords?: { x: number; y: number }) => {
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

      {/* 1. HERO SECTION NATURAL CON BANNER DE FONDO */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-zinc-200 overflow-hidden bg-zinc-950">
        {/* Imagen de Fondo del Banner Oficial a Todo Color */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img
            src="/banner.png"
            alt="Banner Galindo Barber Fondo"
            className="w-full h-full object-cover object-center"
          />
          {/* Degradado lateral sutil: oscuro en la izquierda para legibilidad y 100% transparente a la derecha para ver el arte del banner */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-left">
            
            {/* Texto Principal Natural pegado a la izquierda sin cajas */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                <span>Academia Profesional</span>
                <span className="text-zinc-400">•</span>
                <span>Distribuidor Autorizado</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase leading-[1.08] drop-shadow-md">
                Escuela de Barbería & Barber Supply
              </h1>

              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-xl drop-shadow-sm font-medium">
                Formación técnica profesional y práctica real. Cursos de fade, tijera y visagismo capilar, con tienda oficial de máquinas Wahl, BaBylissPRO y kits para estudiantes.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/cursos"
                  className="px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
                >
                  Ver Cursos & Matrículas
                </Link>
                <Link
                  href="/tienda"
                  className="px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-black/60 hover:bg-black/80 text-white border border-white/30 backdrop-blur-xs transition-all shadow-lg active:scale-95"
                >
                  Catálogo de Productos
                </Link>
              </div>

              {/* Indicadores numéricos animados con conteo ascendente */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20 max-w-lg">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="space-y-1"
                >
                  <div className="flex items-baseline text-white">
                    <AnimatedNumber value={500} suffix="+" duration={1.8} />
                  </div>
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider drop-shadow-sm">
                    Egresados
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="space-y-1"
                >
                  <div className="flex items-baseline text-white">
                    <AnimatedNumber value={100} suffix="%" duration={1.5} />
                  </div>
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider drop-shadow-sm">
                    Práctica Real
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                  className="space-y-1"
                >
                  <div className="flex items-baseline">
                    <span className="font-mono font-black text-3xl sm:text-4xl text-white drop-shadow-md">
                      Oficial
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider drop-shadow-sm">
                    Certificación
                  </p>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>



      {/* 3. PRODUCTOS DESTACADOS - CARRUSEL INTERACTIVO */}
      <section className="py-20 border-b border-zinc-200 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeaturedProductsCarousel
            productos={MOCK_PRODUCTOS}
            onAddToCart={handleAddToCart}
            onQuickView={(prod) => setQuickViewProducto(prod)}
          />
        </div>
      </section>

      {/* 4. PROGRAMAS ACADÉMICOS & FORMACIÓN PRÁCTICA */}
      <section className="py-20 border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Cintillo de Urgencia & Vacantes del Próximo Ciclo */}
          <AcademyUrgencyBanner />

          <div>
            <div className="mb-12 max-w-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                Capacitación Técnica
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 uppercase tracking-tight">
                Cursos de Barbería en Ica
              </h2>
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                Aprende desde los fundamentos básicos hasta técnicas avanzadas de desvanecido, tijera clásica y afeitado tradicional con modelos reales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursos.map((curso) => (
                <div
                  key={curso.id}
                  className="rounded-xl bg-white border border-zinc-200 p-6 flex flex-col justify-between space-y-6 hover:border-zinc-300 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                      <span>{curso.duracion_semanas} Semanas • {curso.horas_academicas} Horas</span>
                      {curso.incluye_kit && (
                        <span className="text-zinc-900 font-medium">Incluye Kit de Inicio</span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-zinc-950">
                      {curso.titulo}
                    </h3>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {curso.descripcion_corta}
                    </p>

                    {curso.temario_detallado && (
                      <ul className="pt-3 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-700">
                        {curso.temario_detallado.slice(0, 3).map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                            <span className="truncate">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Matrícula</span>
                      <span className="text-sm font-bold text-zinc-950 font-mono">
                        {formatCurrency(curso.costo_matricula)}
                      </span>
                    </div>

                    <Link
                      href="/cursos"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 transition-colors"
                    >
                      Ver Temario Completo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>



      {/* 6. SEDE FÍSICA CENTRAL EN ICA (CALLE BOLÍVAR) */}
      <SedeCentralSection />

      {/* 7. PREGUNTAS FRECUENTES INTERACTIVAS */}
      <FaqAccordion />

      {/* Cart Drawer */}
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
