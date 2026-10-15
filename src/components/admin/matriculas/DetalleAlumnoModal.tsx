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
  XCircle,
  Ban,
  SlidersHorizontal,
  Check,
  Edit3,
  Banknote,
  Smartphone,
  Building2,
  CreditCard,
  Layers,
} from 'lucide-react';
import {
  MatriculaConDetalle,
  actualizarEstadoAcademico,
  actualizarSedeMatricula,
  actualizarPlanFinancieroMatricula,
  actualizarMetodoPagoMatricula,
  actualizarMetodoPagoCuota,
  matchSede,
  retirarMatricula,
} from '@/lib/academia-service';
import { CuotaMatricula, EstadoAcademico } from '@/types/database';
import { formatCurrency, formatDate, normalizarMetodoPago, extraerNumeroOperacion } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
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
  const { userMeta } = useAuth();
  const [currentMatricula, setCurrentMatricula] = useState<MatriculaConDetalle>(matricula);
  const [cuotaACobrar, setCuotaACobrar] = useState<CuotaMatricula | null>(null);
  const [verTicket, setVerTicket] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  // Estado para el flujo de confirmación de retiro
  const [retiroModalOpen, setRetiroModalOpen] = useState(false);
  const [motivoRetiro, setMotivoRetiro] = useState('');

  // Estado para el modal de edición de plan financiero
  const [editarPlanOpen, setEditarPlanOpen] = useState(false);
  const [nuevoTotalCurso, setNuevoTotalCurso] = useState<number>(0);
  const [nuevoMontoMatricula, setNuevoMontoMatricula] = useState<number>(0);
  const [modalidadPlan, setModalidadPlan] = useState<'CONTADO' | 'CUOTAS'>('CONTADO');
  const [numCuotasEditar, setNumCuotasEditar] = useState<number>(2);
  const [guardandoPlan, setGuardandoPlan] = useState<boolean>(false);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);

  // Estado para modal de cambio de método de pago (Matrícula inicial o Cuota)
  const [modalCambiarMetodo, setModalCambiarMetodo] = useState(false);
  const [targetEdicionMetodo, setTargetEdicionMetodo] = useState<{
    tipo: 'MATRICULA' | 'CUOTA';
    id: string;
    numeroCuota?: number;
    metodoActual: string;
    operacionActual?: string;
  } | null>(null);
  const [nuevoMetodoPago, setNuevoMetodoPago] = useState<string>('YAPE');
  const [nuevoNumOperacion, setNuevoNumOperacion] = useState<string>('');
  const [guardandoMetodo, setGuardandoMetodo] = useState<boolean>(false);
  const [errorCambiarMetodo, setErrorCambiarMetodo] = useState<string | null>(null);

  const handleAbrirCambiarMetodo = (
    tipo: 'MATRICULA' | 'CUOTA',
    id: string,
    metodoActual: string,
    operacionActual?: string,
    numeroCuota?: number
  ) => {
    setTargetEdicionMetodo({ tipo, id, numeroCuota, metodoActual, operacionActual });
    setNuevoMetodoPago(metodoActual || 'YAPE');
    setNuevoNumOperacion(operacionActual || '');
    setErrorCambiarMetodo(null);
    setModalCambiarMetodo(true);
  };

  const handleGuardarCambioMetodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEdicionMetodo) return;

    setGuardandoMetodo(true);
    setErrorCambiarMetodo(null);

    try {
      if (targetEdicionMetodo.tipo === 'MATRICULA') {
        const res = await actualizarMetodoPagoMatricula(
          targetEdicionMetodo.id,
          nuevoMetodoPago,
          nuevoNumOperacion
        );
        if (!res.ok) throw new Error(res.error || 'Error al actualizar método de pago');

        setCurrentMatricula((prev) => ({
          ...prev,
          metodo_pago: res.metodo_pago || nuevoMetodoPago,
          numero_operacion: nuevoNumOperacion || undefined,
        }));
      } else {
        const res = await actualizarMetodoPagoCuota(
          targetEdicionMetodo.id,
          nuevoMetodoPago,
          nuevoNumOperacion
        );
        if (!res.ok) throw new Error(res.error || 'Error al actualizar método de pago');

        setCurrentMatricula((prev) => ({
          ...prev,
          cuotas: (prev.cuotas || []).map((c) =>
            c.id === targetEdicionMetodo.id
              ? { ...c, metodo_pago: nuevoMetodoPago as any, numero_operacion: nuevoNumOperacion || undefined }
              : c
          ),
        }));
      }

      setModalCambiarMetodo(false);
      onUpdate();
    } catch (err: any) {
      setErrorCambiarMetodo(err?.message || 'Error al guardar los cambios');
    } finally {
      setGuardandoMetodo(false);
    }
  };

  // Sincronizar si cambia el prop
  useEffect(() => {
    setCurrentMatricula(matricula);
  }, [matricula]);

  if (!isOpen) return null;

  const usuarioNombre = userMeta?.nombre || 'Administrador';
  const esRetirado = currentMatricula.estado === 'RETIRADO';

  // Intercepta el cambio de estado: si es RETIRADO, abre confirmación
  const handleEstadoChange = async (nuevoEstado: EstadoAcademico) => {
    if (nuevoEstado === 'RETIRADO') {
      setRetiroModalOpen(true);
      return;
    }
    setActualizandoEstado(true);
    setCurrentMatricula((prev) => ({ ...prev, estado: nuevoEstado }));
    await actualizarEstadoAcademico(currentMatricula.id, nuevoEstado);
    onUpdate();
    setActualizandoEstado(false);
  };

  // Confirmar el retiro formal con condonación de cuotas
  const handleConfirmarRetiro = async () => {
    setActualizandoEstado(true);
    const resultado = await retirarMatricula(currentMatricula.id, motivoRetiro, usuarioNombre);
    if (resultado.ok) {
      // Actualizar UI localmente: marcar cuotas pendientes como condonadas
      setCurrentMatricula((prev) => ({
        ...prev,
        estado: 'RETIRADO',
        saldo_pendiente: 0,
        cuotas: (prev.cuotas || []).map((c) =>
          c.estado === 'PENDIENTE' || c.estado === 'VENCIDA'
            ? { ...c, estado: 'CONDONADA' as const }
            : c
        ),
      }));
      onUpdate();
    } else {
      alert(`Error al procesar el retiro: ${resultado.error}`);
    }
    setRetiroModalOpen(false);
    setMotivoRetiro('');
    setActualizandoEstado(false);
  };

  const [actualizandoSede, setActualizandoSede] = useState(false);
  const handleSedeChange = async (nuevaSede: string) => {
    setActualizandoSede(true);
    setCurrentMatricula((prev) => ({
      ...prev,
      sede: nuevaSede,
    }));
    await actualizarSedeMatricula(currentMatricula.id, nuevaSede);
    onUpdate();
    setActualizandoSede(false);
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

  // ── Cálculos Financieros Robustos ─────────────────────────────────────
  const costoCursoEfectivo =
    Number(currentMatricula.total_curso) > 0
      ? Number(currentMatricula.total_curso)
      : (Number(currentMatricula.curso?.costo_total_contado) ||
         Number(currentMatricula.curso?.costo_mensualidad) ||
         Number(currentMatricula.monto_matricula_pagado) || 0);

  const pagadoMatricula = Number(currentMatricula.monto_matricula_pagado) || 0;
  const cuotasPagadasSuma = (currentMatricula.cuotas || [])
    .filter((c) => c.estado === 'PAGADA')
    .reduce((acc, c) => acc + (Number(c.monto) || 0), 0);

  const tieneCuotas = Boolean(currentMatricula.cuotas && currentMatricula.cuotas.length > 0);
  const saldoPendienteBD = Number(currentMatricula.saldo_pendiente) || 0;

  // Se considera liquidado al contado si no existen cuotas pendientes de pago y el saldo en BD es 0
  const esLiquidadoContado =
    (!tieneCuotas || currentMatricula.cuotas.every((c) => c.estado === 'PAGADA' || c.estado === 'CONDONADA')) &&
    saldoPendienteBD <= 0;

  // La matrícula es independiente de las cuotas del curso.
  // El saldo de las cuotas solo disminuye con los pagos de cuotas.
  const totalCuotasAbonadas = esLiquidadoContado
    ? costoCursoEfectivo
    : cuotasPagadasSuma;

  const saldoEfectivo = esLiquidadoContado ? 0 : Math.max(0, costoCursoEfectivo - totalCuotasAbonadas);
  const totalInversionEstudiante = pagadoMatricula + costoCursoEfectivo;
  const totalRecaudadoEstudiante = pagadoMatricula + cuotasPagadasSuma;
  const montoCursoLiquidadoContado = costoCursoEfectivo;
  const totalAbonado = pagadoMatricula + totalCuotasAbonadas;

  const handleAbrirEditarPlan = () => {
    setNuevoTotalCurso(costoCursoEfectivo);
    setNuevoMontoMatricula(pagadoMatricula);
    setModalidadPlan(esLiquidadoContado ? 'CONTADO' : 'CUOTAS');
    setNumCuotasEditar(currentMatricula.cuotas && currentMatricula.cuotas.length > 0 ? currentMatricula.cuotas.length : 2);
    setErrorPlan(null);
    setEditarPlanOpen(true);
  };

  const handleGuardarPlanFinanciero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoTotalCurso <= 0) {
      setErrorPlan('El costo total del curso debe ser mayor a S/ 0.');
      return;
    }
    setGuardandoPlan(true);
    setErrorPlan(null);

    const res = await actualizarPlanFinancieroMatricula({
      matriculaId: currentMatricula.id,
      total_curso: nuevoTotalCurso,
      monto_matricula_pagado: nuevoMontoMatricula,
      modalidad: modalidadPlan,
      numero_cuotas: modalidadPlan === 'CUOTAS' ? numCuotasEditar : 0,
    });

    if (res.ok) {
      setCurrentMatricula((prev) => ({
        ...prev,
        total_curso: nuevoTotalCurso,
        monto_matricula_pagado: nuevoMontoMatricula,
        saldo_pendiente: res.saldo_pendiente ?? (modalidadPlan === 'CONTADO' ? 0 : nuevoTotalCurso),
        cuotas: res.cuotas || [],
      }));
      setEditarPlanOpen(false);
      onUpdate();
    } else {
      setErrorPlan(res.error || 'Error al guardar los cambios en el plan financiero');
    }
    setGuardandoPlan(false);
  };

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
                <p className="font-bold text-zinc-900 mt-0.5 truncate">{currentMatricula.curso_nombre || currentMatricula.curso?.titulo}</p>
                <div className="mt-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block">Sede Asignada:</label>
                  <select
                    value={matchSede(currentMatricula.sede, 'huancayo') ? 'Sede Huancayo' : 'Sede Central Ica'}
                    disabled={actualizandoSede}
                    onChange={(e) => handleSedeChange(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1 rounded bg-white border border-zinc-300 font-bold text-zinc-900 text-xs outline-none focus:border-black"
                  >
                    <option value="Sede Central Ica">Sede Central Ica</option>
                    <option value="Sede Huancayo">Sede Huancayo</option>
                  </select>
                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-zinc-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Cronograma de Cuotas & Pagos</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAbrirEditarPlan}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors border border-zinc-200 cursor-pointer active:scale-95 shadow-2xs"
                    title="Ajustar costo total, modalidad al contado o generar cuotas"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Editar Costo & Cuotas</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-zinc-500">
                    Total Curso: <strong className="font-mono text-zinc-900">{formatCurrency(costoCursoEfectivo)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-500">
                    Cuotas Pagadas: <strong className="font-mono text-emerald-600">{formatCurrency(totalCuotasAbonadas)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-500">
                    Saldo Cuotas: <strong className="font-mono text-amber-600">{formatCurrency(saldoEfectivo)}</strong>
                  </span>
                </div>
              </div>

              {/* Lista de Cuotas y Pagos */}
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
                    {/* Fila Fija 1: Matrícula Inicial */}
                    {(() => {
                      const metodoMatricula = normalizarMetodoPago(currentMatricula.metodo_pago, currentMatricula.notas);
                      const opMatricula = currentMatricula.numero_operacion || extraerNumeroOperacion(undefined, currentMatricula.notas);

                      return (
                        <tr className="bg-emerald-50/40">
                          <td className="px-3 py-2.5 font-bold text-zinc-900">
                            Matrícula Inicial
                          </td>
                          <td className="px-3 py-2.5 text-zinc-500 font-mono">
                            {formatDate(currentMatricula.fecha_matricula)}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-zinc-900">
                            {formatCurrency(pagadoMatricula)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                PAGADA
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  metodoMatricula === 'YAPE'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : metodoMatricula === 'PLIN'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                    : metodoMatricula === 'TRANSFERENCIA'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : metodoMatricula === 'TARJETA'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                                }`}
                              >
                                {metodoMatricula}
                              </span>
                              {opMatricula && (
                                <span className="text-[10px] text-zinc-400 font-mono font-medium">
                                  #{opMatricula}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleAbrirCambiarMetodo('MATRICULA', currentMatricula.id, metodoMatricula, opMatricula)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-zinc-200 hover:border-black text-zinc-700 hover:text-black font-bold text-[10px] transition-colors shadow-2xs cursor-pointer active:scale-95"
                              title="Editar o corregir el método de pago de esta matrícula"
                            >
                              <Edit3 className="w-3 h-3 text-zinc-500" />
                              <span>Cambiar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })()}

                    {/* Caso A: Si el curso fue liquidado al contado en un solo pago */}
                    {esLiquidadoContado && (
                      <>
                        {montoCursoLiquidadoContado > 0 && (
                          <tr className="bg-emerald-50/20">
                            <td className="px-3 py-2.5 font-bold text-zinc-900 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Liquidación de Curso al Contado</span>
                            </td>
                            <td className="px-3 py-2.5 text-zinc-500 font-mono">
                              {formatDate(currentMatricula.fecha_matricula)}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold text-emerald-700">
                              {formatCurrency(montoCursoLiquidadoContado)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                PAGADA (CONTADO)
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-zinc-500 font-mono text-[11px]">
                              Cancelación Total
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={5} className="px-4 py-3 bg-emerald-50/50 text-center border-t border-emerald-100">
                            <div className="flex items-center justify-center gap-2 text-emerald-900 font-semibold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Este curso fue <strong>liquidado en un solo pago de contado</strong> por un valor total de <strong>{formatCurrency(totalAbonado)}</strong>. No hay cuotas pendientes.
                              </span>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Caso B: Cronograma en Cuotas Mensuales */}
                    {!esLiquidadoContado && currentMatricula.cuotas && currentMatricula.cuotas.length > 0 ? (
                      currentMatricula.cuotas.map((cuota) => {
                        const esPagada = cuota.estado === 'PAGADA';
                        const esVencida = cuota.estado === 'VENCIDA';
                        const esCondonada = cuota.estado === 'CONDONADA';
                        // Bloquear cobro si el alumno está retirado o la cuota fue condonada
                        const bloquearCobro = esRetirado || esCondonada;

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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      cuota.metodo_pago === 'YAPE'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : cuota.metodo_pago === 'PLIN'
                                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                        : cuota.metodo_pago === 'TRANSFERENCIA'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : cuota.metodo_pago === 'TARJETA'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                  >
                                    PAGADA ({cuota.metodo_pago || 'PAGO'})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAbrirCambiarMetodo(
                                        'CUOTA',
                                        cuota.id,
                                        cuota.metodo_pago || 'EFECTIVO',
                                        cuota.numero_operacion,
                                        cuota.numero_cuota
                                      )
                                    }
                                    className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
                                    title="Editar método de pago de esta cuota"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : esCondonada ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                                  CONDONADA
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
                              ) : esCondonada ? (
                                <span className="text-[11px] text-zinc-400 font-mono">Retiro</span>
                              ) : bloquearCobro ? (
                                <span className="text-[11px] text-zinc-400 font-mono flex items-center justify-end gap-1">
                                  <Ban className="w-3 h-3" /> Bloqueado
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
                    ) : !esLiquidadoContado ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-5 text-center text-zinc-500">
                          <p className="font-semibold text-xs text-zinc-700">No hay cuotas programadas para este alumno.</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5 mb-2">Haz clic en el botón de abajo para generar las cuotas mensuales.</p>
                          <button
                            type="button"
                            onClick={handleAbrirEditarPlan}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Generar Cuotas Mensuales</span>
                          </button>
                        </td>
                      </tr>
                    ) : null}
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

      {/* ── Modal de Confirmación de Retiro ────────────────────────────────── */}
      {retiroModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-black text-zinc-950 text-sm">Confirmar Retiro de Alumno</h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {currentMatricula.alumno.nombres} {currentMatricula.alumno.apellidos} —{' '}
                  <span className="font-mono">{currentMatricula.codigo_matricula}</span>
                </p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Esto realizará automáticamente:</p>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700 pl-1">
                <li>Cambiar estado del alumno a <strong>RETIRADO</strong></li>
                <li>Marcar todas las cuotas pendientes como <strong>CONDONADAS</strong></li>
                <li>Poner saldo pendiente en <strong>S/ 0.00</strong></li>
                <li>Registrar auditoría con fecha, motivo y usuario</li>
              </ul>
            </div>

            {/* Input de motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 block">
                Motivo del retiro <span className="text-zinc-400 font-normal">(obligatorio)</span>
              </label>
              <textarea
                value={motivoRetiro}
                onChange={(e) => setMotivoRetiro(e.target.value)}
                placeholder="Ej: Alumno no puede continuar por motivos personales..."
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs text-zinc-900 outline-none focus:border-rose-400 resize-none h-20 font-medium"
                autoFocus
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setRetiroModalOpen(false); setMotivoRetiro(''); }}
                disabled={actualizandoEstado}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRetiro}
                disabled={actualizandoEstado || !motivoRetiro.trim()}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-colors disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {actualizandoEstado ? 'Procesando...' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Edición de Plan Financiero (Costo & Cuotas) ──────────── */}
      {editarPlanOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden my-6">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-950 text-sm">
                    Editar Costo & Plan de Cuotas
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    {currentMatricula.alumno.nombres} {currentMatricula.alumno.apellidos} • <span className="font-mono">{currentMatricula.codigo_matricula}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditarPlanOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardarPlanFinanciero} className="p-5 space-y-4 text-xs">
              
              {errorPlan && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorPlan}</span>
                </div>
              )}

              {/* Programa actual */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">Programa Asignado</span>
                  <span className="font-bold text-zinc-900 text-xs">{currentMatricula.curso_nombre || currentMatricula.curso?.titulo}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-zinc-200 text-zinc-800">
                  {currentMatricula.sede}
                </span>
              </div>

              {/* Valores monetarios principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Costo Total del Curso (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={nuevoTotalCurso}
                    onChange={(e) => setNuevoTotalCurso(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-mono font-bold text-zinc-950 focus:border-black outline-none text-sm"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Precio pactado oficial por todo el curso</p>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Matrícula Inicial Pagada (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={nuevoMontoMatricula}
                    onChange={(e) => setNuevoMontoMatricula(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 font-mono font-bold text-emerald-950 focus:border-emerald-600 outline-none text-sm"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">Abonado el primer día al registrarse</p>
                </div>
              </div>

              {/* Modalidad de Pago */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-zinc-800 uppercase tracking-wider text-[11px]">
                  Modalidad de Liquidación / Cobro
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opción 1: Contado */}
                  <label
                    onClick={() => setModalidadPlan('CONTADO')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      modalidadPlan === 'CONTADO'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                        : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 text-xs">Pago al Contado (100%)</span>
                      <input
                        type="radio"
                        name="modalidadPlan"
                        checked={modalidadPlan === 'CONTADO'}
                        onChange={() => setModalidadPlan('CONTADO')}
                        className="accent-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                      El curso se considera liquidado en su totalidad. Saldo: <strong>S/ 0.00</strong>. No genera cuotas.
                    </p>
                  </label>

                  {/* Opción 2: Cuotas */}
                  <label
                    onClick={() => setModalidadPlan('CUOTAS')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      modalidadPlan === 'CUOTAS'
                        ? 'border-black bg-zinc-100 ring-2 ring-black/10'
                        : 'border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 text-xs">En Cuotas Mensuales</span>
                      <input
                        type="radio"
                        name="modalidadPlan"
                        checked={modalidadPlan === 'CUOTAS'}
                        onChange={() => setModalidadPlan('CUOTAS')}
                        className="accent-black"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5">
                      Divide el saldo restante en cuotas con vencimiento mensual cada 30 días.
                    </p>
                  </label>
                </div>
              </div>

              {/* Si es cuotas, selector de cuotas y cálculo */}
              {modalidadPlan === 'CUOTAS' && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-800">
                      Número de Cuotas a Generar:
                    </label>
                    <select
                      value={numCuotasEditar}
                      onChange={(e) => setNumCuotasEditar(parseInt(e.target.value) || 1)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 font-bold text-zinc-900 outline-none focus:border-black"
                    >
                      <option value={1}>1 Cuota mensual</option>
                      <option value={2}>2 Cuotas mensuales</option>
                      <option value={3}>3 Cuotas mensuales</option>
                      <option value={4}>4 Cuotas mensuales</option>
                      <option value={5}>5 Cuotas mensuales</option>
                      <option value={6}>6 Cuotas mensuales</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500">Saldo a financiar: </span>
                      <strong className="font-mono text-zinc-950 font-bold">
                        {formatCurrency(Math.max(0, nuevoTotalCurso - nuevoMontoMatricula))}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Cada cuota: </span>
                      <strong className="font-mono text-emerald-700 font-bold text-sm">
                        {formatCurrency(
                          Math.max(0, nuevoTotalCurso - nuevoMontoMatricula) > 0
                            ? Math.round((Math.max(0, nuevoTotalCurso - nuevoMontoMatricula) / numCuotasEditar) * 10) / 10
                            : 0
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditarPlanOpen(false)}
                  disabled={guardandoPlan}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPlan || nuevoTotalCurso <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {guardandoPlan ? 'Guardando...' : 'Guardar Plan Financiero'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal para Cambiar Método de Pago */}
      {modalCambiarMetodo && targetEdicionMetodo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-950">
                    Cambiar Método de Pago
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    {targetEdicionMetodo.tipo === 'MATRICULA'
                      ? `Matrícula Inicial (${currentMatricula.codigo_matricula})`
                      : `Cuota #${targetEdicionMetodo.numeroCuota}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCambiarMetodo(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorCambiarMetodo && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorCambiarMetodo}
              </div>
            )}

            <form onSubmit={handleGuardarCambioMetodo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Selecciona el método de pago real:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'EFECTIVO', label: 'Efectivo', icon: Banknote, color: 'hover:border-emerald-500', active: 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600' },
                    { id: 'YAPE', label: 'Yape', icon: Smartphone, color: 'hover:border-purple-500', active: 'border-purple-600 bg-purple-50 text-purple-950 ring-1 ring-purple-600' },
                    { id: 'PLIN', label: 'Plin', icon: Smartphone, color: 'hover:border-sky-500', active: 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600' },
                    { id: 'TRANSFERENCIA', label: 'Transferencia BCP', icon: Building2, color: 'hover:border-blue-500', active: 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600' },
                    { id: 'TARJETA', label: 'Tarjeta POS', icon: CreditCard, color: 'hover:border-amber-500', active: 'border-amber-600 bg-amber-50 text-amber-950 ring-1 ring-amber-600' },
                    { id: 'MIXTO', label: 'Pago Mixto', icon: Layers, color: 'hover:border-zinc-500', active: 'border-zinc-800 bg-zinc-100 text-zinc-950 ring-1 ring-zinc-800' },
                  ].map((opc) => {
                    const Icon = opc.icon;
                    const isSelected = nuevoMetodoPago === opc.id;
                    return (
                      <button
                        key={opc.id}
                        type="button"
                        onClick={() => setNuevoMetodoPago(opc.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected ? opc.active : `border-zinc-200 bg-zinc-50/50 text-zinc-700 ${opc.color}`
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{opc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  N° Operación / Referencia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1984210"
                  value={nuevoNumOperacion}
                  onChange={(e) => setNuevoNumOperacion(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono focus:border-black outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalCambiarMetodo(false)}
                  disabled={guardandoMetodo}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMetodo}
                  className="flex-1 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {guardandoMetodo ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
