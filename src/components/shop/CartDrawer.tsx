'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, ArrowLeft, Ticket, Boxes, MapPin, AlertTriangle } from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { SEDES, SedeId } from '@/lib/constants';

import { CartItem, useCart } from '@/context/CartContext';
export type { CartItem };

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productoId: string, delta: number) => void;
  onRemoveItem: (productoId: string) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartDrawerProps) {
  const { sedeSeleccionada, setSedeSeleccionada } = useCart();
  const sedeActual = SEDES[sedeSeleccionada] || SEDES['ica'];
  const otraSedeKey: SedeId = sedeSeleccionada === 'ica' ? 'huancayo' : 'ica';
  const otraSede = SEDES[otraSedeKey];

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const totalPagar = items.reduce((acc, item) => {
    const precio = item.producto.precio_oferta || item.producto.precio_venta;
    return acc + precio * item.cantidad;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop con desenfoque suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Contenedor del Drawer: 100% ancho en móvil (w-full), max-w-md en pantallas sm+ */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-md flex z-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full h-full bg-white border-l border-zinc-200 shadow-2xl flex flex-col justify-between overflow-hidden pointer-events-auto"
            >
              {/* Header del Carrito */}
              <div className="p-4 sm:p-5 border-b border-zinc-200 bg-white shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                        Tu Pedido de Herramientas
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} seleccionados
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                    aria-label="Cerrar carrito"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Pill de Sede activa de recojo con opción de cambio rápido */}
                <div className="mt-3.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200/90 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[11px] text-zinc-600 truncate">
                      Sede: <strong className="text-zinc-950">{sedeActual.nombre}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSedeSeleccionada(otraSedeKey)}
                    className="text-[10px] font-mono font-bold text-zinc-700 hover:text-black bg-white px-2 py-0.5 rounded border border-zinc-200 hover:border-black transition-colors cursor-pointer shrink-0"
                  >
                    Cambiar a {otraSede.ciudad}
                  </button>
                </div>
              </div>

              {/* Lista de Items con espaciado amplio y adaptativo */}
              <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Tu carrito de compras está vacío
                    </p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Explora nuestro catálogo de máquinas, tijeras y kits oficiales para empezar tu pedido.
                    </p>
                  </div>
                ) : (
                  items.map((item) => {
                    const precioUnitario = item.producto.precio_oferta || item.producto.precio_venta;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key={item.producto.id}
                        className="p-3 sm:p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex items-start gap-3 shadow-xs"
                      >
                        {/* Imagen del producto */}
                        <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-zinc-200 shadow-xs flex items-center justify-center">
                          {item.producto.imagenes && item.producto.imagenes.length > 0 ? (
                            <img
                              src={item.producto.imagenes[0]}
                              alt={item.producto.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Boxes className="w-6 h-6 text-zinc-400 opacity-60" />
                          )}
                        </div>

                        {/* Detalles del producto y controles */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-950 line-clamp-2 leading-snug">
                            {item.producto.nombre}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-400 font-mono">
                              SKU: {item.producto.sku}
                            </span>
                            {item.tipo !== 'matricula' && (
                              <span className="text-[10px] font-mono text-zinc-500">
                                • {sedeActual.ciudad}: {sedeSeleccionada === 'ica' ? (item.producto.stock_ica ?? item.producto.stock) : (item.producto.stock_huancayo ?? 0)} un.
                              </span>
                            )}
                          </div>

                          {/* Alerta si no hay stock en la sede activa */}
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
                                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                                    <span>
                                      Agotado en {sedeActual.ciudad}
                                      {stockOtraSede > 0 ? ` (Disponible en ${otraSede.ciudad}: ${stockOtraSede} un.)` : ''}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-200/50">
                            <span className="text-xs font-black text-zinc-950 font-mono">
                              {formatCurrency(precioUnitario)}
                            </span>

                            {/* Controles de cantidad y botón eliminar */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-zinc-200 rounded-lg bg-white shadow-xs overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.producto.id, -1)}
                                  className="px-2 py-1 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                                  aria-label="Disminuir cantidad"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 text-xs font-bold text-zinc-900 font-mono min-w-[20px] text-center">
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.producto.id, 1)}
                                  className="px-2 py-1 text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                                  aria-label="Aumentar cantidad"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.producto.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar producto"
                                aria-label="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer con Resumen y Acciones */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-zinc-200 bg-white space-y-3.5 shrink-0 shadow-lg">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>Subtotal productos:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {formatCurrency(totalPagar)}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Modalidad de entrega:</span>
                      <span className="font-medium text-zinc-950">
                        Recojo en Sede (Gratis)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-zinc-950 pt-2 border-t border-zinc-100">
                      <span>Total a pagar:</span>
                      <span className="text-lg font-black font-mono">
                        {formatCurrency(totalPagar)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="w-full py-3.5 rounded-xl font-bold text-xs bg-black text-white hover:bg-zinc-800 transition-all uppercase tracking-wider shadow-md flex items-center justify-center gap-2 group text-center cursor-pointer active:scale-95"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Ir al Checkout & Ticket</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-1 text-center text-xs font-semibold text-zinc-500 hover:text-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Seguir Comprando en la Tienda</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                    Prepararemos tu pedido para recojo en <strong className="text-zinc-900">{sedeActual.nombre}</strong> ({sedeActual.direccion}).
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
