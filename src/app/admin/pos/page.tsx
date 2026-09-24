'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  MapPin,
  Clock,
  User,
  History,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Producto, MetodoPago } from '@/types/database';
import {
  getPOSProducts,
  procesarVentaPOS,
  VentaItemPOS,
  VentaPOSData,
} from '@/lib/pos-service';
import { SEDES, SedeId, DEFAULT_SEDE_ID } from '@/lib/constants';
import { generateCode } from '@/lib/utils';
import { POSProductCatalog } from '@/components/admin/pos/POSProductCatalog';
import { POSCartTicket } from '@/components/admin/pos/POSCartTicket';
import { POSPaymentModal } from '@/components/admin/pos/POSPaymentModal';
import { POSThermalTicketModal } from '@/components/admin/pos/POSThermalTicketModal';
import { POSSalesHistoryModal } from '@/components/admin/pos/POSSalesHistoryModal';

export default function POSPage() {
  const { user, userMeta } = useAuth();

  // Sede activa en el POS (Ica o Huancayo)
  const [sedeId, setSedeId] = useState<SedeId>(DEFAULT_SEDE_ID);
  const sedeActual = SEDES[sedeId] || SEDES['ica'];

  // Catálogo de Productos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoadingProductos, setIsLoadingProductos] = useState(true);

  // Carrito de Venta de Mostrador
  const [cartItems, setCartItems] = useState<VentaItemPOS[]>([]);
  const [codigoTicket, setCodigoTicket] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [descuento, setDescuento] = useState(0);

  // Vista móvil: switch entre Catálogo y Ticket
  const [mobileTab, setMobileTab] = useState<'catalogo' | 'ticket'>('catalogo');

  // Modales
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<VentaPOSData | null>(null);

  // Reloj digital en vivo
  const [horaActual, setHoraActual] = useState('');

  const cajeroNombre =
    userMeta?.nombre && userMeta.nombre !== 'Administrador'
      ? userMeta.nombre
      : user?.email?.split('@')[0] || 'Cajero Galindo';

  // Inicializar reloj y código de ticket
  useEffect(() => {
    setCodigoTicket(generateCode('POS'));
    const timer = setInterval(() => {
      setHoraActual(
        new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar catálogo de productos según la sede seleccionada
  const cargarProductos = useCallback(async () => {
    setIsLoadingProductos(true);
    try {
      const data = await getPOSProducts(sedeId);
      setProductos(data);
    } finally {
      setIsLoadingProductos(false);
    }
  }, [sedeId]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Cambiar de sede de manera segura
  const handleCambiarSede = (nuevaSede: SedeId) => {
    if (nuevaSede === sedeId) return;
    if (cartItems.length > 0) {
      const confirmar = window.confirm(
        `Tienes artículos en el ticket de mostrador de ${sedeActual.nombre}. Cambiar a Sede ${SEDES[nuevaSede].ciudad} reiniciará el ticket actual para evitar mezclas de inventario. ¿Deseas continuar?`
      );
      if (!confirmar) return;
      setCartItems([]);
    }
    setSedeId(nuevaSede);
  };



  // Agregar producto al ticket
  const handleAddToCart = (producto: Producto) => {
    setCartItems((prev) => {
      const index = prev.findIndex((it) => it.producto.id === producto.id);
      const precioUnitario = producto.precio_oferta || producto.precio_venta;
      const stockDisponible = sedeId === 'huancayo' ? (producto.stock_huancayo ?? 0) : (producto.stock_ica ?? producto.stock);

      if (index >= 0) {
        const itemActual = prev[index];
        // Validar no exceder el stock disponible de la sede
        if (itemActual.cantidad >= stockDisponible) {
          return prev;
        }
        const nuevaCantidad = itemActual.cantidad + 1;
        const nuevoItem: VentaItemPOS = {
          ...itemActual,
          cantidad: nuevaCantidad,
          subtotal: precioUnitario * nuevaCantidad,
        };
        const copia = [...prev];
        copia[index] = nuevoItem;
        return copia;
      } else {
        return [
          ...prev,
          {
            producto,
            cantidad: 1,
            precioUnitario,
            subtotal: precioUnitario,
          },
        ];
      }
    });
  };

  // Modificar cantidad (+ / -)
  const handleUpdateQuantity = (productoId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === productoId) {
            const nueva = item.cantidad + delta;
            if (nueva <= 0) return null;
            if (nueva > item.producto.stock) return item; // No exceder stock
            return {
              ...item,
              cantidad: nueva,
              subtotal: item.precioUnitario * nueva,
            };
          }
          return item;
        })
        .filter(Boolean) as VentaItemPOS[]
    );
  };

  // Eliminar producto del carrito
  const handleRemoveItem = (productoId: string) => {
    setCartItems((prev) => prev.filter((it) => it.producto.id !== productoId));
  };

  // Vaciar carrito
  const handleClearCart = () => {
    setCartItems([]);
    setDescuento(0);
  };

  // Procesar cobro final
  const handleConfirmarPago = async (datos: {
    metodoPago: MetodoPago;
    detallesPago?: any;
    notas?: string;
  }) => {
    const subtotal = cartItems.reduce((acc, it) => acc + it.subtotal, 0);
    const total = Math.max(0, subtotal - descuento);

    const ventaPayload: VentaPOSData = {
      codigoPedido: codigoTicket,
      clienteNombre: clienteNombre.trim() || 'Cliente Mostrador',
      clienteTelefono: clienteTelefono.trim() || undefined,
      clienteDni: clienteDni.trim() || undefined,
      esAlumno: false,
      sedeId: sedeId,
      items: cartItems,
      subtotal,
      descuento,
      total,
      metodoPago: datos.metodoPago,
      detallesPago: datos.detallesPago,
      notas: datos.notas,
      cajeroNombre,
      cajeroId: user?.id,
    };

    const res = await procesarVentaPOS(ventaPayload);

    if (res.success) {
      // Guardar última venta y abrir modal de ticket térmico
      setUltimaVenta(ventaPayload);
      setIsCobroModalOpen(false);
      setIsTicketModalOpen(true);

      // Descontar stock localmente de inmediato para reactividad visual instantánea
      setProductos((prev) =>
        prev.map((p) => {
          const itemVendido = cartItems.find((it) => it.producto.id === p.id);
          if (itemVendido) {
            const esHuancayo = sedeId === 'huancayo';
            const prevSede = esHuancayo ? (p.stock_huancayo ?? 0) : (p.stock_ica ?? p.stock);
            const nuevoSede = Math.max(0, prevSede - itemVendido.cantidad);
            return {
              ...p,
              stock_ica: esHuancayo ? p.stock_ica : nuevoSede,
              stock_huancayo: esHuancayo ? nuevoSede : p.stock_huancayo,
              stock: Math.max(0, p.stock - itemVendido.cantidad),
            };
          }
          return p;
        })
      );
    } else {
      alert(`Ocurrió un error al registrar la venta: ${res.error}`);
    }
  };

  // Preparar POS para el siguiente cliente
  const handleNuevaVenta = () => {
    setCartItems([]);
    setCodigoTicket(generateCode('POS'));
    setClienteNombre('');
    setClienteTelefono('');
    setClienteDni('');
    setDescuento(0);
    setIsTicketModalOpen(false);
    setUltimaVenta(null);
  };

  // Reimprimir ticket desde historial
  const handleSeleccionarParaReimprimir = (venta: VentaPOSData) => {
    setUltimaVenta(venta);
    setIsHistorialModalOpen(false);
    setIsTicketModalOpen(true);
  };

  const totalArticulos = cartItems.reduce((acc, it) => acc + it.cantidad, 0);
  const subtotalCarrito = cartItems.reduce((acc, it) => acc + it.subtotal, 0);
  const totalCarrito = Math.max(0, subtotalCarrito - descuento);

  return (
    <div className="space-y-3 sm:space-y-4 max-w-[1750px] mx-auto">
      {/* Barra Superior del POS (Mostrador Profesional) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-md">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-zinc-950 uppercase">
                Punto de Venta (POS)
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                Mostrador
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1 font-semibold text-zinc-800">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {sedeActual.nombre}
              </span>
              <span>•</span>
              <span className="hidden md:inline">{sedeActual.direccion}</span>
            </div>
          </div>
        </div>

        {/* Controles de Sede, Reloj y Turno */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Selector de Sede */}
          <div className="flex items-center rounded-xl bg-zinc-100 p-1 border border-zinc-200">
            <button
              type="button"
              onClick={() => handleCambiarSede('ica')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sedeId === 'ica'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Ica
            </button>
            <button
              type="button"
              onClick={() => handleCambiarSede('huancayo')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sedeId === 'huancayo'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Huancayo
            </button>
          </div>

          {/* Reloj y Cajero */}
          <div className="hidden lg:flex flex-col text-right font-mono text-[11px] leading-tight">
            <span className="font-bold text-zinc-900 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              {horaActual || '11:00:00 AM'}
            </span>
            <span className="text-zinc-400 truncate max-w-[140px]">{cajeroNombre}</span>
          </div>

          {/* Botón Ventas del Turno */}
          <button
            type="button"
            onClick={() => setIsHistorialModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
          >
            <History className="w-4 h-4 text-zinc-600" />
            <span className="hidden sm:inline">Ventas Turno</span>
          </button>
        </div>
      </div>

      {/* Selector Móvil de Pestañas (Catálogo vs. Ticket) */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-zinc-200/70 border border-zinc-300/80 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('catalogo')}
          className={`flex-1 py-2 rounded-lg text-center transition-all ${
            mobileTab === 'catalogo'
              ? 'bg-white text-black shadow-xs'
              : 'text-zinc-600 hover:text-black'
          }`}
        >
          Catálogo ({productos.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('ticket')}
          className={`flex-1 py-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'ticket'
              ? 'bg-white text-black shadow-xs'
              : 'text-zinc-600 hover:text-black'
          }`}
        >
          <span>Ticket en Curso</span>
          {totalArticulos > 0 && (
            <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-mono font-black">
              {totalArticulos}
            </span>
          )}
        </button>
      </div>

      {/* =========================================================
          ÁREA PRINCIPAL DEL POS: CATÁLOGO (IZQ) + TICKET (DER)
         ========================================================= */}
      <div className="grid grid-cols-12 gap-3.5 sm:gap-4 items-start">
        {/* Panel Izquierdo: Catálogo y Búsqueda */}
        <div
          className={`col-span-12 lg:col-span-7 xl:col-span-8 h-[calc(100vh-215px)] sm:h-[calc(100vh-230px)] flex flex-col ${
            mobileTab === 'catalogo' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <POSProductCatalog
            productos={productos}
            sedeId={sedeId}
            isLoading={isLoadingProductos}
            onAddToCart={handleAddToCart}
          />
        </div>

        {/* Panel Derecho: Carrito / Ticket de Mostrador */}
        <div
          className={`col-span-12 lg:col-span-5 xl:col-span-4 h-[calc(100vh-215px)] sm:h-[calc(100vh-230px)] flex flex-col ${
            mobileTab === 'ticket' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <POSCartTicket
            items={cartItems}
            codigoTicket={codigoTicket}
            clienteNombre={clienteNombre}
            clienteTelefono={clienteTelefono}
            clienteDni={clienteDni}
            descuento={descuento}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onChangeCliente={(datos) => {
              if (datos.nombre !== undefined) setClienteNombre(datos.nombre);
              if (datos.telefono !== undefined) setClienteTelefono(datos.telefono);
              if (datos.dni !== undefined) setClienteDni(datos.dni);
            }}
            onChangeDescuento={(m) => setDescuento(m)}
            onOpenCobroModal={() => setIsCobroModalOpen(true)}
            onOpenHistorialModal={() => setIsHistorialModalOpen(true)}
          />
        </div>
      </div>

      {/* =========================================================
          MODALES DE COBRO, TICKET TÉRMICO E HISTORIAL
         ========================================================= */}
      {/* 1. Modal de Cobro Multimodal */}
      <POSPaymentModal
        isOpen={isCobroModalOpen}
        total={totalCarrito}
        clienteNombre={clienteNombre}
        onClose={() => setIsCobroModalOpen(false)}
        onConfirmarPago={handleConfirmarPago}
      />

      {/* 2. Modal de Ticket Térmico de 80mm/90mm */}
      <POSThermalTicketModal
        isOpen={isTicketModalOpen}
        venta={ultimaVenta}
        onClose={() => setIsTicketModalOpen(false)}
        onNuevaVenta={handleNuevaVenta}
      />

      {/* 3. Modal de Historial de Ventas del Turno */}
      <POSSalesHistoryModal
        isOpen={isHistorialModalOpen}
        onClose={() => setIsHistorialModalOpen(false)}
        onSeleccionarParaReimprimir={handleSeleccionarParaReimprimir}
      />
    </div>
  );
}
