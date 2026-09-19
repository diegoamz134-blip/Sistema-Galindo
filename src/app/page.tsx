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

            </motion.div>

          </div>
        </div>
      </section>



      {/* 3. PRODUCTOS DESTACADOS - CARRUSEL INTERACTIVO */}
      <section className="py-20 border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeaturedProductsCarousel
            productos={MOCK_PRODUCTOS}
            onAddToCart={handleAddToCart}
            onQuickView={(prod) => setQuickViewProducto(prod)}
          />
        </div>
      </section>

      {/* 4. PROGRAMAS ACADÉMICOS & FORMACIÓN PRÁCTICA */}
      <section className="py-24 border-y border-zinc-300/80 bg-[#F1F3F5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Cintillo de Urgencia & Vacantes del Próximo Ciclo */}
          <AcademyUrgencyBanner />

          <div>
            <div className="mb-12 max-w-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold block mb-1">
                Capacitación Técnica Profesional
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Cursos de Barbería en Ica
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                Aprende desde los fundamentos básicos hasta técnicas avanzadas de desvanecido, tijera clásica y afeitado tradicional con modelos reales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cursos.map((curso, idx) => (
                <motion.div
                  key={curso.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.25, ease: 'easeOut' } }}
                  className="bg-white rounded-3xl p-8 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_22px_45px_rgba(0,0,0,0.12)] border border-zinc-200/70 transition-shadow duration-300 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {curso.duracion_semanas} Semanas • Clases Presenciales
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                        {curso.titulo}
                      </h3>
                    </div>

                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {curso.descripcion_corta}
                    </p>

                    {curso.temario_detallado && (
                      <div className="pt-4 border-t border-zinc-100 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Módulos Principales
                        </p>
                        <ul className="space-y-2.5">
                          {curso.temario_detallado.slice(0, 3).map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs sm:text-sm text-zinc-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-zinc-400 block">Matrícula</span>
                      <span className="text-2xl font-black text-zinc-950 font-mono">
                        {formatCurrency(curso.costo_matricula)}
                      </span>
                    </div>

                    <Link
                      href="/cursos"
                      className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-black text-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-95"
                    >
                      Ver Temario Completo
                    </Link>
                  </div>
                </motion.div>
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
