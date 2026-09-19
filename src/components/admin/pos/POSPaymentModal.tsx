'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
  Check,
  Copy,
  Receipt,
  Store,
  Loader2,
} from 'lucide-react';
import { MetodoPago } from '@/types/database';
import { BUSINESS_INFO } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface POSPaymentModalProps {
  isOpen: boolean;
  total: number;
  clienteNombre: string;
  onClose: () => void;
  onConfirmarPago: (datos: {
    metodoPago: MetodoPago;
    detallesPago?: {
      efectivo?: number;
      vuelto?: number;
      canalDigital?: 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
      digital?: number;
      numeroOperacion?: string;
    };
    notas?: string;
  }) => Promise<void>;
}

export function POSPaymentModal({
  isOpen,
  total,
  clienteNombre,
  onClose,
  onConfirmarPago,
}: POSPaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados Efectivo
  const [billeteEfectivo, setBilleteEfectivo] = useState<number | 'exacto'>('exacto');
  const [montoPersonalizadoEfectivo, setMontoPersonalizadoEfectivo] = useState('');

  // Estados Pago Cruzado
  type CanalDigital = 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  const [canalDigital, setCanalDigital] = useState<CanalDigital>('YAPE');
  const [montoCruzadoEfectivo, setMontoCruzadoEfectivo] = useState<string>(
    (total / 2).toFixed(2)
  );
  const [montoCruzadoDigital, setMontoCruzadoDigital] = useState<string>(
    (total - total / 2).toFixed(2)
  );
  const [modoEdicionCruzado, setModoEdicionCruzado] = useState<'efectivo' | 'digital'>('efectivo');

  // Códigos de operación
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [notas, setNotas] = useState('');

  // Copia rápida
  const [copiadoYape, setCopiadoYape] = useState(false);
  const [copiadoBcp, setCopiadoBcp] = useState(false);
  const [copiadoCci, setCopiadoCci] = useState(false);

  // Vuelto en efectivo
  const valorPaga =
    billeteEfectivo === 'exacto'
      ? total
      : typeof billeteEfectivo === 'number'
      ? billeteEfectivo
      : parseFloat(montoPersonalizadoEfectivo) || total;
  const vueltoEfectivo = Math.max(0, valorPaga - total);

  // Cálculo Pago Cruzado
  const mitad = Number((total / 2).toFixed(2));
  let cruzadoNumEfectivo: number;
  let cruzadoNumDigital: number;

  if (modoEdicionCruzado === 'digital') {
    const d = parseFloat(montoCruzadoDigital);
    if (isNaN(d) || montoCruzadoDigital === '') {
      cruzadoNumDigital = mitad;
      cruzadoNumEfectivo = Number((total - mitad).toFixed(2));
    } else {
      cruzadoNumDigital = Math.min(total, Math.max(0, d));
      cruzadoNumEfectivo = Math.max(0, Number((total - cruzadoNumDigital).toFixed(2)));
    }
  } else {
    const e = parseFloat(montoCruzadoEfectivo);
    if (isNaN(e) || montoCruzadoEfectivo === '') {
      cruzadoNumEfectivo = mitad;
      cruzadoNumDigital = Number((total - mitad).toFixed(2));
    } else {
      cruzadoNumEfectivo = Math.min(total, Math.max(0, e));
      cruzadoNumDigital = Math.max(0, Number((total - cruzadoNumEfectivo).toFixed(2)));
    }
  }

  const handleCambioCruzadoEfectivo = (val: string) => {
    setMontoCruzadoEfectivo(val);
    setModoEdicionCruzado('efectivo');
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.min(total, Math.max(0, num));
      setMontoCruzadoDigital(Math.max(0, Number((total - clamped).toFixed(2))).toString());
    } else {
      setMontoCruzadoDigital('');
    }
  };

  const handleCambioCruzadoDigital = (val: string) => {
    setMontoCruzadoDigital(val);
    setModoEdicionCruzado('digital');
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.min(total, Math.max(0, num));
      setMontoCruzadoEfectivo(Math.max(0, Number((total - clamped).toFixed(2))).toString());
    } else {
      setMontoCruzadoEfectivo('');
    }
  };

  const handleCopiarTexto = (texto: string, tipo: 'yape' | 'bcp' | 'cci') => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(texto);
    }
    if (tipo === 'yape') {
      setCopiadoYape(true);
      setTimeout(() => setCopiadoYape(false), 2000);
    } else if (tipo === 'bcp') {
      setCopiadoBcp(true);
      setTimeout(() => setCopiadoBcp(false), 2000);
    } else if (tipo === 'cci') {
      setCopiadoCci(true);
      setTimeout(() => setCopiadoCci(false), 2000);
    }
  };

  const handleConfirmar = async () => {
    setIsSubmitting(true);
    try {
      let detallesPago: any = undefined;

      if (metodo === 'EFECTIVO') {
        detallesPago = {
          efectivo: valorPaga,
          vuelto: vueltoEfectivo,
        };
      } else if (metodo === 'MIXTO') {
        detallesPago = {
          efectivo: cruzadoNumEfectivo,
          digital: cruzadoNumDigital,
          canalDigital: canalDigital,
          numeroOperacion: numeroOperacion.trim() || undefined,
        };
      } else {
        detallesPago = {
          digital: total,
          numeroOperacion: numeroOperacion.trim() || undefined,
        };
      }

      await onConfirmarPago({
        metodoPago: metodo,
        detallesPago,
        notas: notas.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-4 sm:p-6 border border-zinc-200 z-10 space-y-4 max-h-[92vh] flex flex-col"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">
              Cobro en Mostrador POS
            </span>
            <h3 className="text-base font-black text-zinc-950 uppercase tracking-tight">
              Liquidación de Venta
            </h3>
            <span className="text-xs text-zinc-500">
              Cliente: <strong>{clienteNombre || 'Cliente Mostrador'}</strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-400 block font-bold">TOTAL</span>
            <span className="text-2xl font-black font-mono text-black">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Selector de Métodos de Pago */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* 1. Efectivo */}
          <button
            type="button"
            onClick={() => setMetodo('EFECTIVO')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'EFECTIVO'
                ? 'bg-zinc-950 text-white border-black shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Efectivo</span>
          </button>

          {/* 2. Yape */}
          <button
            type="button"
            onClick={() => setMetodo('YAPE')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'YAPE'
                ? 'bg-purple-900 text-white border-purple-900 shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-purple-400" />
            <span>Yape</span>
          </button>

          {/* 3. Plin */}
          <button
            type="button"
            onClick={() => setMetodo('PLIN')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'PLIN'
                ? 'bg-cyan-900 text-white border-cyan-900 shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Plin</span>
          </button>

          {/* 4. Transferencia BCP */}
          <button
            type="button"
            onClick={() => setMetodo('TRANSFERENCIA')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'TRANSFERENCIA'
                ? 'bg-blue-900 text-white border-blue-900 shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span>BCP Soles</span>
          </button>

          {/* 5. Pago Cruzado */}
          <button
            type="button"
            onClick={() => setMetodo('MIXTO')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'MIXTO'
                ? 'bg-indigo-950 text-white border-indigo-950 shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
            <span>Pago Cruzado</span>
          </button>

          {/* 6. Tarjeta Física */}
          <button
            type="button"
            onClick={() => setMetodo('TARJETA')}
            className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
              metodo === 'TARJETA'
                ? 'bg-amber-900 text-white border-amber-900 shadow-md'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>POS Tarjeta</span>
          </button>
        </div>

        {/* Panel Interactivo según el Método */}
        <div className="flex-1 overflow-y-auto">
          {/* CASO: EFECTIVO */}
          {metodo === 'EFECTIVO' && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">
                  ¿Con cuánto paga el cliente?
                </span>
                <span className="text-xs font-mono font-bold text-zinc-500">
                  Total: {formatCurrency(total)}
                </span>
              </div>

              {/* Botones de billetes comunes */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBilleteEfectivo('exacto');
                    setMontoPersonalizadoEfectivo('');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                    billeteEfectivo === 'exacto'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  Monto Exacto
                </button>
                {[10, 20, 50, 100, 200]
                  .filter((b) => b >= total)
                  .map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBilleteEfectivo(b);
                        setMontoPersonalizadoEfectivo('');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors cursor-pointer ${
                        billeteEfectivo === b
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                      }`}
                    >
                      S/ {b}
                    </button>
                  ))}
              </div>

              {/* Input personalizado */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  S/
                </span>
                <input
                  type="number"
                  min={total}
                  step="any"
                  value={
                    billeteEfectivo === 'exacto'
                      ? ''
                      : typeof billeteEfectivo === 'number'
                      ? billeteEfectivo
                      : montoPersonalizadoEfectivo
                  }
                  onChange={(e) => {
                    setBilleteEfectivo('custom' as any);
                    setMontoPersonalizadoEfectivo(e.target.value);
                  }}
                  placeholder={`Otro monto recibido (ej: ${total + 10})`}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-950 font-mono font-bold text-sm focus:border-black outline-none"
                />
              </div>

              {/* Vuelto a Entregar */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-950">
                  {vueltoEfectivo > 0 ? 'Vuelto a Entregar:' : 'Sin vuelto (pago exacto)'}
                </span>
                <span className="font-mono font-black text-xl text-emerald-700">
                  {formatCurrency(vueltoEfectivo)}
                </span>
              </div>
            </div>
          )}

          {/* CASO: YAPE */}
          {metodo === 'YAPE' && (
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Yape Oficial Galindo</span>
                  <span className="text-[10px] text-zinc-600">Titular: {BUSINESS_INFO.yapeHolder}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopiarTexto(BUSINESS_INFO.yapeNumber, 'yape')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-purple-950 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  {copiadoYape ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiadoYape ? '¡Copiado!' : BUSINESS_INFO.yapeNumber}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Nº de Operación / Referencia (Opcional):
                </label>
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  placeholder="Ej: 849201"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 font-mono text-xs focus:border-purple-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* CASO: PLIN */}
          {metodo === 'PLIN' && (
            <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-950 block">Plin Oficial Galindo</span>
                  <span className="text-[10px] text-zinc-600">Titular: {BUSINESS_INFO.yapeHolder}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopiarTexto(BUSINESS_INFO.yapeNumber, 'yape')}
                  className="px-2.5 py-1 rounded-lg bg-white border border-cyan-300 text-cyan-950 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  {copiadoYape ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiadoYape ? '¡Copiado!' : BUSINESS_INFO.yapeNumber}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Nº de Operación / Referencia (Opcional):
                </label>
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  placeholder="Ej: 902184"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 font-mono text-xs focus:border-cyan-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* CASO: TRANSFERENCIA BCP */}
          {metodo === 'TRANSFERENCIA' && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950">Cuenta Ahorros BCP:</span>
                  <button
                    type="button"
                    onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpAccount, 'bcp')}
                    className="font-mono font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1"
                  >
                    <span>{BUSINESS_INFO.bcpAccount}</span>
                    {copiadoBcp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span>CCI:</span>
                  <button
                    type="button"
                    onClick={() => handleCopiarTexto(BUSINESS_INFO.bcpCci.replace(/-/g, ''), 'cci')}
                    className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1"
                  >
                    <span>{BUSINESS_INFO.bcpCci}</span>
                    {copiadoCci ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500">
                  Titular: <strong>{BUSINESS_INFO.bcpHolder}</strong>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Nº de Operación Bancaria:
                </label>
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  placeholder="Ej: 0092819"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 font-mono text-xs focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* CASO: PAGO CRUZADO */}
          {metodo === 'MIXTO' && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                  División Efectivo + Digital
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMontoCruzadoEfectivo(mitad.toString());
                    setMontoCruzadoDigital((total - mitad).toString());
                    setModoEdicionCruzado('efectivo');
                  }}
                  className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-lg border border-indigo-300 text-indigo-900 cursor-pointer"
                >
                  Mitad y Mitad (50/50)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Caja 1: Efectivo */}
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-emerald-800 block">
                    💵 En Efectivo
                  </label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      S/
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="any"
                      value={modoEdicionCruzado === 'efectivo' ? montoCruzadoEfectivo : cruzadoNumEfectivo}
                      onChange={(e) => handleCambioCruzadoEfectivo(e.target.value)}
                      className="w-full pl-6 pr-1.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Caja 2: Digital */}
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-purple-800 block">
                      📱 En Digital
                    </label>
                    <select
                      value={canalDigital}
                      onChange={(e) => setCanalDigital(e.target.value as CanalDigital)}
                      className="text-[10px] font-bold bg-zinc-50 border border-zinc-200 rounded px-1"
                    >
                      <option value="YAPE">Yape</option>
                      <option value="PLIN">Plin</option>
                      <option value="TRANSFERENCIA">BCP</option>
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      S/
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      step="any"
                      value={modoEdicionCruzado === 'digital' ? montoCruzadoDigital : cruzadoNumDigital}
                      onChange={(e) => handleCambioCruzadoDigital(e.target.value)}
                      className="w-full pl-6 pr-1.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-mono font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Verificación de Suma */}
              <div className="text-[11px] font-mono text-zinc-600 text-center bg-white p-2 rounded-xl border border-indigo-200">
                S/ {cruzadoNumEfectivo.toFixed(2)} (Efectivo) + S/ {cruzadoNumDigital.toFixed(2)} ({canalDigital}) = <strong>{formatCurrency(total)}</strong>
              </div>
            </div>
          )}

          {/* CASO: TARJETA */}
          {metodo === 'TARJETA' && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="text-xs text-amber-950 font-medium">
                Pasa la tarjeta de débito o crédito en el POS físico (Izipay / Niubiz / Vendemas) por el monto exacto de:
                <div className="font-mono font-black text-lg text-black mt-1">
                  {formatCurrency(total)}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 block mb-1">
                  Código de Aprobación o Ref. de Voucher:
                </label>
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  placeholder="Ej: OP-08912"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 font-mono text-xs focus:border-amber-600 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botón de Confirmación y Emisión */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmar}
            className="flex-1 py-3 rounded-xl bg-black text-white hover:bg-zinc-800 text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando Venta...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Confirmar & Emitir Ticket</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
