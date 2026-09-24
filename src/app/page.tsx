'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, Eye, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2, GraduationCap, Boxes, MessageCircle, MapPin } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer, CartItem } from '@/components/shop/CartDrawer';
import { QuickViewModal } from '@/components/shop/QuickViewModal';
import { FeaturedProductsCarousel } from '@/components/shop/FeaturedProductsCarousel';
import { useCart } from '@/context/CartContext';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { SEDES, SedeId } from '@/lib/constants';
import { MOCK_PRODUCTOS, MOCK_CURSOS } from '@/lib/mock-data';
import { Producto, Curso } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { getCursosActivos } from '@/lib/academia-service';
import { AcademyUrgencyBanner } from '@/components/home/AcademyUrgencyBanner';
import { SedeCentralSection } from '@/components/home/SedeCentralSection';
import { FaqAccordion } from '@/components/home/FaqAccordion';
import { CoursesInfiniteCarousel } from '@/components/home/CoursesInfiniteCarousel';


export default function HomePage() {
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

  const [productosDestacados, setProductosDestacados] = useState<Producto[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function cargarDatosHome() {
      setLoadingData(true);
      try {
        let prodsQuery = supabase
          .from('productos')
          .select('*, categoria:categorias(*)')
          .eq('activo', true)
          .order('creado_en', { ascending: false });

        // Filtrar productos estrictamente disponibles en la sede activa
        if (sedeSeleccionada === 'huancayo') {
          prodsQuery = prodsQuery.gt('stock_huancayo', 0);
        } else {
          prodsQuery = prodsQuery.gt('stock_ica', 0);
        }

        const [prodsRes, cursosList] = await Promise.all([
          prodsQuery,
          getCursosActivos(sedeSeleccionada),
        ]);

        if (!isMounted) return;

        if (prodsRes.data && prodsRes.data.length > 0) {
          const prods = prodsRes.data as unknown as Producto[];
          const destacados = prods.filter((p) => p.destacado);
          setProductosDestacados(destacados.length > 0 ? destacados : prods.slice(0, 8));
        } else {
          setProductosDestacados([]);
        }

        setCursos(cursosList || []);
      } catch (err) {
        console.warn('Error al cargar datos para portada:', err);
        setProductosDestacados([]);
        setCursos([]);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    cargarDatosHome();
    return () => {
      isMounted = false;
    };
  }, [sedeSeleccionada]);

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
              <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold flex-wrap">
                <span>Academia Profesional</span>
                <span className="text-zinc-400">•</span>
                <span>Distribuidor Autorizado</span>
                <span className="text-zinc-400">•</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/20 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>{sedeActual.nombre} ({sedeActual.ciudad})</span>
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase leading-[1.08] drop-shadow-md">
                Escuela de Barbería & Barber Supply
              </h1>

              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-xl drop-shadow-sm font-medium">
                Formación técnica profesional y práctica real en {sedeActual.ciudad}. Cursos de fade, tijera y visagismo capilar, con tienda oficial de máquinas Wahl, BaBylissPRO y kits para estudiantes.
              </p>

              {/* Selector Rápido de Sede en Hero */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300">
                  Estás viendo: <b className="text-white font-bold">{sedeActual.nombre}</b>
                </span>
                <button
                  type="button"
                  onClick={() => setSedeSeleccionada(otraSedeKey)}
                  className="ml-2 text-cyan-300 hover:text-white underline font-mono text-[11px] cursor-pointer"
                >
                  Cambiar a Sede {otraSede.ciudad} →
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
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
          {loadingData ? (
            <div className="py-16 text-center text-zinc-400">
              <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-zinc-600">Consultando catálogo de {sedeActual.nombre}...</p>
            </div>
          ) : productosDestacados.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 px-6 rounded-3xl bg-zinc-50 border border-zinc-200 text-center space-y-3 shadow-2xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>{sedeActual.nombre} ({sedeActual.ciudad})</span>
              </span>
              <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">
                Stock Físico en Preparación para Sede {sedeActual.ciudad}
              </h3>
              <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed">
                {sedeSeleccionada === 'huancayo'
                  ? 'Actualmente el inventario de máquinas y barber supply se encuentra en nuestro almacén central de Ica. Puedes cambiar a Sede Ica para compras con envíos a todo el Perú, o escribirnos por WhatsApp.'
                  : 'Pronto estarán disponibles los productos destacados en catálogo.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {sedeSeleccionada === 'huancayo' && (
                  <button
                    type="button"
                    onClick={() => setSedeSeleccionada('ica')}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Store className="w-4 h-4" />
                    <span>Ver Catálogo en Sede Ica</span>
                  </button>
                )}
                <a
                  href={`https://wa.me/${sedeActual.whatsapp}?text=${encodeURIComponent(
                    `Hola Galindo Barber Supply (${sedeActual.nombre}). Deseo consultar por productos disponibles para la sede de ${sedeActual.ciudad}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <FeaturedProductsCarousel
              productos={productosDestacados}
              onAddToCart={handleAddToCart}
              onQuickView={(prod) => setQuickViewProducto(prod)}
            />
          )}
        </div>
      </section>

      {/* 4. PROGRAMAS ACADÉMICOS & FORMACIÓN PRÁCTICA */}
      <section className="py-24 border-y border-zinc-300/80 bg-[#F1F3F5] overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Cintillo de Urgencia & Vacantes del Próximo Ciclo (solo si hay cursos activos) */}
          {cursos.length > 0 && <AcademyUrgencyBanner />}

          <div>
            <div className="mb-12 max-w-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold block mb-1">
                Capacitación Técnica Profesional
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Cursos de Barbería en {sedeActual.ciudad}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                Aprende desde los fundamentos básicos hasta técnicas avanzadas de desvanecido, tijera clásica y afeitado tradicional con modelos reales.
              </p>
            </div>

            {cursos.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-zinc-200 shadow-xs max-w-xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center mx-auto shadow-xs border border-zinc-200">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                    <span>{sedeActual.nombre} ({sedeActual.ciudad})</span>
                  </span>
                  <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">
                    Próximas Convocatorias en Sede {sedeActual.ciudad}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed max-w-md mx-auto">
                    {sedeSeleccionada === 'huancayo'
                      ? 'Actualmente las convocatorias con vacantes abiertas están en nuestra Sede Central de Ica. Estamos preparando las nuevas fechas y vacantes para las clases presenciales en Jr. Guido 654, Huancayo.'
                      : 'Por el momento no hay cursos con inscripciones abiertas en la plataforma web. Estamos preparando las nuevas fechas y vacantes para el próximo ciclo.'}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/${sedeActual.whatsapp}?text=${encodeURIComponent(
                      `Hola Galindo Barber Academy (${sedeActual.nombre}). Quisiera saber cuándo inician las próximas clases de barbería en ${sedeActual.ciudad}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Consultar por WhatsApp {sedeActual.ciudad}</span>
                  </a>
                  {sedeSeleccionada === 'huancayo' && (
                    <button
                      type="button"
                      onClick={() => setSedeSeleccionada('ica')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Ver Cursos en Sede Ica</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <CoursesInfiniteCarousel cursos={cursos} sedeActual={sedeActual} />
            )}
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
