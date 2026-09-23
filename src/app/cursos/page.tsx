'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Calendar, Clock, MapPin, Award, Check, Store, Users, ShoppingCart, MessageCircle, GraduationCap } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { useCart } from '@/context/CartContext';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { BUSINESS_INFO, TURNOS_CURSO_LABELS, SEDES, SedeId } from '@/lib/constants';
import { Producto, Curso, TurnoOption } from '@/types/database';
import { getCursosActivos, DEFAULT_TURNOS } from '@/lib/academia-service';

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState<string>('');
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState<string>('MANANA');
  const [acordeonAbierto, setAcordeonAbierto] = useState<number | null>(0);
  const [temarioPage, setTemarioPage] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;
    async function cargarCursos() {
      try {
        const list = await getCursosActivos();
        if (isMounted) {
          const items = list || [];
          setCursos(items);
          if (items.length > 0) {
            setCursoSeleccionadoId((prev) => {
              const existe = items.some((c) => c.id === prev);
              return existe ? prev : items[0].id;
            });
          }
        }
      } catch (err) {
        console.warn('Error al cargar cursos en /cursos:', err);
      } finally {
        if (isMounted) setCargando(false);
      }
    }
    cargarCursos();
    return () => {
      isMounted = false;
    };
  }, []);

  const cursoActivo = cursos.find((c) => c.id === cursoSeleccionadoId) || cursos[0];
  const turnosDisponibles: TurnoOption[] = cursoActivo?.turnos && cursoActivo.turnos.length > 0
    ? cursoActivo.turnos
    : DEFAULT_TURNOS;
  const turnoActivo = turnosDisponibles.find((t) => t.id === turnoSeleccionadoId) || turnosDisponibles[0];

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
  const [agregadoAnim, setAgregadoAnim] = useState(false);

  const handleInscribirmeAlCarrito = (e?: React.MouseEvent) => {
    if (!cursoActivo) return;
    const coords = e
      ? {
          x: e.clientX,
          y: e.clientY,
        }
      : undefined;

    const cursoProducto: Producto = {
      id: `curso-${cursoActivo.id}-${turnoActivo.id}`,
      sku: `MAT-${cursoActivo.id.toUpperCase()}-${turnoActivo.id.toUpperCase()}`,
      nombre: `Matrícula: ${cursoActivo.titulo} (${turnoActivo.nombre} - ${sedeActual.nombre})`,
      slug: `matricula-${cursoActivo.slug}-${turnoActivo.id.toLowerCase()}`,
      categoria_id: 'academia',
      descripcion: `Matrícula para ${cursoActivo.titulo}. Turno: ${turnoActivo.nombre} (${turnoActivo.horario} - ${turnoActivo.dias}). Duración: ${cursoActivo.duracion_semanas} semanas (${cursoActivo.horas_academicas} horas académicas). Sede: ${sedeActual.nombre} (${sedeActual.direccion}).`,
      precio_compra: 0,
      precio_venta: cursoActivo.costo_matricula,
      precio_alumno: cursoActivo.costo_matricula,
      stock: turnoActivo.vacantesDisponibles,
      stock_minimo: 1,
      imagenes: [cursoActivo.imagen_url],
      destacado: true,
      en_oferta: false,
      activo: true,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };

    const matriculaMeta = {
      cursoId: cursoActivo.id,
      cursoNombre: cursoActivo.titulo,
      turno: (turnoActivo.id as 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO') || 'MANANA',
      sede: sedeActual.nombre,
      costoMatricula: cursoActivo.costo_matricula,
      totalCurso: cursoActivo.costo_total_contado || cursoActivo.costo_matricula * 3,
    };

    addToCart(cursoProducto, false, coords, matriculaMeta, 'matricula');
    setAgregadoAnim(true);
    setTimeout(() => {
      setAgregadoAnim(false);
    }, 2200);
  };

  const handleInscripcionWhatsApp = () => {
    if (!cursoActivo) return;
    let mensaje = `Hola Galindo Barber Academy (${sedeActual.nombre}).\nDeseo información y separar mi vacante para el curso:\n\n`;
    mensaje += `CURSO: ${cursoActivo.titulo}\n`;
    mensaje += `TURNO: ${turnoActivo.nombre} (${turnoActivo.horario} - ${turnoActivo.dias})\n`;
    mensaje += `DURACIÓN: ${cursoActivo.duracion_semanas} semanas (${cursoActivo.horas_academicas} horas académicas)\n`;
    mensaje += `MATRÍCULA: S/ ${cursoActivo.costo_matricula.toFixed(2)}\n`;
    mensaje += `MENSUALIDAD: S/ ${cursoActivo.costo_mensualidad.toFixed(2)}\n\n`;
    mensaje += `SEDE ELEGIDA: ${sedeActual.nombre} (${sedeActual.direccionCompleta}).\n`;
    mensaje += `¿Cuáles son los requisitos y cuentas bancarias (Yape/Plin/Banco) para realizar el abono de matrícula?`;

    const link = generateWhatsAppLink(sedeActual.whatsapp, mensaje);
    window.open(link, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200 selection:text-black">
      <Navbar />

      {/* Header */}
      <section className="py-16 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block">
            Escuela de Barbería — Ica & Huancayo, Perú
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-950 uppercase tracking-tight">
            Programas Académicos 2026
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed">
            Formación presencial con práctica real. Aprende visagismo, corte fade, tijera y perfilado de barba con certificación oficial.
          </p>
        </div>
      </section>

      {/* Selector de Cursos y Módulo Interactivo */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {cargando ? (
          <div className="py-24 text-center text-zinc-400">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-zinc-600">Consultando convocatorias disponibles...</p>
          </div>
        ) : cursos.length === 0 ? (
          <div className="max-w-xl mx-auto py-16 px-6 text-center rounded-3xl bg-zinc-50 border border-zinc-200 shadow-xs space-y-4 my-8">
            <div className="w-14 h-14 rounded-full bg-white text-zinc-600 flex items-center justify-center mx-auto shadow-xs border border-zinc-200">
              <GraduationCap className="w-7 h-7 text-zinc-700" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">
                Próximamente Nuevas Convocatorias
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed mt-1">
                Por el momento no hay cursos con inscripciones abiertas en la plataforma web. Estamos preparando las nuevas fechas y vacantes para el próximo ciclo en nuestras sedes de Ica y Huancayo.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const link = generateWhatsAppLink(
                    sedeActual.whatsapp,
                    `Hola Galindo Barber Academy (${sedeActual.nombre}). Quisiera saber cuándo inician las próximas convocatorias y cursos de barbería.`
                  );
                  window.open(link, '_blank');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Consultar por WhatsApp</span>
              </button>
              <Link
                href="/tienda"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Store className="w-4 h-4" />
                <span>Ver Tienda Supply</span>
              </Link>
            </div>
          </div>
        ) : cursoActivo ? (
          <div className="space-y-12">
            {/* Selector de Pestañas de Cursos */}
            <div className="flex border-b border-zinc-200 overflow-x-auto gap-2">
              {cursos.map((c) => {
                const activo = c.id === cursoSeleccionadoId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCursoSeleccionadoId(c.id);
                      setTemarioPage(1);
                      setAcordeonAbierto(0);
                    }}
                    className={`pb-4 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                      activo
                        ? 'border-black text-zinc-950'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {c.titulo}
                  </button>
                );
              })}
            </div>

            {/* Ficha Detallada del Curso Seleccionado */}
            <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8">
              
              {/* Columna Izquierda: Imagen y Datos Básicos */}
              <div className="lg:col-span-5 space-y-5">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shadow-sm relative">
                  <img
                    src={cursoActivo.imagen_url}
                    alt={cursoActivo.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded text-zinc-900 text-[11px] font-mono border border-zinc-200 shadow-sm">
                    {cursoActivo.duracion_semanas} Semanas • {cursoActivo.horas_academicas} Horas
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs text-zinc-600">
                  <div className="flex items-center gap-2 text-zinc-950 font-semibold">
                    <Store className="w-4 h-4 text-zinc-900" />
                    <span>Clases Presenciales — {sedeActual.nombre}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Estaciones de trabajo individuales con espejos, tomas eléctricas para máquinas y modelos reales provistos por la escuela en {sedeActual.direccion}.
                  </p>
                  {cursoActivo.incluye_kit && (
                    <div className="pt-2 border-t border-zinc-200 text-zinc-950 font-medium">
                      ★ {cursoActivo.descripcion_kit || 'Incluye Kit Oficial de Alumno Galindo'}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Temario Desplegable y Calculadora */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Plan de Estudio
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  Certificación Galindo Academy
                </span>
              </div>

              <h2 className="text-2xl font-bold text-zinc-950 mt-1">
                {cursoActivo.titulo}
              </h2>

              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                {cursoActivo.descripcion_corta}
              </p>

              {/* Temario Acordeón Interactivo */}
              {cursoActivo.temario_detallado && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Módulos Académicos
                    </span>
                    {cursoActivo.temario_detallado.length > 10 && (
                      <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                        Página {temarioPage} de {Math.ceil(cursoActivo.temario_detallado.length / 10)}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50/50">
                    {cursoActivo.temario_detallado
                      .slice((temarioPage - 1) * 10, temarioPage * 10)
                      .map((tema, idx) => {
                      const realIndex = (temarioPage - 1) * 10 + idx;
                      const abierto = acordeonAbierto === realIndex;
                      return (
                        <div key={realIndex} className="bg-white">
                          <button
                            type="button"
                            onClick={() => setAcordeonAbierto(abierto ? null : realIndex)}
                            className="w-full p-3.5 text-left flex items-center justify-between hover:bg-zinc-50 transition-colors"
                          >
                            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono flex items-center justify-center shrink-0 border border-zinc-200">
                                {realIndex + 1}
                              </span>
                              {tema}
                            </span>
                            {abierto ? (
                              <ChevronUp className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            )}
                          </button>

                          <AnimatePresence>
                            {abierto && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="px-4 pb-3 pt-1 text-[11px] text-zinc-600 bg-zinc-50 border-t border-zinc-100 leading-relaxed"
                              >
                                Práctica guiada con máquinas y tijeras, corrección de postura, uso adecuado de palanca y técnicas de desvanecido aplicadas a este módulo.
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Paginación */}
                  {cursoActivo.temario_detallado.length > 10 && (
                    <div className="flex items-center justify-between pt-3">
                      <button
                        type="button"
                        onClick={() => setTemarioPage((prev) => Math.max(1, prev - 1))}
                        disabled={temarioPage === 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Anteriores
                      </button>
                      
                      <div className="flex gap-1.5">
                        {Array.from({ length: Math.ceil(cursoActivo.temario_detallado.length / 10) }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTemarioPage(i + 1)}
                            className={`w-6 h-6 rounded-md text-[10px] font-mono font-bold flex items-center justify-center transition-all ${
                              temarioPage === i + 1
                                ? 'bg-black text-white'
                                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setTemarioPage((prev) => Math.min(Math.ceil(cursoActivo.temario_detallado.length / 10), prev + 1))}
                        disabled={temarioPage === Math.ceil(cursoActivo.temario_detallado.length / 10)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Siguientes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selector de Turno */}
            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Selecciona tu Turno de Estudio
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {turnosDisponibles.map((t) => {
                  const seleccionado = t.id === turnoActivo?.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTurnoSeleccionadoId(t.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        seleccionado
                          ? 'border-black bg-zinc-950 text-white shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{t.nombre}</p>
                      <p className={`text-[10px] mt-1 ${seleccionado ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {t.horario}
                      </p>
                      {t.dias && (
                        <p className={`text-[9px] mt-0.5 ${seleccionado ? 'text-zinc-400' : 'text-zinc-400'}`}>
                          {t.dias}
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t border-zinc-200/40 flex items-center justify-between text-[10px] font-mono">
                        <span className={seleccionado ? 'text-zinc-300' : 'text-zinc-500'}>Vacantes:</span>
                        <span className={`font-bold ${seleccionado ? 'text-emerald-400' : 'text-zinc-950'}`}>
                          {t.vacantesDisponibles} libres
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de Sede para el Curso */}
            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Selecciona la Sede donde deseas Estudiar:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(SEDES) as SedeId[]).map((key) => {
                  const s = SEDES[key];
                  const isSelected = sedeSeleccionada === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSedeSeleccionada(key)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-black bg-zinc-950 text-white shadow-xs'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold leading-tight">{s.nombre}</p>
                        <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {s.direccion} ({s.ciudad})
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inversión y Botón de WhatsApp */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Matrícula Hoy</span>
                    <span className="text-lg font-bold text-zinc-950 font-mono">
                      {formatCurrency(cursoActivo.costo_matricula)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Mensualidad</span>
                    <span className="text-lg font-bold text-zinc-950 font-mono">
                      {formatCurrency(cursoActivo.costo_mensualidad)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {sedeActual.nombre} — Pagos con Yape, Plin o en Efectivo
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => handleInscribirmeAlCarrito(e)}
                  className={`px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    agregadoAnim
                      ? 'bg-emerald-600 text-white'
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  {agregadoAnim ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>¡Matrícula Añadida al Carrito!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Inscribirme en {turnoActivo.nombre}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleInscripcionWhatsApp}
                  className="px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Consultar detalles por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Dudas por WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    ) : null}

      </section>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />

      <Footer />
    </div>
  );
}
