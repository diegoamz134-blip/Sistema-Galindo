'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Calendar, Clock, MapPin, Award, Check, Store, Users, ShoppingBag, MessageCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/shop/CartDrawer';
import { useCart } from '@/context/CartContext';
import { formatCurrency, generateWhatsAppLink } from '@/lib/utils';
import { BUSINESS_INFO, TURNOS_CURSO_LABELS, SEDES, SedeId } from '@/lib/constants';
import { MOCK_CURSOS } from '@/lib/mock-data';
import { Producto } from '@/types/database';

interface TurnoOption {
  id: string;
  nombre: string;
  horario: string;
  dias: string;
  vacantesDisponibles: number;
}

const TURNOS_DISPONIBLES: TurnoOption[] = [
  {
    id: 'MANANA',
    nombre: 'Turno Mañana',
    horario: '9:00 AM — 12:00 PM',
    dias: 'Lunes, Miércoles y Viernes',
    vacantesDisponibles: 4,
  },
  {
    id: 'TARDE',
    nombre: 'Turno Tarde',
    horario: '3:00 PM — 6:00 PM',
    dias: 'Lunes, Miércoles y Viernes',
    vacantesDisponibles: 6,
  },
  {
    id: 'SABATINO',
    nombre: 'Sábados Intensivo',
    horario: '9:00 AM — 2:00 PM',
    dias: 'Todos los Sábados',
    vacantesDisponibles: 2,
  },
];

export default function CursosPage() {
  const cursos = MOCK_CURSOS;
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState<string>(cursos[0].id);
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState<string>('MANANA');
  const [acordeonAbierto, setAcordeonAbierto] = useState<number | null>(0);

  const cursoActivo = cursos.find((c) => c.id === cursoSeleccionadoId) || cursos[0];
  const turnoActivo = TURNOS_DISPONIBLES.find((t) => t.id === turnoSeleccionadoId) || TURNOS_DISPONIBLES[0];

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

    addToCart(cursoProducto, false, coords);
    setAgregadoAnim(true);
    setTimeout(() => {
      setAgregadoAnim(false);
    }, 2200);
  };

  const handleInscripcionWhatsApp = () => {
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
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full space-y-12">
        
        {/* Selector de Pestañas de Cursos */}
        <div className="flex border-b border-zinc-200 overflow-x-auto gap-2">
          {cursos.map((c) => {
            const activo = c.id === cursoSeleccionadoId;
            return (
              <button
                key={c.id}
                onClick={() => setCursoSeleccionadoId(c.id)}
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
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                    Módulos Académicos
                  </span>

                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50/50">
                    {cursoActivo.temario_detallado.map((tema, idx) => {
                      const abierto = acordeonAbierto === idx;
                      return (
                        <div key={idx} className="bg-white">
                          <button
                            type="button"
                            onClick={() => setAcordeonAbierto(abierto ? null : idx)}
                            className="w-full p-3.5 text-left flex items-center justify-between hover:bg-zinc-50 transition-colors"
                          >
                            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-mono flex items-center justify-center shrink-0 border border-zinc-200">
                                {idx + 1}
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
                </div>
              )}
            </div>

            {/* Selector de Turno */}
            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Selecciona tu Turno de Estudio
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {TURNOS_DISPONIBLES.map((t) => {
                  const seleccionado = t.id === turnoSeleccionadoId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTurnoSeleccionadoId(t.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        seleccionado
                          ? 'border-black bg-zinc-950 text-white shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{t.nombre}</p>
                      <p className={`text-[10px] mt-1 ${seleccionado ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {t.horario}
                      </p>
                      <div className="mt-2 pt-2 border-t border-zinc-200/40 flex items-center justify-between text-[10px] font-mono">
                        <span className={seleccionado ? 'text-zinc-300' : 'text-zinc-500'}>Vacantes:</span>
                        <span className={`font-bold ${seleccionado ? 'text-white' : 'text-zinc-950'}`}>
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
                      <ShoppingBag className="w-4 h-4" />
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
