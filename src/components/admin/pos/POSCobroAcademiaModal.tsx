'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  GraduationCap,
  DollarSign,
  Check,
  AlertCircle,
  Calendar,
  User,
  CreditCard,
  Building2,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  getMatriculasConDetalle,
  pagarCuota,
  matchSede,
  MatriculaConDetalle,
} from '@/lib/academia-service';
import { CuotaMatricula } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReciboMatriculaTicket } from '@/components/admin/matriculas/ReciboMatriculaTicket';

interface POSCobroAcademiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sedeId: 'ica' | 'huancayo';
  onPagoCompletado?: () => void;
}

export function POSCobroAcademiaModal({
  isOpen,
  onClose,
  sedeId,
  onPagoCompletado,
}: POSCobroAcademiaModalProps) {
  const [matriculas, setMatriculas] = useState<MatriculaConDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [matriculaSeleccionada, setMatriculaSeleccionada] = useState<MatriculaConDetalle | null>(null);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaMatricula | null>(null);

  // Formulario de Cobro
  const [monto, setMonto] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Ticket comprobante
  const [ticketParaImprimir, setTicketParaImprimir] = useState<MatriculaConDetalle | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMatriculaSeleccionada(null);
      setCuotaSeleccionada(null);
      setBusqueda('');
      setErrorMsg(null);
      setExitoMsg(null);
      return;
    }

    async function cargar() {
      setCargando(true);
      try {
        const list = await getMatriculasConDetalle();
        setMatriculas(list);
      } catch (err) {
        console.error('Error al cargar matrículas en POS:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [isOpen]);

  // Filtrar alumnos por sede y búsqueda
  const alumnosFiltrados = useMemo(() => {
    let list = matriculas;
    if (sedeId) {
      list = list.filter((m) => matchSede(m.sede, sedeId));
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter((m) => {
        const nom = `${m.alumno?.nombres || ''} ${m.alumno?.apellidos || ''}`.toLowerCase();
        const dni = m.alumno?.dni || '';
        const cod = m.codigo_matricula?.toLowerCase() || '';
        return nom.includes(q) || dni.includes(q) || cod.includes(q);
      });
    }
    return list;
  }, [matriculas, sedeId, busqueda]);

  // Al seleccionar un alumno, sugerir la primera cuota pendiente
  const handleSeleccionarAlumno = (mat: MatriculaConDetalle) => {
    setMatriculaSeleccionada(mat);
    setErrorMsg(null);
    setExitoMsg(null);

    const primeraPendiente = (mat.cuotas || []).find((c) => c.estado !== 'PAGADA');
    if (primeraPendiente) {
      setCuotaSeleccionada(primeraPendiente);
      setMonto(Number(primeraPendiente.monto) || 0);
    } else {
      setCuotaSeleccionada(null);
      setMonto(0);
    }
  };

  const handleSeleccionarCuota = (cuota: CuotaMatricula) => {
    setCuotaSeleccionada(cuota);
    setMonto(Number(cuota.monto) || 0);
    setErrorMsg(null);
  };

  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matriculaSeleccionada || !cuotaSeleccionada) {
      setErrorMsg('Selecciona una cuota para cobrar.');
      return;
    }
    if (monto <= 0) {
      setErrorMsg('El monto a cobrar debe ser mayor a 0.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await pagarCuota({
        cuota_id: cuotaSeleccionada.id,
        matricula_id: matriculaSeleccionada.id,
        monto: Number(monto),
        metodo_pago: metodoPago,
        numero_operacion: numeroOperacion.trim() || undefined,
        notas: notas.trim() || undefined,
        registrar_en_caja: true,
      });

      if (res.ok) {
        setExitoMsg(`¡Cobro de S/ ${Number(monto).toFixed(2)} registrado con éxito en Caja Chica!`);
        
        // Actualizar estado local
        setMatriculas((prev) =>
          prev.map((m) => {
            if (m.id !== matriculaSeleccionada.id) return m;
            const nuevoSaldo = Math.max(0, Number(m.saldo_pendiente) - Number(monto));
            const cuotasActualizadas = (m.cuotas || []).map((c) =>
              c.id === cuotaSeleccionada.id
                ? {
                    ...c,
                    estado: 'PAGADA' as const,
                    fecha_pago: new Date().toISOString(),
                    metodo_pago: metodoPago as any,
                  }
                : c
            );
            return {
              ...m,
              saldo_pendiente: nuevoSaldo,
              cuotas: cuotasActualizadas,
            };
          })
        );

        // Actualizar alumno seleccionado para reflejar el pago
        setMatriculaSeleccionada((prev) => {
          if (!prev) return null;
          const nuevoSaldo = Math.max(0, Number(prev.saldo_pendiente) - Number(monto));
          const cuotasActualizadas = (prev.cuotas || []).map((c) =>
            c.id === cuotaSeleccionada.id
              ? {
                  ...c,
                  estado: 'PAGADA' as const,
                  fecha_pago: new Date().toISOString(),
                  metodo_pago: metodoPago as any,
                }
              : c
          );
          return {
            ...prev,
            saldo_pendiente: nuevoSaldo,
            cuotas: cuotasActualizadas,
          };
        });

        // Buscar siguiente cuota pendiente
        const siguiente = (matriculaSeleccionada.cuotas || []).find(
          (c) => c.id !== cuotaSeleccionada.id && c.estado !== 'PAGADA'
        );
        if (siguiente) {
          setCuotaSeleccionada(siguiente);
          setMonto(Number(siguiente.monto) || 0);
        } else {
          setCuotaSeleccionada(null);
          setMonto(0);
        }

        if (onPagoCompletado) {
          onPagoCompletado();
        }
      } else {
        setErrorMsg(res.error || 'No se pudo registrar el pago en caja.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al registrar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
          
          {/* Header del Modal */}
          <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-950 uppercase tracking-tight flex items-center gap-2">
                  <span>Cobrar Mensualidad / Cuota de Alumno</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Caja POS
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Ingreso directo a la caja chica del turno actual ({sedeId === 'huancayo' ? 'Sede Huancayo' : 'Sede Central Ica'}).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenido en 2 Columnas: Lista de Alumnos + Formulario de Cobro */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-200">
            
            {/* Columna Izquierda: Buscador y Lista de Estudiantes (5 cols) */}
            <div className="md:col-span-5 p-4 flex flex-col space-y-3 overflow-hidden bg-zinc-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por DNI o nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:border-black outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-semibold">
                <span>Alumnos Registrados ({alumnosFiltrados.length})</span>
                <span>{sedeId === 'huancayo' ? 'Huancayo' : 'Ica'}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cargando ? (
                  <div className="py-12 text-center text-zinc-400 text-xs">
                    Cargando estudiantes...
                  </div>
                ) : alumnosFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-xs">
                    No se encontraron alumnos con deudas en esta sede.
                  </div>
                ) : (
                  alumnosFiltrados.map((mat) => {
                    const seleccionado = matriculaSeleccionada?.id === mat.id;
                    const saldoCero = Number(mat.saldo_pendiente) <= 0;
                    const tieneVencida = (mat.cuotas || []).some((c) => c.estado === 'VENCIDA');
                    const pendientesCount = (mat.cuotas || []).filter((c) => c.estado !== 'PAGADA').length;

                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => handleSeleccionarAlumno(mat)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                          seleccionado
                            ? 'bg-black text-white border-black shadow-md'
                            : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-xs truncate">
                            {mat.alumno?.nombres} {mat.alumno?.apellidos}
                          </p>
                          <p className={`text-[10px] font-mono ${seleccionado ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            DNI: {mat.alumno?.dni} • {mat.codigo_matricula}
                          </p>
                          <p className={`text-[10px] truncate ${seleccionado ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {mat.curso_nombre || 'Curso Barbería'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-bold text-xs block ${
                              saldoCero
                                ? seleccionado ? 'text-emerald-400' : 'text-emerald-600'
                                : seleccionado ? 'text-amber-300' : 'text-amber-600'
                            }`}
                          >
                            {formatCurrency(mat.saldo_pendiente)}
                          </span>
                          <span className={`text-[9px] font-semibold uppercase ${
                            saldoCero ? 'text-emerald-500' : tieneVencida ? 'text-rose-500' : 'text-zinc-400'
                          }`}>
                            {saldoCero ? 'Al Día' : `${pendientesCount} cuota(s)`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Columna Derecha: Detalle de Cuotas & Panel de Cobro (7 cols) */}
            <div className="md:col-span-7 p-5 flex flex-col space-y-4 overflow-y-auto">
              {matriculaSeleccionada ? (
                <>
                  {/* Ficha rápida del Alumno Seleccionado */}
                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-zinc-950">
                          {matriculaSeleccionada.alumno?.nombres} {matriculaSeleccionada.alumno?.apellidos}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                          {matriculaSeleccionada.codigo_matricula}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5 font-medium">
                        {matriculaSeleccionada.curso_nombre || 'Curso'} • Turno {matriculaSeleccionada.turno}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Saldo Pendiente</span>
                        <span className="text-sm font-black text-amber-700">
                          {formatCurrency(matriculaSeleccionada.saldo_pendiente)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTicketParaImprimir(matriculaSeleccionada)}
                        className="p-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 shadow-2xs transition-colors cursor-pointer"
                        title="Ver / Imprimir Comprobante"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mensajes de Alerta o Éxito */}
                  {exitoMsg && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{exitoMsg}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Cronograma de Cuotas del Alumno */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Selecciona la cuota que el alumno pagará:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(matriculaSeleccionada.cuotas || []).map((c) => {
                        const esSeleccionada = cuotaSeleccionada?.id === c.id;
                        const esPagada = c.estado === 'PAGADA';

                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={esPagada}
                            onClick={() => handleSeleccionarCuota(c)}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                              esPagada
                                ? 'bg-zinc-100/70 border-zinc-200 opacity-60 cursor-not-allowed text-zinc-500'
                                : esSeleccionada
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900 cursor-pointer shadow-2xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span>Cuota #{c.numero_cuota}</span>
                                {esPagada && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                                    PAGADA
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                Vence: {formatDate(c.fecha_vencimiento)}
                              </p>
                            </div>

                            <span className="font-mono font-black text-xs">
                              {formatCurrency(c.monto)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formulario de Cobro Inmediato */}
                  {cuotaSeleccionada && (
                    <form onSubmit={handleConfirmarCobro} className="space-y-3 pt-2 border-t border-zinc-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">
                            Monto a Cobrar (S/) *
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            min="1"
                            value={monto}
                            onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-mono font-bold text-sm focus:border-emerald-600 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">
                            Método de Pago *
                          </label>
                          <select
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-bold text-xs text-zinc-900 focus:border-black outline-none"
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="YAPE">Yape</option>
                            <option value="PLIN">Plin</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="TARJETA">Tarjeta Débito/Crédito</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-800 mb-1">
                            N° Operación (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 981240"
                            value={numeroOperacion}
                            onChange={(e) => setNumeroOperacion(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-mono text-xs text-zinc-900 focus:border-black outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="text-[11px] text-zinc-500 font-medium">
                          ✓ Se sumará automáticamente a la caja del turno.
                        </div>

                        <button
                          type="submit"
                          disabled={procesando || monto <= 0}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{procesando ? 'Registrando...' : 'Confirmar Cobro en Caja'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-400 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-800 text-sm">
                      Selecciona un estudiante
                    </h4>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1">
                      Usa el buscador de la izquierda para encontrar al alumno por DNI o nombre y cobrar su cuota mensual.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Modal de Ticket de Matrícula / Cuota si desea imprimir */}
      {ticketParaImprimir && (
        <ReciboMatriculaTicket
          isOpen={Boolean(ticketParaImprimir)}
          onClose={() => setTicketParaImprimir(null)}
          matricula={ticketParaImprimir}
        />
      )}
    </>
  );
}
