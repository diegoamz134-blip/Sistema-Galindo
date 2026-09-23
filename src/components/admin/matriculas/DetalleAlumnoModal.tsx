'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  Printer,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { MatriculaConDetalle, actualizarEstadoAcademico } from '@/lib/academia-service';
import { CuotaMatricula, EstadoAcademico } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { RegistrarPagoCuotaModal } from './RegistrarPagoCuotaModal';
import { ReciboMatriculaTicket } from './ReciboMatriculaTicket';

interface DetalleAlumnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  matricula: MatriculaConDetalle;
  onUpdate: () => void;
}

export function DetalleAlumnoModal({
  isOpen,
  onClose,
  matricula,
  onUpdate,
}: DetalleAlumnoModalProps) {
  const [currentMatricula, setCurrentMatricula] = useState<MatriculaConDetalle>(matricula);
  const [cuotaACobrar, setCuotaACobrar] = useState<CuotaMatricula | null>(null);
  const [verTicket, setVerTicket] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  // Sincronizar si cambia el prop
  useEffect(() => {
    setCurrentMatricula(matricula);
  }, [matricula]);

  if (!isOpen) return null;

  const handleEstadoChange = async (nuevoEstado: EstadoAcademico) => {
    setActualizandoEstado(true);
    // Actualización inmediata en pantalla (optimista)
    setCurrentMatricula((prev) => ({
      ...prev,
      estado: nuevoEstado,
    }));
    await actualizarEstadoAcademico(currentMatricula.id, nuevoEstado);
    onUpdate();
    setActualizandoEstado(false);
  };

  // Enlace directo a WhatsApp de cobranza o información
  const handleWhatsApp = () => {
    const telefono = currentMatricula.alumno.celular.replace(/\D/g, '');
    const saldo = formatCurrency(currentMatricula.saldo_pendiente);
    const mensaje = encodeURIComponent(
      `Hola *${currentMatricula.alumno.nombres}*, te saludamos de *Galindo Barber Academy* 💈.\n\n` +
      `Te compartimos el estado de tu matrícula (*${currentMatricula.codigo_matricula}*) en el curso *${currentMatricula.curso_nombre || currentMatricula.curso?.titulo}*.\n` +
      `• Sede: ${currentMatricula.sede} (${currentMatricula.turno})\n` +
      `• Saldo pendiente: *${saldo}*\n\n` +
      `Quedamos a tu disposición para cualquier consulta. ¡Nos vemos en clases!`
    );
    window.open(`https://wa.me/51${telefono}?text=${mensaje}`, '_blank');
  };

  const totalAbonado =
    (Number(currentMatricula.monto_matricula_pagado) || 0) +
    (currentMatricula.cuotas || [])
      .filter((c) => c.estado === 'PAGADA')
      .reduce((acc, c) => acc + (Number(c.monto) || 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden my-6">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm">
                {currentMatricula.alumno.nombres.charAt(0)}
                {currentMatricula.alumno.apellidos.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-950">
                    {currentMatricula.alumno.nombres} {currentMatricula.alumno.apellidos}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                    {currentMatricula.codigo_matricula}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  DNI: <span className="font-mono font-semibold">{currentMatricula.alumno.dni}</span> • Distrito: {currentMatricula.alumno.distrito || 'Ica'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVerTicket(true)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Imprimir Ficha de Matrícula"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recibo</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5 text-xs">
            
            {/* Barra rápida de Contacto & WhatsApp */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-950 font-medium">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Celular WhatsApp: <strong className="font-mono">{currentMatricula.alumno.celular}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviar Recordatorio WhatsApp</span>
              </button>
            </div>

            {/* Datos Académicos & Sede */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Programa</p>
                <p className="font-bold text-zinc-900 mt-0.5">{currentMatricula.curso_nombre || currentMatricula.curso?.titulo}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Sede: {currentMatricula.sede}</p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Turno & Horario</p>
                <p className="font-bold text-zinc-900 mt-0.5">Turno {currentMatricula.turno}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Inicio: {formatDate(currentMatricula.fecha_inicio || currentMatricula.fecha_matricula)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Estado del Alumno</p>
                <select
                  value={currentMatricula.estado}
                  disabled={actualizandoEstado}
                  onChange={(e) => handleEstadoChange(e.target.value as EstadoAcademico)}
                  className="mt-1 w-full px-2 py-1 rounded-md bg-white border border-zinc-300 font-bold text-zinc-900 text-xs outline-none"
                >
                  <option value="EN_CURSO">En Curso (Activo)</option>
                  <option value="MATRICULADO">Matriculado</option>
                  <option value="EGRESADO">Egresado / Graduado</option>
                  <option value="RETIRADO">Retirado</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                </select>
              </div>
            </div>

            {/* Resumen Financiero y Cronograma de Cuotas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-zinc-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Cronograma de Cuotas & Pagos</span>
                </h4>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-500">
                    Total Curso: <strong className="font-mono text-zinc-900">{formatCurrency(currentMatricula.total_curso)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-500">
                    Abonado: <strong className="font-mono text-emerald-600">{formatCurrency(totalAbonado)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-500">
                    Saldo: <strong className="font-mono text-amber-600">{formatCurrency(currentMatricula.saldo_pendiente)}</strong>
                  </span>
                </div>
              </div>

              {/* Lista de Cuotas */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-zinc-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Concepto</th>
                      <th className="px-3 py-2 font-medium">Vencimiento</th>
                      <th className="px-3 py-2 font-medium">Monto</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {/* Fila Fija: Matrícula Inicial */}
                    <tr className="bg-emerald-50/40">
                      <td className="px-3 py-2.5 font-bold text-zinc-900">
                        Matrícula Inicial
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500 font-mono">
                        {formatDate(currentMatricula.fecha_matricula)}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-zinc-900">
                        {formatCurrency(currentMatricula.monto_matricula_pagado)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          PAGADA
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-400 font-mono text-[11px]">
                        Ingreso Inicial
                      </td>
                    </tr>

                    {/* Cuotas Mensuales */}
                    {currentMatricula.cuotas && currentMatricula.cuotas.length > 0 ? (
                      currentMatricula.cuotas.map((cuota) => {
                        const esPagada = cuota.estado === 'PAGADA';
                        const esVencida = cuota.estado === 'VENCIDA';

                        return (
                          <tr key={cuota.id} className="hover:bg-zinc-50">
                            <td className="px-3 py-2.5 font-semibold text-zinc-800">
                              Cuota #{cuota.numero_cuota}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-zinc-600">
                              {formatDate(cuota.fecha_vencimiento)}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-zinc-950">
                              {formatCurrency(cuota.monto)}
                            </td>
                            <td className="px-3 py-2.5">
                              {esPagada ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  PAGADA ({cuota.metodo_pago || 'PAGO'})
                                </span>
                              ) : esVencida ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  VENCIDA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  PENDIENTE
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {esPagada ? (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  {cuota.fecha_pago ? formatDate(cuota.fecha_pago) : 'Liquidada'}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCuotaACobrar(cuota)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs active:scale-95 cursor-pointer"
                                >
                                  Cobrar Cuota
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-zinc-400">
                          Este curso fue liquidado en un solo pago de contado. No hay cuotas pendientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Datos adicionales de emergencia */}
            {(currentMatricula.alumno.contacto_emergencia_nombre || currentMatricula.alumno.contacto_emergencia_telefono) && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 text-[11px]">
                <span className="font-bold text-zinc-800">Contacto de Emergencia / Apoderado: </span>
                {currentMatricula.alumno.contacto_emergencia_nombre} ({currentMatricula.alumno.contacto_emergencia_telefono})
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Sub-modal: Registrar Pago de Cuota con actualización inmediata */}
      {cuotaACobrar && (
        <RegistrarPagoCuotaModal
          isOpen={true}
          onClose={() => setCuotaACobrar(null)}
          matricula={currentMatricula}
          cuota={cuotaACobrar}
          onPagoRegistrado={() => {
            // Actualización instantánea en la vista del modal
            setCurrentMatricula((prev) => {
              const cuotasActualizadas = (prev.cuotas || []).map((c) =>
                c.id === cuotaACobrar.id
                  ? { ...c, estado: 'PAGADA' as const, fecha_pago: new Date().toISOString() }
                  : c
              );
              const nuevoSaldo = Math.max(0, Number(prev.saldo_pendiente) - Number(cuotaACobrar.monto));
              return {
                ...prev,
                cuotas: cuotasActualizadas,
                saldo_pendiente: nuevoSaldo,
              };
            });
            setCuotaACobrar(null);
            onUpdate();
          }}
        />
      )}

      {/* Sub-modal: Recibo de Matrícula */}
      {verTicket && (
        <ReciboMatriculaTicket
          isOpen={true}
          onClose={() => setVerTicket(false)}
          matricula={currentMatricula}
        />
      )}
    </>
  );
}
