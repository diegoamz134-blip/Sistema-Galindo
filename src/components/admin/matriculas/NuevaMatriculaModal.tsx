'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, AlertCircle, Calendar, CreditCard, Sparkles } from 'lucide-react';
import { Curso } from '@/types/database';
import { getCursosActivos, crearMatriculaCompleta, NuevaMatriculaInput, MatriculaConDetalle } from '@/lib/academia-service';
import { formatCurrency } from '@/lib/utils';
import { SEDES } from '@/lib/constants';

interface NuevaMatriculaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatriculaCreada: (nueva: MatriculaConDetalle) => void;
}

export function NuevaMatriculaModal({
  isOpen,
  onClose,
  onMatriculaCreada,
}: NuevaMatriculaModalProps) {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [distrito, setDistrito] = useState('Ica Centro');
  const [direccion, setDireccion] = useState('');
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('');
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('');

  // Académico
  const [cursoSeleccionadoId, setCursoSeleccionadoId] = useState<string>('');
  const [sede, setSede] = useState<string>('Sede Central Ica');
  const [turno, setTurno] = useState<'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO'>('MANANA');
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Pagos y Cuotas
  const [totalCurso, setTotalCurso] = useState<number>(750);
  const [montoMatricula, setMontoMatricula] = useState<number>(80);
  const [numeroCuotas, setNumeroCuotas] = useState<number>(2);
  const [metodoPago, setMetodoPago] = useState<string>('EFECTIVO');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [registrarEnCaja, setRegistrarEnCaja] = useState<boolean>(true);

  // Kit y Notas
  const [kitEntregado, setKitEntregado] = useState<boolean>(false);
  const [notas, setNotas] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setCargandoCursos(true);
      const list = await getCursosActivos();
      setCursos(list);
      if (list.length > 0) {
        const prim = list[0];
        setCursoSeleccionadoId(prim.id);
        setTotalCurso(prim.costo_total_contado || 750);
        setMontoMatricula(prim.costo_matricula || 80);
      }
      setCargandoCursos(false);
    }
    load();
  }, [isOpen]);

  // Al cambiar curso, ajustar montos sugeridos
  const handleCursoChange = (cId: string) => {
    setCursoSeleccionadoId(cId);
    const encontrado = cursos.find((c) => c.id === cId);
    if (encontrado) {
      setTotalCurso(encontrado.costo_total_contado || 750);
      setMontoMatricula(encontrado.costo_matricula || 80);
    }
  };

  // Cálculos automáticos
  const saldoPendiente = Math.max(0, totalCurso - montoMatricula);
  const montoPorCuota = numeroCuotas > 0 ? Math.round((saldoPendiente / numeroCuotas) * 10) / 10 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!dni || dni.length < 8) {
      setErrorMsg('El DNI debe tener 8 dígitos válidos.');
      return;
    }
    if (!nombres.trim() || !apellidos.trim()) {
      setErrorMsg('Por favor ingresa los nombres y apellidos del estudiante.');
      return;
    }
    if (!celular || celular.length < 9) {
      setErrorMsg('El celular debe tener al menos 9 dígitos para recordatorios.');
      return;
    }

    const cursoObj = cursos.find((c) => c.id === cursoSeleccionadoId);
    const cursoNombre = cursoObj ? cursoObj.titulo : 'Barbería Integral & Fade Profesional';

    setGuardando(true);

    const inputData: NuevaMatriculaInput = {
      dni: dni.trim(),
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      celular: celular.trim(),
      email: email.trim() || undefined,
      distrito,
      direccion: direccion.trim() || undefined,
      contacto_emergencia_nombre: contactoEmergenciaNombre.trim() || undefined,
      contacto_emergencia_telefono: contactoEmergenciaTelefono.trim() || undefined,
      curso_id: cursoSeleccionadoId,
      curso_nombre: cursoNombre,
      sede,
      turno,
      fecha_inicio: fechaInicio,
      monto_matricula_pagado: Number(montoMatricula) || 0,
      total_curso: Number(totalCurso) || 0,
      numero_cuotas: Number(numeroCuotas) || 0,
      monto_por_cuota: montoPorCuota,
      metodo_pago: metodoPago,
      numero_operacion: numeroOperacion.trim() || undefined,
      kit_entregado: kitEntregado,
      notas: notas.trim() || undefined,
      registrar_en_caja: registrarEnCaja,
    };

    const res = await crearMatriculaCompleta(inputData);

    if (res.ok && res.matricula) {
      onMatriculaCreada(res.matricula);
      onClose();
    } else {
      setErrorMsg(res.error || 'Error al guardar la matrícula. Inténtalo nuevamente.');
    }
    setGuardando(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-black text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Nueva Matrícula de Alumno
              </h3>
              <p className="text-[11px] text-zinc-500">
                Registro académico oficial, cronograma de cuotas y entrega de kit.
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
        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sección 1: Datos Personales del Estudiante */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                1. Datos del Estudiante
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  DNI (8 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  placeholder="74829103"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono font-bold focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Daniel"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mendoza Flores"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Celular WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={9}
                  placeholder="956321487"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Distrito / Ciudad
                </label>
                <select
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                >
                  <option value="Ica Centro">Ica Centro</option>
                  <option value="Parcona">Parcona</option>
                  <option value="La Tinguiña">La Tinguiña</option>
                  <option value="Subtanjalla">Subtanjalla</option>
                  <option value="San Juan Bautista">San Juan Bautista</option>
                  <option value="Los Aquijes">Los Aquijes</option>
                  <option value="Huancayo Centro">Huancayo Centro</option>
                  <option value="El Tambo">El Tambo</option>
                  <option value="Chilca">Chilca</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="alumno@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Contacto de Emergencia (Nombre)
                </label>
                <input
                  type="text"
                  placeholder="Familiar o apoderado"
                  value={contactoEmergenciaNombre}
                  onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Teléfono de Emergencia
                </label>
                <input
                  type="tel"
                  placeholder="956000000"
                  value={contactoEmergenciaTelefono}
                  onChange={(e) => setContactoEmergenciaTelefono(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono focus:border-black outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Datos Académicos */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                2. Curso & Horario
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Programa Académico *
                </label>
                <select
                  value={cursoSeleccionadoId}
                  onChange={(e) => handleCursoChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-semibold focus:border-black outline-none"
                >
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.duracion_semanas} semanas)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Sede Galindo *
                </label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                >
                  <option value="Sede Central Ica">Sede Central Ica (Calle Bolívar 536)</option>
                  <option value="Sede Huancayo">Sede Huancayo (Jr. Guido 654)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Turno de Clases *
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:border-black outline-none"
                >
                  <option value="MANANA">Mañana (09:00 AM - 12:00 PM)</option>
                  <option value="TARDE">Tarde (03:00 PM - 06:00 PM)</option>
                  <option value="NOCHE">Noche (07:00 PM - 09:30 PM)</option>
                  <option value="SABATINO">Sabatino Intensivo (09:00 AM - 02:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Fecha de Inicio de Clases
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono focus:border-black outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Plan Financiero y Cuotas */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h4 className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                3. Estructura de Pagos & Cuotas
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Costo Total del Curso (S/)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={totalCurso}
                  onChange={(e) => setTotalCurso(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono font-bold focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Matrícula Pagada Hoy (S/) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={montoMatricula}
                  onChange={(e) => setMontoMatricula(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 font-mono font-bold focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Número de Cuotas
                </label>
                <select
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-semibold focus:border-black outline-none"
                >
                  <option value={1}>1 Cuota mensual</option>
                  <option value={2}>2 Cuotas mensuales</option>
                  <option value={3}>3 Cuotas mensuales</option>
                  <option value={0}>0 (Pago Contado Completo)</option>
                </select>
              </div>
            </div>

            {/* Resumen dinámico del cronograma */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-zinc-500">Saldo restante a financiar: </span>
                <span className="font-mono font-bold text-zinc-900 text-sm">
                  {formatCurrency(saldoPendiente)}
                </span>
                {numeroCuotas > 0 && saldoPendiente > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Se generarán <strong className="text-zinc-800">{numeroCuotas} cuotas</strong> de{' '}
                    <strong className="text-zinc-900 font-mono">{formatCurrency(montoPorCuota)}</strong> cada 30 días.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 font-semibold text-zinc-800 outline-none"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="TRANSFERENCIA">Transferencia BCP/BBVA</option>
                </select>

                <input
                  type="text"
                  placeholder="N° Operación (Opcional)"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 font-mono text-xs outline-none"
                />
              </div>
            </div>

            {/* Opciones y Checkboxes */}
            <div className="pt-1 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={registrarEnCaja}
                  onChange={(e) => setRegistrarEnCaja(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
                />
                <span className="font-medium text-zinc-800">
                  Registrar ingreso del abono en Caja Chica activa
                </span>
              </label>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 rounded-xl bg-black text-white hover:bg-zinc-800 font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {guardando ? (
                <span>Guardando Matrícula...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Registrar Matrícula</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
