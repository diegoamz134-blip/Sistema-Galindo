'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Copy,
  Store,
  MapPin,
  Clock,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
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

type MetodoPagoCheckout = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'MIXTO';

export default function CheckoutPage() {
  const {
    cartItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    addToCart,
    clearCart,
    sedeSeleccionada,
    setSedeSeleccionada,
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

  // Método de pago y cálculos interactivos
  const [metodoPago, setMetodoPago] = useState<MetodoPagoCheckout>('YAPE');
  const [billeteEfectivo, setBilleteEfectivo] = useState<number | 'exacto'>('exacto');
  const [montoBilletePersonalizado, setMontoBilletePersonalizado] = useState('');
  const [copiadoYape, setCopiadoYape] = useState(false);
  const [copiadoBcp, setCopiadoBcp] = useState(false);
  const [copiadoCci, setCopiadoCci] = useState(false);
  const [codigoOrden, setCodigoOrden] = useState('GAL-2026-8492');

  // Estados para Pago Cruzado (Efectivo + Digital: Yape / Plin / BCP)
  type CanalDigitalCruzado = 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  const [canalDigitalCruzado, setCanalDigitalCruzado] = useState<CanalDigitalCruzado>('YAPE');
  const [montoMixtoEfectivo, setMontoMixtoEfectivo] = useState<string>('');
  const [montoMixtoDigital, setMontoMixtoDigital] = useState<string>('');
  const [modoEdicionCruzado, setModoEdicionCruzado] = useState<'efectivo' | 'digital'>('efectivo');

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

  // Cálculos para Pago Cruzado (Efectivo + Digital)
  const mitadPorDefecto = Number((totalCalculado / 2).toFixed(2));

  let numEfectivo: number;
  let numDigital: number;

  if (modoEdicionCruzado === 'digital') {
    const dVal = parseFloat(montoMixtoDigital);
    if (isNaN(dVal) || montoMixtoDigital === '') {
      numDigital = mitadPorDefecto;
      numEfectivo = Number((totalCalculado - numDigital).toFixed(2));
    } else {
      numDigital = Math.min(totalCalculado, Math.max(0, dVal));
      numEfectivo = Math.max(0, Number((totalCalculado - numDigital).toFixed(2)));
    }
  } else {
    const eVal = parseFloat(montoMixtoEfectivo);
    if (isNaN(eVal) || montoMixtoEfectivo === '') {
      numEfectivo = mitadPorDefecto;
      numDigital = Number((totalCalculado - numEfectivo).toFixed(2));
    } else {
      numEfectivo = Math.min(totalCalculado, Math.max(0, eVal));
      numDigital = Math.max(0, Number((totalCalculado - numEfectivo).toFixed(2)));
    }
  }

  const handleCambioEfectivo = (val: string) => {
    setMontoMixtoEfectivo(val);
    setModoEdicionCruzado('efectivo');
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.min(totalCalculado, Math.max(0, num));
      setMontoMixtoDigital(Math.max(0, Number((totalCalculado - clamped).toFixed(2))).toString());
    } else {
      setMontoMixtoDigital('');
    }
  };

  const handleCambioDigital = (val: string) => {
    setMontoMixtoDigital(val);
    setModoEdicionCruzado('digital');
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.min(totalCalculado, Math.max(0, num));
      setMontoMixtoEfectivo(Math.max(0, Number((totalCalculado - clamped).toFixed(2))).toString());
    } else {
      setMontoMixtoEfectivo('');
    }
  };

  const handlePresetCruzado = (tipo: '50' | 'efectivo' | 'digital') => {
    if (tipo === '50') {
      const mitad = Number((totalCalculado / 2).toFixed(2));
      setMontoMixtoEfectivo(mitad.toString());
      setMontoMixtoDigital(Number((totalCalculado - mitad).toFixed(2)).toString());
      setModoEdicionCruzado('efectivo');
    } else if (tipo === 'efectivo') {
      setMontoMixtoEfectivo(totalCalculado.toString());
      setMontoMixtoDigital('0');
      setModoEdicionCruzado('efectivo');
    } else {
      setMontoMixtoEfectivo('0');
      setMontoMixtoDigital(totalCalculado.toString());
      setModoEdicionCruzado('digital');
    }
  };

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
          metodoPago === 'MIXTO'
            ? {
                efectivo: numEfectivo,
                digital: numDigital,
                canalDigital: canalDigitalCruzado,
              }
            : metodoPago === 'EFECTIVO'
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
    if (metodoPago === 'MIXTO') {
      const nombreCanal =
        canalDigitalCruzado === 'TRANSFERENCIA'
          ? 'Transferencia BCP'
          : canalDigitalCruzado;
      mensaje += `*MÉTODO DE PAGO:* PAGO CRUZADO (Efectivo + ${nombreCanal})\n`;
      mensaje += `💵 *Parte en Efectivo (Mostrador):* S/ ${numEfectivo.toFixed(2)}\n`;
      mensaje += `📱 *Parte por ${nombreCanal}:* S/ ${numDigital.toFixed(2)}`;
      if (canalDigitalCruzado === 'TRANSFERENCIA') {
        mensaje += ` (A cuenta BCP: ${BUSINESS_INFO.bcpAccount} - ${BUSINESS_INFO.bcpHolder})\n`;
      } else {
        mensaje += ` (Al ${BUSINESS_INFO.yapeNumber} - ${BUSINESS_INFO.yapeHolder})\n`;
      }
    } else {
      mensaje += `*MÉTODO DE PAGO:* ${metodoPago}\n`;
      if (metodoPago === 'EFECTIVO' && vueltoCalculado > 0) {
        mensaje += `*PAGA CON:* S/ ${valorBillete.toFixed(2)} (Vuelto requerido: S/ ${vueltoCalculado.toFixed(2)})\n`;
      }
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
                    Datos del Barbero / Comprador
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

              {/* Botones rápidos de notas ("Chips juguetones") */}
              <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
                  Toques rápidos para tu pedido:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS_BARBERO.map((tag) => {
                    const estaActivo = notas.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          estaActivo
                            ? 'bg-zinc-900 text-white border-black font-semibold'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {estaActivo && <Check className="w-3 h-3 text-emerald-400" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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

                {/* Pago Cruzado (Mixto: Efectivo + Yape) */}
                <button
                  type="button"
                  onClick={() => setMetodoPago('MIXTO')}
                  className={`col-span-2 sm:col-span-1 p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                    metodoPago === 'MIXTO'
                      ? 'border-indigo-600 bg-indigo-950 text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <ArrowLeftRight className={`w-5 h-5 ${metodoPago === 'MIXTO' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span className="text-xs font-bold block">Pago Cruzado</span>
                  <span className={`text-[10px] font-mono ${metodoPago === 'MIXTO' ? 'text-indigo-200' : 'text-zinc-400'}`}>
                    Efectivo + Digital
                  </span>
                  {metodoPago === 'MIXTO' && (
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

                  {/* CASO: PAGO CRUZADO (EFECTIVO + DIGITAL) */}
                  {metodoPago === 'MIXTO' && (
                    <div className="space-y-4">
                      {/* Cabecera explicativa */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
                        <div>
                          <div className="flex items-center gap-2 text-zinc-950 font-bold text-sm">
                            <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                            <span>Pago Combinado / Cruzado</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Indica cuánto pagas en efectivo y cuánto de forma digital (Yape, Plin o Transferencia).
                          </p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl text-left sm:text-right self-start sm:self-auto">
                          <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                            Total a Cubrir
                          </span>
                          <span className="text-sm font-black font-mono text-indigo-950">
                            {formatCurrency(totalCalculado)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de atajo rápido */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-bold text-zinc-500 mr-1">Reparto rápido:</span>
                        <button
                          type="button"
                          onClick={() => handlePresetCruzado('50')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          Mitad y Mitad (50% / 50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetCruzado('efectivo')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          Pagar Todo en Efectivo
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetCruzado('digital')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          Pagar Todo Digital
                        </button>
                      </div>

                      {/* Las 2 Cajas Principales: PARTE 1 (EFECTIVO) y PARTE 2 (DIGITAL) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* CAJA 1: EFECTIVO */}
                        <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xs space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                                1. Pago en Efectivo
                              </span>
                              <span className="text-[10px] text-zinc-500">Pagas en mostrador al recoger</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-zinc-800 block mb-1">
                              ¿Cuánto pagarás en efectivo?
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">
                                S/
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={totalCalculado}
                                step="any"
                                value={modoEdicionCruzado === 'efectivo' ? montoMixtoEfectivo : numEfectivo}
                                onChange={(e) => handleCambioEfectivo(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-black text-base focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-zinc-50/50"
                              />
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                            Pagas en mostrador: <strong className="font-mono font-bold">S/ {numEfectivo.toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* CAJA 2: DIGITAL (YAPE / PLIN / BCP) */}
                        <div className="p-4 rounded-2xl bg-white border-2 border-purple-500/40 shadow-xs space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-purple-950 block">
                                2. Pago Digital
                              </span>
                              <span className="text-[10px] text-zinc-500">Yape, Plin o Transferencia</span>
                            </div>
                          </div>

                          {/* Selector de Canal Digital */}
                          <div>
                            <label className="text-xs font-bold text-zinc-800 block mb-1">
                              ¿Por qué medio digital pagarás?
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCanalDigitalCruzado('YAPE')}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border text-center ${
                                  canalDigitalCruzado === 'YAPE'
                                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                                }`}
                              >
                                Yape
                              </button>
                              <button
                                type="button"
                                onClick={() => setCanalDigitalCruzado('PLIN')}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border text-center ${
                                  canalDigitalCruzado === 'PLIN'
                                    ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                                }`}
                              >
                                Plin
                              </button>
                              <button
                                type="button"
                                onClick={() => setCanalDigitalCruzado('TRANSFERENCIA')}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border text-center ${
                                  canalDigitalCruzado === 'TRANSFERENCIA'
                                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                                    : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                                }`}
                              >
                                BCP Soles
                              </button>
                            </div>
                          </div>

                          {/* Input de Monto Digital */}
                          <div>
                            <label className="text-xs font-bold text-zinc-800 block mb-1">
                              Monto a pagar por {canalDigitalCruzado === 'TRANSFERENCIA' ? 'Transferencia BCP' : canalDigitalCruzado}:
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">
                                S/
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={totalCalculado}
                                step="any"
                                value={modoEdicionCruzado === 'digital' ? montoMixtoDigital : numDigital}
                                onChange={(e) => handleCambioDigital(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-black text-base focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none bg-zinc-50/50"
                              />
                            </div>
                          </div>

                          {/* Datos Oficiales del Medio Digital Seleccionado */}
                          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
                            {canalDigitalCruzado === 'YAPE' && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-600 font-medium text-[11px]">Número Oficial de Yape:</span>
                                  <span className="font-mono font-black text-zinc-950 bg-white px-2 py-0.5 rounded border border-zinc-300">
                                    {BUSINESS_INFO.yapeNumber}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Titular: <strong>{BUSINESS_INFO.yapeHolder}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopiarTexto(BUSINESS_INFO.yapeNumber, 'yape')}
                                  className="w-full py-1.5 rounded-lg bg-white border border-purple-300 text-purple-950 hover:border-purple-600 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  {copiadoYape ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiadoYape ? '¡Número Copiado!' : `Copiar ${BUSINESS_INFO.yapeNumber}`}</span>
                                </button>
                              </>
                            )}

                            {canalDigitalCruzado === 'PLIN' && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-600 font-medium text-[11px]">Número Oficial de Plin:</span>
                                  <span className="font-mono font-black text-zinc-950 bg-white px-2 py-0.5 rounded border border-zinc-300">
                                    {BUSINESS_INFO.yapeNumber}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Titular: <strong>{BUSINESS_INFO.yapeHolder}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopiarTexto(BUSINESS_INFO.yapeNumber, 'yape')}
                                  className="w-full py-1.5 rounded-lg bg-white border border-cyan-300 text-cyan-950 hover:border-cyan-600 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  {copiadoYape ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiadoYape ? '¡Número Copiado!' : `Copiar ${BUSINESS_INFO.yapeNumber}`}</span>
                                </button>
                              </>
                            )}

                            {canalDigitalCruzado === 'TRANSFERENCIA' && (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-600 font-medium text-[11px]">Cuenta BCP Soles:</span>
                                  <span className="font-mono font-black text-zinc-950 bg-white px-1.5 py-0.5 rounded border border-zinc-300 text-[11px]">
                                    {BUSINESS_INFO.bcpAccount}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                                  <span>CCI:</span>
                                  <span>{BUSINESS_INFO.bcpCci}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Titular: <strong>{BUSINESS_INFO.bcpHolder}</strong>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpAccount, 'bcp')}
                                    className="py-1 px-1.5 rounded-lg bg-white border border-zinc-300 hover:border-black font-semibold text-[10px] text-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    {copiadoBcp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiadoBcp ? '¡Copiado!' : 'Copiar Cuenta'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpCci.replace(/-/g, ''), 'cci')}
                                    className="py-1 px-1.5 rounded-lg bg-white border border-zinc-300 hover:border-black font-semibold text-[10px] text-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    {copiadoCci ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiadoCci ? '¡CCI Copiado!' : 'Copiar CCI'}</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumen Total y Cuadre de Pago */}
                      <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-indigo-950 font-bold">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Resumen: S/ {numEfectivo.toFixed(2)} (Efectivo) + S/ {numDigital.toFixed(2)} ({canalDigitalCruzado === 'TRANSFERENCIA' ? 'BCP' : canalDigitalCruzado})
                          </span>
                        </div>
                        <div className="font-mono font-black text-indigo-950 text-sm">
                          = Total {formatCurrency(totalCalculado)}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* SECCIÓN 4: Selector Interactivo de Sede de Recojo Físico */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-black text-white text-xs font-mono font-bold flex items-center justify-center">
                    4
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-zinc-900" />
                    <span>¿En qué sede retirarás tus productos? *</span>
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Recojo Gratis S/ 0.00
                </span>
              </div>

              <p className="text-xs text-zinc-600">
                Selecciona la sede física donde te acercarás a mostrador. El ticket y el WhatsApp se dirigirán al número de la sede elegida:
              </p>

              {/* Selector de Tarjetas para las Dos Sedes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(Object.keys(SEDES) as SedeId[]).map((key) => {
                  const sede = SEDES[key];
                  const isSelected = sedeSeleccionada === key;

                  return (
                    <div
                      key={key}
                      onClick={() => setSedeSeleccionada(key)}
                      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                        isSelected
                          ? 'border-black bg-zinc-900 text-white shadow-md'
                          : 'border-zinc-200 bg-zinc-50 hover:bg-white hover:border-zinc-300 text-zinc-800'
                      }`}
                    >
                      {/* Check de Selección */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            {sede.ciudad}
                          </span>
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-950'}`}>
                            {sede.nombre}
                          </span>
                        </div>

                        <p className={`text-xs font-semibold mt-2 ${isSelected ? 'text-zinc-200' : 'text-zinc-900'}`}>
                          {sede.direccion}
                        </p>
                        <p className={`text-[11px] ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {sede.referencia}
                        </p>
                      </div>

                      <div className={`pt-2.5 border-t text-[11px] font-mono space-y-1 ${
                        isSelected ? 'border-zinc-700 text-zinc-300' : 'border-zinc-200 text-zinc-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span>WhatsApp / Cel:</span>
                          <strong className={isSelected ? 'text-emerald-400' : 'text-emerald-700'}>
                            {sede.whatsappDisplay}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span>Horario:</span>
                          <span>{sede.horario}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-semibold ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {isSelected ? '✓ Sede Activa' : 'Clic para elegir'}
                        </span>
                        <a
                          href={sede.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[11px] font-bold hover:underline inline-flex items-center gap-1 ${
                            isSelected ? 'text-white' : 'text-zinc-950'
                          }`}
                        >
                          <span>Ver Mapa</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Banner informativo del envío */}
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-950 font-medium">
                    Atención directa al WhatsApp de <strong>{sedeActual.nombre}</strong> ({sedeActual.whatsappDisplay})
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                  Stock Local
                </span>
              </div>
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

                {/* Sello animado de verificación */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-mono tracking-wider uppercase border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Listo para Mostrador</span>
                </div>
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
                      {metodoPago === 'MIXTO'
                        ? `PAGO CRUZADO (Efectivo + ${canalDigitalCruzado === 'TRANSFERENCIA' ? 'BCP' : canalDigitalCruzado})`
                        : metodoPago}
                    </span>
                  </div>

                  {metodoPago === 'MIXTO' && (
                    <div className="py-2 px-2.5 rounded bg-zinc-50 border border-zinc-200 text-[10px] space-y-1 font-mono">
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>💵 Efectivo en Caja:</span>
                        <span>S/ {numEfectivo.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-purple-800 font-bold">
                        <span>📱 Por {canalDigitalCruzado === 'TRANSFERENCIA' ? 'BCP Soles' : canalDigitalCruzado}:</span>
                        <span>S/ {numDigital.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

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

                {/* Código de Barras de Barbería con Láser Animado */}
                <div className="pt-3 text-center space-y-1.5 border-t border-dashed border-zinc-300 relative overflow-hidden">
                  <div className="relative font-mono text-2xl tracking-[0.28em] text-zinc-900 select-none font-black opacity-85 py-1">
                    ||| | |||| || | ||||| | ||| ||
                    {/* Efecto láser sutil de scanner (ignorado en PDF) */}
                    <motion.div
                      data-ignore-pdf="true"
                      animate={{ x: [-120, 120] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      className="absolute inset-y-0 w-1 bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none left-1/2"
                    />
                  </div>
                  <p className="text-[9px] font-mono text-zinc-500 tracking-wider">
                    PRESENTE ESTE TICKET EN MOSTRADOR O POR WHATSAPP
                  </p>
                </div>

                {/* Alerta de Error si faltan datos o falla el guardado */}
                {errorPedido && (
                  <div data-ignore-pdf="true" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorPedido}</span>
                  </div>
                )}

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
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Confirmar & Emitir Ticket</span>
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleDescargarPDF}
                    disabled={generandoPdf}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-zinc-700" />
                    <span>
                      {generandoPdf
                        ? 'Generando PDF Oficial...'
                        : pdfDescargado
                        ? '¡Ticket Descargado con Éxito!'
                        : 'Descargar Ticket en PDF'}
                    </span>
                  </button>
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
              onClick={() => setTicketConfirmadoModal(false)}
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
              {/* Icono de Barbería y Éxito */}
              <div className="w-16 h-16 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mx-auto shadow-lg relative">
                <Scissors className="w-8 h-8 text-white rotate-45" />
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                  ¡Orden Generada con Éxito!
                </span>
                <h3 className="text-xl font-black text-zinc-950 uppercase tracking-tight mt-1">
                  Ticket de Recojo Oficial
                </h3>
                <p className="text-xs text-zinc-600 mt-1">
                  Tu pedido está reservado para ti en nuestra {sedeActual.nombre} ({sedeActual.direccion}).
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
                    {metodoPago === 'MIXTO'
                      ? `PAGO CRUZADO (S/ ${numEfectivo.toFixed(2)} Efectivo + S/ ${numDigital.toFixed(2)} ${canalDigitalCruzado === 'TRANSFERENCIA' ? 'BCP' : canalDigitalCruzado})`
                      : metodoPago}
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
