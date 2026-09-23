'use client';

import React, { useState } from 'react';
import { X, DollarSign, Check, AlertCircle, Calendar } from 'lucide-react';
import { CuotaMatricula } from '@/types/database';
import { MatriculaConDetalle, pagarCuota } from '@/lib/academia-service';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RegistrarPagoCuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  matricula: MatriculaConDetalle;
  cuota: CuotaMatricula;
  onPagoRegistrado: () => void;
}

export function RegistrarPagoCuotaModal({
  isOpen,
  onClose,
  matricula,
  cuota,
  onPagoRegistrado,
}: RegistrarPagoCuotaModalProps) {
  const [monto, setMonto] = useState<number>(cuota.monto);
  const [metodoPago, setMetodoPago] = useState<string>('YAPE');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [registrarEnCaja, setRegistrarEnCaja] = useState<boolean>(true);
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setProcesando(true);

    const res = await pagarCuota({
      cuota_id: cuota.id,
      matricula_id: matricula.id,
      monto: Number(monto) || 0,
      metodo_pago: metodoPago,
      numero_operacion: numeroOperacion.trim() || undefined,
      notas: notas.trim() || undefined,
      registrar_en_caja: registrarEnCaja,
    });

    if (res.ok) {
      onPagoRegistrado();
      onClose();
    } else {
      setErrorMsg(res.error || 'Error registrando el pago de la cuota.');
    }
    setProcesando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Registrar Cobro de Cuota #{cuota.numero_cuota}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {matricula.alumno.nombres} {matricula.alumno.apellidos}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resumen de la cuota */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Código de Matrícula:</span>
              <span className="font-mono font-bold text-zinc-900">{matricula.codigo_matricula}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Curso:</span>
              <span className="font-medium text-zinc-800 truncate max-w-[200px]">
                {matricula.curso_nombre || matricula.curso?.titulo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Fecha de Vencimiento:</span>
              <span className="font-mono font-semibold text-zinc-700">
                {formatDate(cuota.fecha_vencimiento)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Monto a Pagar (S/) *
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={monto}
              onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-mono font-bold text-sm focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Método de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 focus:border-black outline-none"
              >
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                N° de Operación
              </label>
              <input
                type="text"
                placeholder="Ej: 884920"
                value={numeroOperacion}
                onChange={(e) => setNumeroOperacion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono focus:border-black outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Notas / Observaciones
            </label>
            <input
              type="text"
              placeholder="Ej: Pago adelantado de mensualidad"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={registrarEnCaja}
              onChange={(e) => setRegistrarEnCaja(e.target.checked)}
              className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
            />
            <span className="font-medium text-zinc-800">
              Registrar ingreso de este cobro en Caja Chica
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-zinc-600 hover:text-black"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{procesando ? 'Procesando...' : 'Confirmar Pago'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
