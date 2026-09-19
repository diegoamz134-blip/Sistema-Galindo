'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Download,
  Share2,
  Check,
  RotateCcw,
  Scissors,
  Barcode,
  ExternalLink,
  Smartphone,
  Send,
  Copy,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { VentaPOSData } from '@/lib/pos-service';
import { SEDES } from '@/lib/constants';
import { formatCurrency, generateWhatsAppLink, cn } from '@/lib/utils';
import { exportarTicketPDF, generarTicketPDFFile, puedeCompartirArchivosNativo } from '@/lib/ticket-pdf';

interface POSThermalTicketModalProps {
  isOpen: boolean;
  venta: VentaPOSData | null;
  onClose: () => void;
  onNuevaVenta: () => void;
}

export function POSThermalTicketModal({
  isOpen,
  venta,
  onClose,
  onNuevaVenta,
}: POSThermalTicketModalProps) {
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [pdfDescargado, setPdfDescargado] = useState(false);

  // Estados para solicitar el WhatsApp del cliente
  const [mostrarWhatsAppPrompt, setMostrarWhatsAppPrompt] = useState(false);
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [telefonoError, setTelefonoError] = useState('');
  const [whatsappEnviado, setWhatsappEnviado] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState(false);
  const [enviandoPdfWhatsApp, setEnviandoPdfWhatsApp] = useState(false);
  const [pdfDescargadoParaWA, setPdfDescargadoParaWA] = useState(false);

  // Sincronizar número si el cliente ya tenía uno registrado al agregar al carrito
  useEffect(() => {
    if (venta?.clienteTelefono) {
      const clean = venta.clienteTelefono.replace(/\D/g, '');
      setTelefonoWhatsApp(clean.slice(-9));
    } else {
      setTelefonoWhatsApp('');
    }
    setTelefonoError('');
    setWhatsappEnviado(false);
    setMensajeCopiado(false);
    setMostrarWhatsAppPrompt(false);
    setPdfDescargadoParaWA(false);
  }, [venta]);

  if (!isOpen || !venta) return null;

  const sedeActual = SEDES[venta.sedeId] || SEDES['ica'];
  const fechaHora = new Date().toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getUrlTicketDigital = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/ticket/${venta.codigoPedido}`;
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleDescargarPDF = async () => {
    setGenerandoPdf(true);
    try {
      const ok = await exportarTicketPDF('ticket-pos-imprimible', venta.codigoPedido);
      if (ok) {
        setPdfDescargado(true);
        setTimeout(() => setPdfDescargado(false), 3000);
      }
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Construye el mensaje completo de texto para enviar al cliente
  const generarTextoTicketWhatsApp = () => {
    let msg = `*GALINDO BARBER ACADEMY & SUPPLY*\n`;
    msg += `Ticket de Venta en Mostrador: *${venta.codigoPedido}*\n`;
    msg += `Fecha: ${fechaHora}\n`;
    msg += `Sede: ${sedeActual.nombre} (${sedeActual.direccion})\n`;
    msg += `Cliente: ${venta.clienteNombre || 'Cliente Mostrador'}\n\n`;
    msg += `*DETALLE DE PRODUCTOS:*\n`;

    venta.items.forEach((it, idx) => {
      msg += `${idx + 1}. ${it.producto.nombre}\n   Cant: ${it.cantidad} x S/ ${it.precioUnitario.toFixed(2)} = S/ ${it.subtotal.toFixed(2)}\n`;
    });

    if (venta.descuento > 0) {
      msg += `\nDescuento Especial: -S/ ${venta.descuento.toFixed(2)}\n`;
    }
    msg += `\n*TOTAL PAGADO:* S/ ${venta.total.toFixed(2)}\n`;
    msg += `*MÉTODO DE PAGO:* ${venta.metodoPago}\n`;

    if (venta.metodoPago === 'MIXTO' && venta.detallesPago) {
      msg += `↳ Efectivo: S/ ${(venta.detallesPago.efectivo || 0).toFixed(2)}\n`;
      msg += `↳ ${venta.detallesPago.canalDigital || 'Digital'}: S/ ${(venta.detallesPago.digital || 0).toFixed(2)}\n`;
    }

    msg += `\n🔗 Ver y descargar ticket en PDF:\n${getUrlTicketDigital()}\n`;
    msg += `\nAtendido por: ${venta.cajeroNombre}\n`;
    msg += `¡Muchas gracias por su preferencia en Galindo Barber! 💈✂️`;

    return msg;
  };

  // Validar y obtener el número formateado
  const obtenerTelefonoValido = (): string | null => {
    const rawDigits = telefonoWhatsApp.replace(/\D/g, '');
    if (!rawDigits) {
      setTelefonoError('Por favor ingresa el número de WhatsApp del cliente.');
      return null;
    }
    if (rawDigits.length < 9) {
      setTelefonoError('El número de celular debe tener 9 dígitos.');
      return null;
    }
    setTelefonoError('');
    return rawDigits.length === 9 ? `51${rawDigits}` : rawDigits;
  };

  // Enviar comprobante en formato PDF
  const handleEnviarWhatsAppPDF = async () => {
    const phoneToUse = obtenerTelefonoValido();
    if (!phoneToUse) return;

    setEnviandoPdfWhatsApp(true);
    setPdfDescargadoParaWA(false);

    try {
      const urlTicket = getUrlTicketDigital();

      // 1. En móviles (Android / iPhone) compartir directamente el archivo PDF
      if (puedeCompartirArchivosNativo()) {
        const file = await generarTicketPDFFile('ticket-pos-imprimible', venta.codigoPedido);
        if (file) {
          try {
            await navigator.share({
              files: [file],
              title: `Ticket Galindo Barber #${venta.codigoPedido}`,
              text: `Hola ${venta.clienteNombre || ''}, te adjuntamos tu ticket de compra en Galindo Barber #${venta.codigoPedido}.\nTambién puedes verlo aquí: ${urlTicket}`,
            });
            setWhatsappEnviado(true);
            setTimeout(() => setWhatsappEnviado(false), 4000);
            return;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') {
              return; // Usuario canceló la hoja de compartir
            }
          }
        }
      }

      // 2. En Desktop o si no soporta compartir archivos nativos:
      // a) Descargar automáticamente el PDF a la computadora
      await exportarTicketPDF('ticket-pos-imprimible', venta.codigoPedido);
      setPdfDescargadoParaWA(true);

      // b) Abrir chat de WhatsApp con mensaje listo y enlace
      let msg = `*GALINDO BARBER ACADEMY & SUPPLY*\n`;
      msg += `Hola *${venta.clienteNombre || 'estimado cliente'}*, te adjuntamos tu *Ticket de Compra en PDF* (Ticket *#${venta.codigoPedido}*).\n\n`;
      msg += `💈 Total: *S/ ${venta.total.toFixed(2)}*\n`;
      msg += `📍 Sede: *${sedeActual.nombre}*\n\n`;
      msg += `📄 También puedes consultar y descargar tu ticket en PDF directamente aquí:\n${urlTicket}\n\n`;
      msg += `¡Muchas gracias por su preferencia! 💈✂️`;

      const link = generateWhatsAppLink(phoneToUse, msg);
      window.open(link, '_blank');
      setWhatsappEnviado(true);
      setTimeout(() => setWhatsappEnviado(false), 5000);
    } catch (err) {
      console.error('Error al enviar PDF por WhatsApp:', err);
    } finally {
      setEnviandoPdfWhatsApp(false);
    }
  };

  // Enviar comprobante como texto formateado
  const handleEnviarWhatsAppTexto = () => {
    const phoneToUse = obtenerTelefonoValido();
    if (!phoneToUse) return;

    const msg = generarTextoTicketWhatsApp();
    const link = generateWhatsAppLink(phoneToUse, msg);
    
    window.open(link, '_blank');
    setWhatsappEnviado(true);
    setTimeout(() => setWhatsappEnviado(false), 4000);
  };

  // Handler al hacer clic en el botón WhatsApp inferior
  const handleToggleWhatsApp = () => {
    if (!mostrarWhatsAppPrompt) {
      setMostrarWhatsAppPrompt(true);
      setTelefonoError('');
    } else {
      if (telefonoWhatsApp.replace(/\D/g, '').length >= 9) {
        handleEnviarWhatsAppPDF();
      } else {
        setMostrarWhatsAppPrompt(false);
      }
    }
  };

  // Copiar el texto completo del comprobante al portapapeles
  const handleCopiarTexto = async () => {
    try {
      const msg = generarTextoTicketWhatsApp();
      await navigator.clipboard.writeText(msg);
      setMensajeCopiado(true);
      setTimeout(() => setMensajeCopiado(false), 3000);
    } catch {
      // Ignorar
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 z-10 space-y-4 max-h-[94vh] flex flex-col"
      >
        {/* Encabezado con estado de venta exitosa */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">¡Venta Registrada!</h3>
              <span className="text-[10px] font-mono text-zinc-400">Stock actualizado en vivo</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onNuevaVenta}
            className="px-3 py-1.5 rounded-xl bg-black text-white hover:bg-zinc-800 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nueva Venta</span>
          </button>
        </div>

        {/* =========================================================
            TICKET TÉRMICO FÍSICO DE 80MM / 90MM (ID imprimible)
           ========================================================= */}
        <div className="flex-1 overflow-y-auto p-1">
          <div
            id="ticket-pos-imprimible"
            className="bg-white p-5 rounded-2xl border-2 border-dashed border-zinc-300 font-mono text-xs text-zinc-950 space-y-3 shadow-inner"
          >
            {/* Cabecera del Ticket */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-300">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-300 mx-auto mb-1.5 shadow-2xs bg-white p-0.5">
                <img
                  src="/logo.jpg"
                  alt="Logo Galindo Barber"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h2 className="font-black text-sm tracking-tight uppercase leading-tight">
                GALINDO BARBER
              </h2>
              <p className="text-[10px] tracking-wider uppercase text-zinc-600">
                Academy & Supply EIRL
              </p>
              <p className="text-[9px] text-zinc-500">{sedeActual.nombre}</p>
              <p className="text-[9px] text-zinc-500">{sedeActual.direccionCompleta}</p>
              <p className="text-[9px] text-zinc-500 font-sans">Tel: {sedeActual.whatsappDisplay}</p>
            </div>

            {/* Datos de la Venta */}
            <div className="text-[10px] space-y-1 pb-2 border-b border-dashed border-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">TICKET:</span>
                <span className="font-bold">{venta.codigoPedido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">FECHA:</span>
                <span>{fechaHora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CLIENTE:</span>
                <span className="font-bold truncate max-w-[170px]">
                  {venta.clienteNombre || 'Cliente Mostrador'}
                </span>
              </div>
              {venta.clienteDni && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">DOC:</span>
                  <span>{venta.clienteDni}</span>
                </div>
              )}
              {telefonoWhatsApp && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span className="text-zinc-500 font-normal">TELÉFONO / WA:</span>
                  <span>+51 {telefonoWhatsApp}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">CAJERO:</span>
                <span>{venta.cajeroNombre}</span>
              </div>
            </div>

            {/* Detalle de Artículos */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-zinc-300">
              <div className="flex justify-between font-bold text-[10px] text-zinc-500 uppercase pb-0.5">
                <span>Cant / Producto</span>
                <span>Total</span>
              </div>
              {venta.items.map((it) => (
                <div key={it.producto.id} className="text-[11px] leading-tight space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold truncate max-w-[190px]">{it.producto.nombre}</span>
                    <span className="font-bold">{formatCurrency(it.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>
                      {it.cantidad} un. x {formatCurrency(it.precioUnitario)}
                    </span>
                    <span>SKU: {it.producto.sku}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totales y Pago */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-zinc-600">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(venta.subtotal)}</span>
              </div>
              {venta.descuento > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>DESCUENTO:</span>
                  <span>-{formatCurrency(venta.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-black pt-1 border-t border-black">
                <span>TOTAL:</span>
                <span>{formatCurrency(venta.total)}</span>
              </div>
            </div>

            {/* Desglose del Medio de Pago */}
            <div className="pt-2 border-t border-dashed border-zinc-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">MÉTODO:</span>
                <span className="font-bold uppercase">{venta.metodoPago}</span>
              </div>
              {venta.metodoPago === 'EFECTIVO' && venta.detallesPago && (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">PAGÓ CON:</span>
                    <span>{formatCurrency(venta.detallesPago.efectivo || venta.total)}</span>
                  </div>
                  {(venta.detallesPago.vuelto || 0) > 0 && (
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>VUELTO:</span>
                      <span>{formatCurrency(venta.detallesPago.vuelto || 0)}</span>
                    </div>
                  )}
                </>
              )}
              {venta.metodoPago === 'MIXTO' && venta.detallesPago && (
                <div className="space-y-0.5 pt-0.5 text-zinc-700">
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>↳ Efectivo:</span>
                    <span>{formatCurrency(venta.detallesPago.efectivo || 0)}</span>
                  </div>
                  <div className="flex justify-between text-purple-800 font-bold">
                    <span>↳ {venta.detallesPago.canalDigital || 'Digital'}:</span>
                    <span>{formatCurrency(venta.detallesPago.digital || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Código de barras del Ticket */}
            <div className="text-center pt-2 border-t border-dashed border-zinc-300 space-y-1">
              <div className="font-mono text-xl tracking-[0.25em] font-black text-zinc-900 select-none py-0.5">
                ||| | |||| || | ||||| | |||
              </div>
              <p className="text-[8px] text-zinc-500 tracking-wider">
                COMPROBANTE EMITIDO EN MOSTRADOR
              </p>
              <p className="text-[9px] font-sans font-bold text-zinc-900">
                ¡Gracias por su compra en Galindo Barber!
              </p>
            </div>
          </div>
        </div>

        {/* Panel Interactivo: Enviar Ticket por WhatsApp */}
        <AnimatePresence>
          {mostrarWhatsAppPrompt && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              className="overflow-hidden"
            >
              <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 leading-tight">
                        Enviar Ticket al WhatsApp del Cliente
                      </h4>
                      <p className="text-[10px] text-emerald-700">
                        Pregunta el celular al cliente para enviarle su comprobante digital
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarWhatsAppPrompt(false)}
                    className="text-zinc-400 hover:text-zinc-700 p-1 text-xs rounded-lg hover:bg-emerald-100 transition-colors"
                    title="Cerrar"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-zinc-600 select-none">
                      <span>🇵🇪</span>
                      <span className="font-mono text-zinc-400">+51</span>
                    </div>
                    <input
                      type="tel"
                      autoFocus
                      inputMode="numeric"
                      maxLength={9}
                      value={telefonoWhatsApp}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setTelefonoWhatsApp(digits);
                        if (telefonoError) setTelefonoError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEnviarWhatsAppPDF();
                        }
                      }}
                      placeholder="Ej: 987 654 321"
                      className="w-full pl-16 pr-3 py-2 text-xs sm:text-sm font-mono font-bold bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:font-normal placeholder:text-zinc-400 shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleEnviarWhatsAppPDF}
                      disabled={enviandoPdfWhatsApp}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{enviandoPdfWhatsApp ? 'Generando...' : 'Enviar Ticket en PDF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleEnviarWhatsAppTexto}
                      className="py-2.5 px-3 bg-white hover:bg-emerald-100/70 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Enviar en Texto</span>
                    </button>
                  </div>
                </div>

                {telefonoError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{telefonoError}</span>
                  </p>
                )}

                {pdfDescargadoParaWA && (
                  <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-[11px] text-emerald-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>¡PDF descargado y WhatsApp abierto!</span>
                    </div>
                    <p className="text-[10px] text-emerald-800">
                      El ticket PDF ya está en tus Descargas. Solo arrástralo al chat de WhatsApp o presiona 📎 Adjuntar para enviárselo al cliente.
                    </p>
                  </div>
                )}

                {whatsappEnviado && !pdfDescargadoParaWA && (
                  <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 bg-emerald-100/70 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡WhatsApp abierto con el ticket listo para enviar!</span>
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-[10px] text-emerald-800">
                  <span className="truncate max-w-[200px]">Incluye enlace digital oficial</span>
                  <button
                    type="button"
                    onClick={handleCopiarTexto}
                    className="text-emerald-700 hover:text-emerald-950 underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{mensajeCopiado ? '¡Copiado!' : 'Copiar texto'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleImprimir}
            className="py-2.5 px-3 rounded-xl bg-black text-white hover:bg-zinc-800 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDescargarPDF}
            disabled={generandoPdf}
            className="py-2.5 px-3 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{pdfDescargado ? '¡Descargado!' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleWhatsApp}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer",
              mostrarWhatsAppPrompt
                ? "bg-emerald-700 text-white ring-2 ring-emerald-400 ring-offset-1"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{mostrarWhatsAppPrompt ? 'Cerrar WA' : 'WhatsApp'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
