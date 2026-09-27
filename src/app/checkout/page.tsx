'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Store,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  ShoppingCart,
  Sparkles,
  Ticket,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Scissors,
  Receipt,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Zap,
  Download,
  ArrowLeftRight,
  Coins,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { formatCurrency, generateWhatsAppLink, generateCode } from '@/lib/utils';
import { exportarTicketPDF } from '@/lib/ticket-pdf';
import { BUSINESS_INFO, SEDES, SedeId } from '@/lib/constants';
import { MOCK_PRODUCTOS } from '@/lib/mock-data';
import { procesarPedidoWeb, PedidoWebItem } from '@/lib/checkout-service';

type MetodoPagoCheckout = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA';

export default function CheckoutPage() {
  const {
    cartItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    addToCart,
    clearCart,
    sedeSeleccionada,
  } = useCart();
  const sedeActual = SEDES[sedeSeleccionada] || SEDES['ica'];

  const [procesandoPedido, setProcesandoPedido] = useState(false);
  const [errorPedido, setErrorPedido] = useState<string | null>(null);

  // Si entra con carrito vacío, usamos productos de muestra para que pueda interactuar
  const [localItems, setLocalItems] = useState(cartItems);

  useEffect(() => {
    if (cartItems.length > 0) {
      setLocalItems(cartItems);
    } else {
      setLocalItems([
        { producto: MOCK_PRODUCTOS[0], cantidad: 1 },
        { producto: MOCK_PRODUCTOS[4], cantidad: 1 },
      ]);
    }
  }, [cartItems]);

  // Formulario del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'CE'>('DNI');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [notas, setNotas] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(true);

  // Método de pago y cálculos interactivos
  const [metodoPago, setMetodoPago] = useState<MetodoPagoCheckout>('YAPE');
  const [billeteEfectivo, setBilleteEfectivo] = useState<number | 'exacto'>('exacto');
  const [montoBilletePersonalizado, setMontoBilletePersonalizado] = useState('');
  const [copiadoYape, setCopiadoYape] = useState(false);
  const [copiadoBcp, setCopiadoBcp] = useState(false);
  const [copiadoCci, setCopiadoCci] = useState(false);
  const [codigoOrden, setCodigoOrden] = useState('GAL-2026-8492');



  // Estado del modal final de ticket confirmado y descarga de PDF
  const [ticketConfirmadoModal, setTicketConfirmadoModal] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfDescargado, setPdfDescargado] = useState(false);

  useEffect(() => {
    setCodigoOrden(generateCode('GAL'));
  }, []);

  const handleDescargarPDF = async () => {
    setGenerandoPdf(true);
    try {
      const ok = await exportarTicketPDF('ticket-imprimible-oficial', codigoOrden);
      if (ok) {
        setPdfDescargado(true);
        setTimeout(() => setPdfDescargado(false), 3500);
      }
    } finally {
      setGenerandoPdf(false);
    }
  };

  const totalCalculado = localItems.reduce((acc, item) => {
    const precio = item.producto.precio_oferta || item.producto.precio_venta;
    return acc + precio * item.cantidad;
  }, 0);

  // Vuelto en efectivo
  const valorBillete =
    billeteEfectivo === 'exacto'
      ? totalCalculado
      : typeof billeteEfectivo === 'number'
      ? billeteEfectivo
      : parseFloat(montoBilletePersonalizado) || totalCalculado;

  const vueltoCalculado = Math.max(0, valorBillete - totalCalculado);



  const handleCopiarTexto = (texto: string, tipo: 'yape' | 'bcp' | 'cci') => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(texto);
    }
    if (tipo === 'yape') {
      setCopiadoYape(true);
      setTimeout(() => setCopiadoYape(false), 2200);
    } else if (tipo === 'bcp') {
      setCopiadoBcp(true);
      setTimeout(() => setCopiadoBcp(false), 2200);
    } else if (tipo === 'cci') {
      setCopiadoCci(true);
      setTimeout(() => setCopiadoCci(false), 2200);
    }
  };

  const handleModificarCantidad = (productoId: string, delta: number) => {
    if (cartItems.length > 0) {
      updateQuantity(productoId, delta);
    } else {
      setLocalItems((prev) =>
        prev
          .map((item) => {
            if (item.producto.id === productoId) {
              const nueva = item.cantidad + delta;
              return nueva > 0 ? { ...item, cantidad: nueva } : null;
            }
            return item;
          })
          .filter(Boolean) as typeof localItems
      );
    }
  };

  const handleEliminarItem = (productoId: string) => {
    if (cartItems.length > 0) {
      removeFromCart(productoId);
    } else {
      setLocalItems((prev) => prev.filter((item) => item.producto.id !== productoId));
    }
  };

  // Tags rápidos e interactivos para notas de barbero
  const TAGS_BARBERO = [
    'Paso a recoger en 15 minutos',
    'Soy alumno activo de Galindo',
    'Revisar calibración de cuchilla antes',
    'Pagaré con billete exacto',
    'Necesito boleta con mi documento',
  ];

  const handleToggleTag = (tag: string) => {
    if (notas.includes(tag)) {
      setNotas((prev) => prev.replace(tag, '').replace(/,\s*,/g, ',').trim());
    } else {
      setNotas((prev) => (prev ? `${prev}, ${tag}` : tag));
    }
  };

  const handleConfirmarYEmitirPedido = async () => {
    setErrorPedido(null);

    // Validar nombre
    if (!nombre || nombre.trim().length < 3) {
      setErrorPedido('Por favor ingresa tu nombre y apellido completo para registrar tu ticket.');
      return;
    }

    // Validar teléfono
    if (!telefono || telefono.replace(/\D/g, '').length < 8) {
      setErrorPedido('Por favor ingresa un número de celular válido para coordinar tu recojo.');
      return;
    }

    if (localItems.length === 0) {
      setErrorPedido('Tu pedido está vacío. Agrega productos o un curso para continuar.');
      return;
    }

    if (!aceptaTerminos) {
      setErrorPedido('Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.');
      return;
    }

    setProcesandoPedido(true);

    try {
      const itemsPayload: PedidoWebItem[] = localItems.map((item) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio_oferta || item.producto.precio_venta,
        subtotal: (item.producto.precio_oferta || item.producto.precio_venta) * item.cantidad,
        tipo: item.tipo,
        matriculaMetadata: item.matriculaMetadata,
      }));

      const res = await procesarPedidoWeb({
        codigoPedido: codigoOrden,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        clienteDni: numeroDocumento.trim() || undefined,
        tipoDocumento,
        sedeId: sedeSeleccionada,
        metodoEntrega: 'RECOJO_SEDE',
        metodoPago,
        detallesPago:
          metodoPago === 'EFECTIVO'
            ? {
                efectivo: typeof valorBillete === 'number' ? valorBillete : totalCalculado,
                vuelto: vueltoCalculado,
              }
            : undefined,
        notas,
        items: itemsPayload,
        subtotal: totalCalculado,
        descuento: 0,
        total: totalCalculado,
      });

      if (!res.success) {
        throw new Error(res.error || 'No se pudo registrar el pedido en el servidor');
      }

      // Vaciar carrito tras emisión exitosa
      clearCart();

      // Abrir modal de ticket confirmado
      setTicketConfirmadoModal(true);
    } catch (err: any) {
      console.error('Error al emitir pedido:', err);
      setErrorPedido(err.message || 'Ocurrió un problema al procesar el pedido. Por favor intenta de nuevo.');
    } finally {
      setProcesandoPedido(false);
    }
  };

  const handleConfirmarPedidoWhatsApp = () => {
    let mensaje = `Hola Galindo Barber Supply (${sedeActual.nombre}).\n`;
    mensaje += `He generado mi orden para RECOJO EN TIENDA FÍSICA:\n\n`;
    mensaje += `*CÓDIGO DE TICKET:* ${codigoOrden}\n`;
    mensaje += `*CLIENTE:* ${nombre || 'Cliente Web'}\n`;
    mensaje += `*CELULAR:* ${telefono || 'No especificado'}\n`;
    if (numeroDocumento) mensaje += `*${tipoDocumento}:* ${numeroDocumento}\n`;
    localItems.forEach((item, idx) => {
      const precio = item.producto.precio_oferta || item.producto.precio_venta;
      mensaje += `${idx + 1}. ${item.producto.nombre}\n   SKU: ${item.producto.sku}\n   Cant: ${item.cantidad} un. x S/ ${precio.toFixed(2)} = S/ ${(precio * item.cantidad).toFixed(2)}\n`;
    });

    mensaje += `\n*TOTAL A PAGAR:* S/ ${totalCalculado.toFixed(2)}\n`;
    mensaje += `*MÉTODO DE PAGO:* ${metodoPago}\n`;
    if (metodoPago === 'EFECTIVO' && vueltoCalculado > 0) {
      mensaje += `*PAGA CON:* S/ ${valorBillete.toFixed(2)} (Vuelto requerido: S/ ${vueltoCalculado.toFixed(2)})\n`;
    }
    mensaje += `\n*PUNTO DE RECOJO SELECCIONADO:*\n`;
    mensaje += `🏢 *${sedeActual.nombre.toUpperCase()}*\n`;
    mensaje += `📍 Dirección: ${sedeActual.direccionCompleta}\n`;
    mensaje += `📱 WhatsApp de Sede: ${sedeActual.whatsappDisplay}\n`;
    if (notas) mensaje += `\n*INDICACIONES:* ${notas}\n`;
    mensaje += `\nPor favor separen los productos en el mostrador de ${sedeActual.nombre} para acercarme a retirar. ¡Muchas gracias!`;

    const link = generateWhatsAppLink(sedeActual.whatsapp, mensaje);
    window.open(link, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900 selection:bg-black selection:text-white">
      <Navbar />

      {/* Barra de Progreso Lúdica con Estilo Barber Pole */}
      <div className="w-full bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-zinc-900">{sedeActual.nombre}</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-500">{sedeActual.direccion}</span>
            </div>

            <div className="flex items-center gap-4 text-zinc-500 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-zinc-900 font-bold">
                <Store className="w-3.5 h-3.5" />
                Exclusivo Recojo Físico
              </span>
              <span className="hidden sm:inline text-zinc-300">|</span>
              <span className="hidden sm:flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Prep. 15 min
              </span>
              <span className="hidden sm:inline text-zinc-300">|</span>
              <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Envío S/ 0.00
              </span>
            </div>
          </div>
        </div>
        
        {/* Barber Pole Striping Ribbon sutil */}
        <div 
          className="h-1 w-full opacity-30" 
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #09090b, #09090b 10px, #ffffff 10px, #ffffff 20px)'
          }} 
        />
      </div>

      {/* Header Breve con Retorno */}
      <section className="bg-white border-b border-zinc-200 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tienda"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs transition-colors border border-zinc-200 cursor-pointer shadow-2xs group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Volver a la Tienda</span>
            </Link>
            <div className="border-l border-zinc-200 pl-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-semibold">
                Paso Final • Pedido Presencial
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight flex items-center gap-2">
                <span>Checkout & Ticket de Recojo</span>
                <Scissors className="w-5 h-5 text-zinc-400 rotate-90 hidden sm:inline-block" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-700 bg-zinc-50 px-3.5 py-2 rounded-xl border border-zinc-200">
              <Ticket className="w-4 h-4 text-zinc-900" />
              <span>Ticket: <strong className="text-black font-bold">{codigoOrden}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================
              COLUMNA IZQUIERDA (7 COLS): Datos, Pago, Sede, Notas
             ======================================================== */}
          <div className="lg:col-span-7 space-y-6">

            {/* SECCIÓN 1: Desglose de Artículos con Edición Directa */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
                    1
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                    Artículos Seleccionados ({localItems.reduce((a, b) => a + b.cantidad, 0)})
                  </h2>
                </div>
              </div>

              {/* Lista interactiva con Steppers */}
              <div className="space-y-3">
                {localItems.length === 0 ? (
                  <div className="text-center py-8 space-y-3 bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                    <ShoppingCart className="w-8 h-8 mx-auto text-zinc-400" />
                    <p className="text-xs font-semibold text-zinc-700">No hay artículos en tu lista</p>
                    <Link
                      href="/tienda"
                      className="inline-block px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Ver Catálogo de Barbería
                    </Link>
                  </div>
                ) : (
                  localItems.map((item) => {
                    const precioUnitario = item.producto.precio_oferta || item.producto.precio_venta;

                    return (
                      <motion.div
                        layout
                        key={item.producto.id}
                        className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 group hover:border-zinc-300 transition-all"
                      >
                        <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0 border border-zinc-200">
                          <img
                            src={item.producto.imagenes[0]}
                            alt={item.producto.nombre}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-zinc-950 truncate">
                            {item.producto.nombre}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                            <span>SKU: {item.producto.sku}</span>
                            <span>•</span>
                            <span className="font-semibold text-zinc-800">
                              {formatCurrency(precioUnitario)} c/u
                            </span>
                          </div>
                          <p className="text-xs font-black text-zinc-950 mt-1 font-mono">
                            Subtotal: {formatCurrency(precioUnitario * item.cantidad)}
                          </p>

                          {/* Estado de stock en la sede elegida */}
                          {item.tipo !== 'matricula' && (
                            (() => {
                              const stockEnSede = sedeSeleccionada === 'ica' 
                                ? (item.producto.stock_ica ?? item.producto.stock) 
                                : (item.producto.stock_huancayo ?? 0);
                              const stockOtraSede = sedeSeleccionada === 'ica'
                                ? (item.producto.stock_huancayo ?? 0)
                                : (item.producto.stock_ica ?? item.producto.stock);

                              if (stockEnSede <= 0) {
                                return (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>
                                      Agotado en {sedeActual.ciudad}
                                      {stockOtraSede > 0 ? ` (Hay ${stockOtraSede} un. en ${SEDES[sedeSeleccionada === 'ica' ? 'huancayo' : 'ica'].ciudad})` : ''}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>

                        {/* Stepper + / - */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center border border-zinc-200 rounded-lg bg-white shadow-2xs overflow-hidden">
                            <button
                              onClick={() => handleModificarCantidad(item.producto.id, -1)}
                              className="px-2 py-1.5 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors"
                              aria-label="Restar uno"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold font-mono text-zinc-950">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => handleModificarCantidad(item.producto.id, 1)}
                              className="px-2 py-1.5 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors"
                              aria-label="Aumentar uno"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleEliminarItem(item.producto.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50"
                            title="Quitar artículo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* SECCIÓN 2: Datos del Cliente que retira */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
                    2
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                    Datos del Comprador
                  </h2>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Para rotular tu paquete</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-800 mb-1.5">
                    Nombres y Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: David García Morales"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-800 mb-1.5">
                    WhatsApp para avisarte cuando esté listo *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 956 123 456"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-400 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-zinc-800 text-xs">
                      Documento del Titular (Boleta)
                    </label>
                    {/* Selector interactivo DNI / CE */}
                    <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoDocumento('DNI');
                          setNumeroDocumento((prev) => prev.slice(0, 8).replace(/\D/g, ''));
                        }}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          tipoDocumento === 'DNI'
                            ? 'bg-black text-white shadow-xs'
                            : 'text-zinc-600 hover:text-black'
                        }`}
                      >
                        DNI
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDocumento('CE')}
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          tipoDocumento === 'CE'
                            ? 'bg-black text-white shadow-xs'
                            : 'text-zinc-600 hover:text-black'
                        }`}
                      >
                        C.E.
                      </button>
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[11px] font-mono font-bold text-zinc-400 select-none">
                      {tipoDocumento}:
                    </span>
                    <input
                      type="text"
                      maxLength={tipoDocumento === 'DNI' ? 8 : 12}
                      placeholder={
                        tipoDocumento === 'DNI'
                          ? '8 dígitos (ej: 74829103)'
                          : 'N° Carné de Extranjería (ej: 001234567)'
                      }
                      value={numeroDocumento}
                      onChange={(e) => {
                        const val =
                          tipoDocumento === 'DNI'
                            ? e.target.value.replace(/\D/g, '').slice(0, 8)
                            : e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
                        setNumeroDocumento(val);
                      }}
                      className="w-full pl-14 pr-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-400 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-800 mb-1.5">
                    Indicación adicional o mensaje
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Paso después de las 5pm..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:border-black outline-none transition-all placeholder:text-zinc-400"
                  />
                </div>
              </div>


            </motion.div>

            {/* SECCIÓN 3: Método de Pago Interactivo & Simulador */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
                    3
                  </div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                    ¿Cómo prefieres pagar tu pedido?
                  </h2>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">Pagas al retirar o digital</span>
              </div>

              {/* Selector de Métodos de Pago */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Yape */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('YAPE')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    metodoPago === 'YAPE'
                      ? 'border-black bg-zinc-950 text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold block">Yape</span>
                  <span className={`text-[10px] font-mono ${metodoPago === 'YAPE' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    {BUSINESS_INFO.yapeNumber}
                  </span>
                  {metodoPago === 'YAPE' && (
                    <motion.div
                      layoutId="check-payment"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </motion.div>
                  )}
                </button>

                {/* Plin */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('PLIN')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    metodoPago === 'PLIN'
                      ? 'border-black bg-zinc-950 text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold block">Plin</span>
                  <span className={`text-[10px] font-mono ${metodoPago === 'PLIN' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    BBVA / Interbank
                  </span>
                  {metodoPago === 'PLIN' && (
                    <motion.div
                      layoutId="check-payment"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </motion.div>
                  )}
                </button>

                {/* Efectivo en Tienda */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('EFECTIVO')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    metodoPago === 'EFECTIVO'
                      ? 'border-black bg-zinc-950 text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-bold block">Efectivo</span>
                  <span className={`text-[10px] font-mono ${metodoPago === 'EFECTIVO' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    En Mostrador
                  </span>
                  {metodoPago === 'EFECTIVO' && (
                    <motion.div
                      layoutId="check-payment"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </motion.div>
                  )}
                </button>

                {/* Transferencia BCP */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('TRANSFERENCIA')}
                  className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    metodoPago === 'TRANSFERENCIA'
                      ? 'border-black bg-zinc-950 text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold block">BCP Soles</span>
                  <span className={`text-[10px] font-mono ${metodoPago === 'TRANSFERENCIA' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    Ahorros / CCI
                  </span>
                  {metodoPago === 'TRANSFERENCIA' && (
                    <motion.div
                      layoutId="check-payment"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </motion.div>
                  )}
                </button>


              </div>

              {/* SIMULADOR INTERACTIVO SEGÚN EL MÉTODO */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={metodoPago}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-3"
                >
                  {/* CASO: YAPE / PLIN */}
                  {(metodoPago === 'YAPE' || metodoPago === 'PLIN') && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-950 text-sm">
                            Número {metodoPago}:
                          </span>
                          <span className="font-mono text-base font-black text-black bg-white px-2 py-0.5 rounded border border-zinc-300">
                            {BUSINESS_INFO.yapeNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Titular registrado: <strong>{BUSINESS_INFO.yapeHolder}</strong>
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          Monto exacto a transferir: <strong className="font-mono">{formatCurrency(totalCalculado)}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopiarTexto(BUSINESS_INFO.yapeNumber, 'yape')}
                        className="px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 hover:border-black font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                      >
                        {copiadoYape ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">¡Número Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Número</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* CASO: EFECTIVO (Calculadora de Vuelto) */}
                  {metodoPago === 'EFECTIVO' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-zinc-950 font-bold">
                        <Banknote className="w-4 h-4 text-zinc-700" />
                        <span>Calculadora de Vuelto para Mostrador</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Indícanos con qué billete pagarás para tener listo tu cambio exacto en caja y no hacerte esperar:
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBilleteEfectivo('exacto')}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            billeteEfectivo === 'exacto'
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          Monto Exacto
                        </button>
                        <button
                          type="button"
                          onClick={() => setBilleteEfectivo(50)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            billeteEfectivo === 50
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          S/ 50.00
                        </button>
                        <button
                          type="button"
                          onClick={() => setBilleteEfectivo(100)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            billeteEfectivo === 100
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          S/ 100.00
                        </button>
                        <button
                          type="button"
                          onClick={() => setBilleteEfectivo(200)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold cursor-pointer transition-colors ${
                            billeteEfectivo === 200
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          S/ 200.00
                        </button>
                      </div>

                      {/* Resultado de la calculadora */}
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200 flex items-center justify-between text-xs">
                        <span className="text-zinc-600">
                          {billeteEfectivo === 'exacto'
                            ? 'Pagarás la suma exacta:'
                            : `Vuelto a prepararte con billete de S/ ${valorBillete.toFixed(2)}:`}
                        </span>
                        <span className="font-mono font-black text-zinc-950 text-sm">
                          {billeteEfectivo === 'exacto'
                            ? formatCurrency(totalCalculado)
                            : formatCurrency(vueltoCalculado)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CASO: TRANSFERENCIA BCP */}
                  {metodoPago === 'TRANSFERENCIA' && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200">
                        <div>
                          <span className="font-bold text-zinc-950 text-xs">Cuenta de Ahorros BCP Soles: </span>
                          <div className="font-mono font-black text-sm text-zinc-950 bg-white px-2 py-1 rounded border border-zinc-300 inline-block mt-0.5">
                            {BUSINESS_INFO.bcpAccount}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpAccount, 'bcp')}
                          className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 hover:border-black font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all self-start sm:self-auto"
                        >
                          {copiadoBcp ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">¡Cuenta Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Cuenta</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs text-zinc-600 font-medium">Número de CCI BCP: </span>
                          <div className="font-mono font-bold text-xs text-zinc-800 bg-white px-2 py-0.5 rounded border border-zinc-200 inline-block mt-0.5">
                            {BUSINESS_INFO.bcpCci}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpCci.replace(/-/g, ''), 'cci')}
                          className="text-xs font-bold text-zinc-800 hover:text-black underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                        >
                          {copiadoCci ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">¡CCI Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar CCI</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-[11px] text-zinc-600 pt-1 border-t border-zinc-200/60 flex items-center gap-1.5">
                        <span className="text-zinc-400">Titular de Cuenta:</span>
                        <strong className="text-zinc-950">{BUSINESS_INFO.bcpHolder}</strong>
                      </div>
                    </div>
                  )}


                </motion.div>
              </AnimatePresence>
            </motion.div>



          </div>

          {/* ========================================================
              COLUMNA DERECHA (5 COLS): El Ticket de Barbería Impreso
             ======================================================== */}
          <div className="lg:col-span-5 sticky top-24">
            
            {/* Simulación de la ranura de salida de la impresora térmica */}
            <div className="w-11/12 mx-auto h-2 bg-zinc-300 rounded-t-full shadow-inner mb-[-4px] relative z-0 opacity-80" />

            {/* TICKET DE RECIBO CON DISEÑO DE BARBERÍA */}
            <motion.div
              id="ticket-imprimible-oficial"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              className="bg-white border-2 border-zinc-900 rounded-3xl shadow-xl overflow-hidden relative z-10"
            >
              {/* Encabezado del Ticket con Logo Circular de Galindo */}
              <div className="p-6 bg-zinc-950 text-white text-center space-y-2 relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 mx-auto shadow-md bg-white p-0.5">
                  <img src="/logo.jpg" alt="Galindo Barber" className="w-full h-full object-cover rounded-full" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest font-mono">
                  Galindo Barber Supply
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {sedeActual.nombre.toUpperCase()} • TICKET #{codigoOrden}
                </p>


              </div>

              {/* Perforación de papel con muescas circulares */}
              <div className="border-b-2 border-dashed border-zinc-300 relative py-1.5 bg-zinc-50">
                <div className="absolute -left-3.5 -top-3 w-6 h-6 rounded-full bg-[#FAFAFA] border-r-2 border-zinc-900" />
                <div className="absolute -right-3.5 -top-3 w-6 h-6 rounded-full bg-[#FAFAFA] border-l-2 border-zinc-900" />
              </div>

              {/* Cuerpo del Recibo */}
              <div className="p-6 space-y-4 text-xs">
                
                {/* Metadatos Rápidos */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pb-3 border-b border-zinc-100 text-zinc-500">
                  <div>
                    <span className="block text-[9px] uppercase text-zinc-400">Cliente:</span>
                    <strong className="text-zinc-950 truncate block">
                      {nombre || 'Por confirmar en mostrador'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-zinc-400">
                      {numeroDocumento ? `${tipoDocumento}:` : 'Teléfono:'}
                    </span>
                    <strong className="text-zinc-950 block truncate">
                      {numeroDocumento || telefono || 'No indicado'}
                    </strong>
                  </div>
                </div>

                {/* Desglose de Artículos */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Detalle de Herramientas ({localItems.length})
                  </span>

                  {localItems.map((item) => {
                    const precioUnitario = item.producto.precio_oferta || item.producto.precio_venta;

                    return (
                      <div
                        key={item.producto.id}
                        className="flex items-center justify-between gap-2 py-1.5 border-b border-zinc-100 text-zinc-800"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-950 truncate">
                            {item.producto.nombre}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {item.cantidad} un. x {formatCurrency(precioUnitario)}
                          </p>
                        </div>
                        <span className="font-bold font-mono text-zinc-950 shrink-0">
                          {formatCurrency(precioUnitario * item.cantidad)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotales y Métodos */}
                <div className="pt-2 border-t border-zinc-200 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totalCalculado)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Recojo en {sedeActual.nombre}:</span>
                    <span className="font-bold text-zinc-950">S/ 0.00 (Gratis)</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>Dirección:</span>
                    <span className="font-medium text-right text-zinc-700">{sedeActual.direccion}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Método de Pago:</span>
                    <span className="font-bold text-zinc-950">
                      {metodoPago}
                    </span>
                  </div>

                  {metodoPago === 'EFECTIVO' && billeteEfectivo !== 'exacto' && (
                    <div className="flex justify-between text-zinc-600 text-[11px]">
                      <span>Vuelto Estimado:</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(vueltoCalculado)}
                      </span>
                    </div>
                  )}



                  <div className="flex justify-between text-base font-black text-zinc-950 pt-2 border-t-2 border-zinc-900">
                    <span>TOTAL:</span>
                    <span className="text-xl font-black">{formatCurrency(totalCalculado)}</span>
                  </div>
                </div>


                {/* Alerta de Error si faltan datos o falla el guardado */}
                {errorPedido && (
                  <div data-ignore-pdf="true" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorPedido}</span>
                  </div>
                )}

                {/* Aceptación obligatoria de Términos y Condiciones y Privacidad (Ley N° 29733 y Ley N° 29571) */}
                <div data-ignore-pdf="true" className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aceptaTerminos}
                      onChange={(e) => setAceptaTerminos(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer mt-0.5 shrink-0 accent-black"
                    />
                    <span className="leading-snug">
                      He leído y acepto los{' '}
                      <Link href="/terminos" target="_blank" className="font-bold underline text-zinc-950 hover:text-black">
                        Términos y Condiciones
                      </Link>{' '}
                      y la{' '}
                      <Link href="/privacidad" target="_blank" className="font-bold underline text-zinc-950 hover:text-black">
                        Política de Privacidad
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                {/* BOTÓN PRINCIPAL DE GENERACIÓN Y CONFIRMACIÓN (Ignorados al imprimir PDF) */}
                <div data-ignore-pdf="true" className="space-y-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleConfirmarYEmitirPedido}
                    disabled={procesandoPedido}
                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider bg-black text-white hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {procesandoPedido ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Registrando en el Sistema...</span>
                      </>
                    ) : (
                      <span>Finalizar Compra</span>
                    )}
                  </motion.button>


                </div>

                <p data-ignore-pdf="true" className="text-[10px] text-zinc-500 text-center leading-relaxed">
                  Al confirmar, tu ticket quedará registrado con el código <strong className="text-zinc-800 font-mono">{codigoOrden}</strong> y podrás presentarlo en tienda o enviarlo a WhatsApp.
                </p>



              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* ========================================================
          MODAL JUGUETÓN DE CONFIRMACIÓN DE TICKET
         ======================================================== */}
      <AnimatePresence>
        {ticketConfirmadoModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-2 border-zinc-900 text-center space-y-5 z-10"
            >
              {/* Icono de Éxito Premium */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white flex items-center justify-center mx-auto shadow-[0_10px_40px_rgba(16,185,129,0.4)] relative mb-2 mt-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                >
                  <Check className="w-10 h-10 stroke-[3]" />
                </motion.div>
                {/* Ping ring */}
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-emerald-400"
                  initial={{ scale: 1, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                />
              </motion.div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 block font-bold">
                  ¡OPERACIÓN EXITOSA!
                </span>
                <h3 className="text-2xl font-black text-zinc-950 uppercase tracking-tight mt-1">
                  Compra Confirmada
                </h3>
                <p className="text-xs text-zinc-600 mt-1.5">
                  ¡Genial! Tu pedido ya está registrado y separado para ti en <strong className="text-zinc-900">{sedeActual.nombre}</strong>.
                </p>
              </div>

              {/* Resumen en tarjeta tipo comprobante */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">CÓDIGO:</span>
                  <strong className="text-black font-bold">{codigoOrden}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CLIENTE:</span>
                  <span className="text-zinc-900 font-bold">{nombre || 'Cliente Web'}</span>
                </div>
                {numeroDocumento && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{tipoDocumento}:</span>
                    <span className="text-zinc-900 font-bold font-mono">{numeroDocumento}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">PAGO:</span>
                  <span className="text-zinc-900 font-bold">
                    {metodoPago}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SEDE RECOJO:</span>
                  <span className="text-zinc-900 font-bold">{sedeActual.nombre} ({sedeActual.direccion})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">WHATSAPP SEDE:</span>
                  <span className="text-emerald-700 font-bold">{sedeActual.whatsappDisplay}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 text-sm font-black">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(totalCalculado)}</span>
                </div>
              </div>

              {/* Botón de Descargar PDF y Enviar a WhatsApp */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDescargarPDF}
                  disabled={generandoPdf}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-black text-white hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {generandoPdf
                      ? 'Generando PDF Oficial...'
                      : pdfDescargado
                      ? '¡Ticket Descargado con Éxito!'
                      : 'Descargar Ticket en PDF (Para Tienda)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmarPedidoWhatsApp}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Enviar Orden al WhatsApp de {sedeActual.nombre}</span>
                </button>

                <Link
                  href="/tienda"
                  onClick={() => setTicketConfirmadoModal(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-zinc-700 hover:text-black hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 border border-zinc-200"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Seguir Comprando en la Tienda</span>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
