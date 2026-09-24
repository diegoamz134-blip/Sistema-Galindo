'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Store, Check, Shield, Boxes, MapPin, AlertCircle } from 'lucide-react';
import { Producto } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { SEDES } from '@/lib/constants';

interface QuickViewModalProps {
  producto: Producto | null;
  onClose: () => void;
  onAddToCart: (producto: Producto, coords?: { x: number; y: number }) => void;
}

export function QuickViewModal({
  producto,
  onClose,
  onAddToCart,
}: QuickViewModalProps) {
  const { sedeSeleccionada, setSedeSeleccionada } = useCart();
  if (!producto) return null;

  const precioFinal = producto.precio_oferta || producto.precio_venta;
  const stockIca = producto.stock_ica ?? producto.stock;
  const stockHuancayo = producto.stock_huancayo ?? 0;
  const stockActualSede = sedeSeleccionada === 'ica' ? stockIca : stockHuancayo;
  const sedeActual = SEDES[sedeSeleccionada] || SEDES['ica'];
  const otraSedeKey = sedeSeleccionada === 'ica' ? 'huancayo' : 'ica';
  const otraSede = SEDES[otraSedeKey];
  const stockOtraSede = sedeSeleccionada === 'ica' ? stockHuancayo : stockIca;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors z-20 cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Imagen Principal */}
            <div className="bg-zinc-100 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200">
              <div className="relative aspect-square w-full max-w-xs rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-sm flex items-center justify-center">
                {producto.imagenes && producto.imagenes.length > 0 ? (
                  <img
                    src={producto.imagenes[0]}
                    alt={producto.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 gap-1.5 opacity-60">
                    <Boxes className="w-8 h-8" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Sin Foto</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información Técnica */}
            <div className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>SKU: {producto.sku}</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    stockActualSede > 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stockActualSede > 0 ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Disp: {stockActualSede} un.</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Agotado en {sedeActual.ciudad}</span>
                      </>
                    )}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-zinc-950 leading-snug">
                  {producto.nombre}
                </h3>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  {producto.descripcion}
                </p>

                {/* Disponibilidad transparente por Sede */}
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase">
                    <span>Disponibilidad por Sede:</span>
                    <span>Total: {stockIca + stockHuancayo} un.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Sede Ica */}
                    <button
                      type="button"
                      onClick={() => setSedeSeleccionada('ica')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        sedeSeleccionada === 'ica'
                          ? 'bg-zinc-900 text-white border-black shadow-xs'
                          : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold">Sede Ica</span>
                        {sedeSeleccionada === 'ica' && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between">
                        <span className={`text-xs font-bold font-mono ${
                          stockIca > 0 
                            ? (sedeSeleccionada === 'ica' ? 'text-emerald-400' : 'text-emerald-700') 
                            : 'text-zinc-400'
                        }`}>
                          {stockIca > 0 ? `${stockIca} un.` : 'Agotado'}
                        </span>
                      </div>
                    </button>

                    {/* Sede Huancayo */}
                    <button
                      type="button"
                      onClick={() => setSedeSeleccionada('huancayo')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        sedeSeleccionada === 'huancayo'
                          ? 'bg-zinc-900 text-white border-black shadow-xs'
                          : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold">Sede Huancayo</span>
                        {sedeSeleccionada === 'huancayo' && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between">
                        <span className={`text-xs font-bold font-mono ${
                          stockHuancayo > 0 
                            ? (sedeSeleccionada === 'huancayo' ? 'text-emerald-400' : 'text-emerald-700') 
                            : 'text-zinc-400'
                        }`}>
                          {stockHuancayo > 0 ? `${stockHuancayo} un.` : 'Agotado'}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sellos de Confianza */}
                <div className="pt-1 flex flex-wrap gap-2 text-[10px] text-zinc-500 font-medium">
                  <div className="flex items-center gap-1 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100">
                    <Shield className="w-3 h-3 text-zinc-700" />
                    <span>Garantía Oficial</span>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-100">
                    <Store className="w-3 h-3 text-zinc-700" />
                    <span>Recojo en {sedeActual.nombre}</span>
                  </div>
                </div>
              </div>

              {/* Precios y Botón */}
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Precio Final</span>
                    <span className="text-2xl font-black text-zinc-950 font-mono">
                      {formatCurrency(precioFinal)}
                    </span>
                    {producto.precio_oferta && producto.precio_oferta < producto.precio_venta && (
                      <span className="text-[11px] text-zinc-400 line-through font-mono block mt-0.5">
                        {formatCurrency(producto.precio_venta)}
                      </span>
                    )}
                  </div>
                </div>

                {stockActualSede > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      const coords = {
                        x: e.clientX,
                        y: e.clientY,
                      };
                      onAddToCart(producto, coords);
                      onClose();
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-xs bg-black text-white hover:bg-zinc-800 transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Añadir al Pedido ({sedeActual.ciudad})</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl font-semibold text-xs bg-zinc-100 border border-zinc-200 text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Agotado en Sede {sedeActual.ciudad}</span>
                    </button>
                    {stockOtraSede > 0 && (
                      <button
                        type="button"
                        onClick={() => setSedeSeleccionada(otraSedeKey)}
                        className="w-full py-1 text-center text-xs font-bold text-zinc-900 hover:underline cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>Cambiar a Sede {otraSede.ciudad} (Hay {stockOtraSede} un.)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
