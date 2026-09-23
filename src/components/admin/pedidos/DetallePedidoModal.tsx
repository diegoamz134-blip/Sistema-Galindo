'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  GraduationCap,
  Store,
  User,
  Phone,
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Printer,
  MessageCircle,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Send,
  RotateCcw,
  UserCheck,
  FileText,
  UserPlus,
  Scissors,
  ArrowRight,
  Sparkles,
  Edit3,
} from 'lucide-react';
import {
  PedidoCompleto,
  actualizarEstadoPedido,
  eliminarPedido,
  generarMensajeWhatsApp,
  TipoPlantillaWhatsApp,
  buscarAlumnoExistente,
  buscarMatriculaExistente,
  formalizarMatriculaDesdePedido,
  FormalizarMatriculaInput,
} from '@/lib/pedidos-service';
import { getCursosActivos } from '@/lib/academia-service';
import { formatCurrency } from '@/lib/utils';
import { SEDES, SedeId, BUSINESS_INFO } from '@/lib/constants';
import { Alumno, Matricula, Curso } from '@/types/database';

interface DetallePedidoModalProps {
  pedido: PedidoCompleto | null;
  isOpen: boolean;
  onClose: () => void;
  onPedidoActualizado: () => void;
  initialTab?: 'DETALLE' | 'WHATSAPP' | 'ACADEMIA';
}

export function DetallePedidoModal({
  pedido,
  isOpen,
  onClose,
  onPedidoActualizado,
  initialTab = 'DETALLE',
}: DetallePedidoModalProps) {
  // Pestañas activas: DETALLE | WHATSAPP | ACADEMIA
  const [activeTab, setActiveTab] = useState<'DETALLE' | 'WHATSAPP' | 'ACADEMIA'>('DETALLE');
  const [actualizando, setActualizando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiadoMsg, setCopiadoMsg] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // --- ESTADO DE WHATSAPP ---
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<TipoPlantillaWhatsApp>('RECIBIDO');
  const [mensajeEditable, setMensajeEditable] = useState<string>('');
  const [waTurno, setWaTurno] = useState<string>('Mañana (9:00 AM - 12:00 PM)');
  const [waFechaInicio, setWaFechaInicio] = useState<string>('');

  // --- ESTADO DE FICHA ALUMNO / MATRÍCULA ---
  const [alumnoExistente, setAlumnoExistente] = useState<Alumno | null>(null);
  const [matriculaExistente, setMatriculaExistente] = useState<Matricula | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [guardandoMatricula, setGuardandoMatricula] = useState(false);
  const [cursosDisponibles, setCursosDisponibles] = useState<Curso[]>([]);
  const [matriculaExitosaCodigo, setMatriculaExitosaCodigo] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Formulario de Inscripción / Formalización
  const [formDni, setFormDni] = useState('');
  const [formNombres, setFormNombres] = useState('');
  const [formApellidos, setFormApellidos] = useState('');
  const [formCelular, setFormCelular] = useState('');
  const [formFechaNac, setFormFechaNac] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formDistrito, setFormDistrito] = useState('Ica Centro');
  const [formContactoEmergenciaNombre, setFormContactoEmergenciaNombre] = useState('');
  const [formContactoEmergenciaTelefono, setFormContactoEmergenciaTelefono] = useState('');

  // Matrícula fields
  const [formCursoId, setFormCursoId] = useState('');
  const [formCursoNombre, setFormCursoNombre] = useState('');
  const [formSede, setFormSede] = useState('Sede Ica');
  const [formTurno, setFormTurno] = useState<'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO'>('MANANA');
  const [formFechaInicio, setFormFechaInicio] = useState('');
  const [formTotalCurso, setFormTotalCurso] = useState(800);
  const [formMontoPagado, setFormMontoPagado] = useState(150);
  const [formNumeroCuotas, setFormNumeroCuotas] = useState(2);
  const [formNotas, setFormNotas] = useState('');

  const ultimoPedidoIdRef = useRef<string | null>(null);

  // Se considera formalizado si ya se formalizó en este modal o si el pedido ya tiene el código oficial en sus notas
  const pedidoYaFormalizado = useMemo(() => {
    if (!pedido) return false;
    if (matriculaExitosaCodigo) return true;
    return Boolean(
      pedido.notas?.includes('[Matrícula formalizada:') && (matriculaExistente || pedido.es_alumno)
    );
  }, [pedido, matriculaExitosaCodigo, matriculaExistente]);

  // Sincronizar datos iniciales al abrir el modal o cambiar el pedido
  useEffect(() => {
    if (!pedido || !isOpen) {
      ultimoPedidoIdRef.current = null;
      return;
    }

    // Si ya inicializamos este modal para este mismo pedido, NO reiniciar pestañas ni recargar datos
    if (ultimoPedidoIdRef.current === pedido.id) {
      return;
    }
    ultimoPedidoIdRef.current = pedido.id;
    setModoEdicion(false);

    // Ajustar pestaña inicial
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab('DETALLE');
    }

    // Seleccionar plantilla WhatsApp inicial según estado o canal
    let plantillaPorDefecto: TipoPlantillaWhatsApp = 'RECIBIDO';
    if (pedido.estado === 'ENTREGADO') {
      plantillaPorDefecto = 'ENTREGADO';
    } else if (pedido.tipo_canal === 'ACADEMIA') {
      plantillaPorDefecto = 'ACADEMIA';
    } else if (pedido.estado === 'PENDIENTE') {
      plantillaPorDefecto = 'RECIBIDO';
    } else if (pedido.estado === 'PAGADO') {
      plantillaPorDefecto = 'LISTO';
    }

    setPlantillaSeleccionada(plantillaPorDefecto);

    // Cargar texto WhatsApp inicial
    const textoIni = generarMensajeWhatsApp(pedido, plantillaPorDefecto, {
      turno: waTurno,
      fechaInicio: waFechaInicio || undefined,
    });
    setMensajeEditable(textoIni);

    // Precargar datos para formulario de alumno
    const partesNombre = (pedido.cliente_nombre || '').trim().split(' ');
    let nombresPrefill = pedido.cliente_nombre || '';
    let apellidosPrefill = '';
    if (partesNombre.length >= 2) {
      nombresPrefill = partesNombre.slice(0, Math.ceil(partesNombre.length / 2)).join(' ');
      apellidosPrefill = partesNombre.slice(Math.ceil(partesNombre.length / 2)).join(' ');
    }

    const dniInicialLimpio = pedido.cliente_dni && !pedido.cliente_dni.startsWith('DNI-') ? pedido.cliente_dni : '';
    setFormDni(dniInicialLimpio);
    setFormNombres(nombresPrefill);
    setFormApellidos(apellidosPrefill);
    setFormCelular(pedido.cliente_telefono || '');
    setFormSede(pedido.sede_nombre || 'Sede Ica');
    setFormMontoPagado(pedido.total || 0);

    // Buscar si el pedido trae un ítem de curso
    const itemCurso = pedido.items.find(
      (it) =>
        it.es_matricula ||
        it.nombre_producto.toLowerCase().includes('matrícula') ||
        it.nombre_producto.toLowerCase().includes('matricula') ||
        it.nombre_producto.toLowerCase().includes('barber')
    );
    if (itemCurso) {
      setFormCursoNombre(itemCurso.nombre_producto);
      setFormCursoId(itemCurso.producto_id || 'curso-general');
      if (itemCurso.subtotal > 200) {
        setFormTotalCurso(itemCurso.subtotal);
      }
    } else {
      setFormCursoNombre('Carrera Integral de Barbería Profesional');
      setFormCursoId('carrera-integral');
    }

    // Fecha sugerida: próximo lunes o dentro de 5 días
    const sugerida = new Date();
    sugerida.setDate(sugerida.getDate() + ((1 + 7 - sugerida.getDay()) % 7 || 7));
    const fechaSugStr = sugerida.toISOString().split('T')[0];
    setFormFechaInicio(fechaSugStr);
    setWaFechaInicio(fechaSugStr);

    setMatriculaExitosaCodigo(null);

    // Cargar cursos y verificar si el alumno ya existe en Supabase
    const cargarDatosAcademia = async () => {
      setCargandoFicha(true);
      try {
        const [cursos, alumno] = await Promise.all([
          getCursosActivos(),
          buscarAlumnoExistente(pedido.cliente_dni, pedido.cliente_telefono),
        ]);

        setCursosDisponibles(cursos);
        if (alumno) {
          setAlumnoExistente(alumno);
          const dniLimpio = alumno.dni && !alumno.dni.startsWith('DNI-') ? alumno.dni : dniInicialLimpio;
          const apellidosLimpios = alumno.apellidos && alumno.apellidos !== 'Registrado Web' ? alumno.apellidos : apellidosPrefill;

          setFormDni(dniLimpio);
          setFormNombres(alumno.nombres || nombresPrefill);
          setFormApellidos(apellidosLimpios);
          setFormCelular(alumno.celular || pedido.cliente_telefono || '');
          setFormEmail(alumno.email || '');
          setFormDireccion(alumno.direccion || '');
          setFormDistrito(alumno.distrito || 'Ica Centro');
          setFormFechaNac(alumno.fecha_nacimiento || '');
          setFormContactoEmergenciaNombre(alumno.contacto_emergencia_nombre || '');
          setFormContactoEmergenciaTelefono(alumno.contacto_emergencia_telefono || '');

          // Buscar matrícula previa
          const matricula = await buscarMatriculaExistente(alumno.id);
          if (matricula) {
            setMatriculaExistente(matricula);
            if (matricula.turno) {
              setFormTurno(matricula.turno as 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO');
            }
            if (matricula.fecha_inicio) {
              setFormFechaInicio(matricula.fecha_inicio);
            }
          }
        } else {
          setAlumnoExistente(null);
          setMatriculaExistente(null);
        }
      } catch (err) {
        console.error('Error cargando datos de academia en modal:', err);
      } finally {
        setCargandoFicha(false);
      }
    };

    cargarDatosAcademia();
  }, [pedido, isOpen, initialTab]);

  // Al cambiar de plantilla en la pestaña WhatsApp, actualizar texto editable
  const handleCambiarPlantilla = (nueva: TipoPlantillaWhatsApp) => {
    if (!pedido) return;
    setPlantillaSeleccionada(nueva);
    const nuevoTexto = generarMensajeWhatsApp(pedido, nueva, {
      turno: waTurno,
      fechaInicio: waFechaInicio || undefined,
      codigoMatricula: matriculaExistente?.codigo_matricula || matriculaExitosaCodigo || undefined,
      cursoNombre: formCursoNombre || undefined,
    });
    setMensajeEditable(nuevoTexto);
  };

  // Restaurar plantilla original
  const handleRestaurarPlantilla = () => {
    if (!pedido) return;
    const nuevoTexto = generarMensajeWhatsApp(pedido, plantillaSeleccionada, {
      turno: waTurno,
      fechaInicio: waFechaInicio || undefined,
      codigoMatricula: matriculaExistente?.codigo_matricula || matriculaExitosaCodigo || undefined,
      cursoNombre: formCursoNombre || undefined,
    });
    setMensajeEditable(nuevoTexto);
  };

  if (!isOpen || !pedido) return null;

  // Acciones sobre el código del pedido
  const handleCopiarCodigo = () => {
    navigator.clipboard.writeText(pedido.codigo_pedido);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Copiar mensaje de WhatsApp
  const handleCopiarMensajeWA = () => {
    navigator.clipboard.writeText(mensajeEditable);
    setCopiadoMsg(true);
    setTimeout(() => setCopiadoMsg(false), 2000);
  };

  // Enviar WhatsApp (Abre la app o web de WhatsApp)
  const handleEnviarWhatsApp = () => {
    const rawPhone = pedido.cliente_telefono || formCelular || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const telefono = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;

    if (!cleanPhone || cleanPhone.length < 8) {
      alert('El cliente no tiene un número de celular válido registrado para WhatsApp.');
      return;
    }

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensajeEditable)}`;
    window.open(url, '_blank');
  };

  // Cambiar estado operativo del pedido
  const handleCambiarEstado = async (nuevoEstado: 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO') => {
    setActualizando(true);
    try {
      const res = await actualizarEstadoPedido(pedido.id, nuevoEstado);
      if (res.ok) {
        if (nuevoEstado === 'ENTREGADO') {
          setMensajeExito('✅ ¡Pedido marcado como Entregado! Se generó la constancia de entrega para WhatsApp.');
          // Auto cambiar a plantilla de WhatsApp ENTREGADO y sugerir enviar el mensaje
          setPlantillaSeleccionada('ENTREGADO');
          const textoEntregado = generarMensajeWhatsApp(pedido, 'ENTREGADO');
          setMensajeEditable(textoEntregado);
          setActiveTab('WHATSAPP');
        } else {
          setMensajeExito(`Estado cambiado a ${nuevoEstado}`);
        }
        setTimeout(() => setMensajeExito(null), 3500);
        onPedidoActualizado();
      } else {
        alert(res.error || 'Error al actualizar el estado.');
      }
    } finally {
      setActualizando(false);
    }
  };

  // Eliminar / Anular pedido
  const handleEliminar = async () => {
    if (
      !confirm(
        `¿Estás seguro de que deseas anular y eliminar el pedido ${pedido.codigo_pedido}? Esta acción no se puede revertir.`
      )
    ) {
      return;
    }
    setActualizando(true);
    try {
      const res = await eliminarPedido(pedido.id);
      if (res.ok) {
        onPedidoActualizado();
        onClose();
      } else {
        alert(res.error || 'No se pudo eliminar el pedido.');
      }
    } finally {
      setActualizando(false);
    }
  };

  // Formalizar Matrícula Oficial en la Academia
  const handleFormalizarMatricula = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDni.trim() || formDni.trim().length < 8) {
      alert('Por favor, ingresa un DNI válido de 8 dígitos para formalizar la matrícula.');
      return;
    }

    if (!formNombres.trim() || !formApellidos.trim()) {
      alert('Por favor, completa los nombres y apellidos del alumno.');
      return;
    }

    if (!formCelular.trim() || formCelular.trim().length < 9) {
      alert('Por favor, ingresa un número de celular de contacto válido.');
      return;
    }

    setGuardandoMatricula(true);
    try {
      const input: FormalizarMatriculaInput = {
        pedidoId: pedido.id,
        dni: formDni.trim(),
        nombres: formNombres.trim(),
        apellidos: formApellidos.trim(),
        celular: formCelular.trim(),
        fecha_nacimiento: formFechaNac || undefined,
        email: formEmail.trim() || undefined,
        direccion: formDireccion.trim() || undefined,
        distrito: formDistrito.trim() || 'Ica Centro',
        contacto_emergencia_nombre: formContactoEmergenciaNombre.trim() || undefined,
        contacto_emergencia_telefono: formContactoEmergenciaTelefono.trim() || undefined,
        curso_id: formCursoId || 'curso-general',
        curso_nombre: formCursoNombre || 'Carrera Integral de Barbería',
        sede: formSede,
        turno: formTurno,
        fecha_inicio: formFechaInicio || undefined,
        monto_matricula_pagado: Number(formMontoPagado) || 0,
        total_curso: Number(formTotalCurso) || 800,
        numero_cuotas: Number(formNumeroCuotas) || 0,
        monto_por_cuota:
          formNumeroCuotas > 0
            ? Math.max(0, Math.round((Number(formTotalCurso) - Number(formMontoPagado)) / Number(formNumeroCuotas)))
            : 0,
        metodo_pago: pedido.metodo_pago || 'EFECTIVO',
        notas: formNotas || `Formalizado desde Pedido Web ${pedido.codigo_pedido}`,
      };

      const res = await formalizarMatriculaDesdePedido(input);

      if (res.ok && res.codigoMatricula) {
        setMatriculaExitosaCodigo(res.codigoMatricula);
        setMensajeExito(`🎉 ¡Matrícula ${res.codigoMatricula} formalizada con éxito!`);

        // Actualizar plantilla de WhatsApp con los datos de matrícula
        setPlantillaSeleccionada('ACADEMIA');
        setWaTurno(
          formTurno === 'MANANA'
            ? 'Mañana (9:00 AM - 12:00 PM)'
            : formTurno === 'TARDE'
            ? 'Tarde (3:00 PM - 6:00 PM)'
            : 'Sábados (9:00 AM - 2:00 PM)'
        );
        setWaFechaInicio(formFechaInicio);

        const nuevoMsgWA = generarMensajeWhatsApp(pedido, 'ACADEMIA', {
          codigoMatricula: res.codigoMatricula,
          cursoNombre: formCursoNombre,
          turno:
            formTurno === 'MANANA'
              ? 'Mañana (9:00 AM - 12:00 PM)'
              : formTurno === 'TARDE'
              ? 'Tarde (3:00 PM - 6:00 PM)'
              : 'Sábados (9:00 AM - 2:00 PM)',
          fechaInicio: formFechaInicio,
        });
        setMensajeEditable(nuevoMsgWA);

        setTimeout(() => setMensajeExito(null), 4000);
        onPedidoActualizado();
      } else {
        alert(res.error || 'Ocurrió un error al registrar la matrícula.');
      }
    } catch (err: any) {
      console.error('Error al formalizar matrícula:', err);
      alert(err.message || 'Error inesperado al formalizar matrícula.');
    } finally {
      setGuardandoMatricula(false);
    }
  };

  // Canal y estilos
  const canalConfig = {
    ACADEMIA: {
      label: 'Matrícula Academia',
      icon: GraduationCap,
      color: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    WEB_TIENDA: {
      label: 'Tienda Web Supply',
      icon: ShoppingBag,
      color: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    POS_MOSTRADOR: {
      label: 'Venta Mostrador POS',
      icon: Store,
      color: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    },
  }[pedido.tipo_canal];

  const CanalIcon = canalConfig.icon;

  const estadoBadge = {
    PENDIENTE: 'bg-amber-50 text-amber-800 border-amber-300',
    PAGADO: 'bg-blue-50 text-blue-800 border-blue-300',
    ENTREGADO: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    CANCELADO: 'bg-rose-50 text-rose-800 border-rose-300',
  }[pedido.estado];

  // Cálculo de saldo restante en el formulario
  const saldoRestanteCalculado = Math.max(0, Number(formTotalCurso) - Number(formMontoPagado));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh] z-10"
      >
        {/* CABECERA */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/90 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-black tracking-tight text-zinc-950">
                {pedido.codigo_pedido}
              </span>
              <button
                type="button"
                onClick={handleCopiarCodigo}
                className="p-1 rounded text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Copiar código"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Badge de Canal */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${canalConfig.color}`}>
                <CanalIcon className="w-3 h-3" />
                <span>{canalConfig.label}</span>
              </span>

              {/* Badge de Estado */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${estadoBadge}`}>
                {pedido.estado}
              </span>
            </div>

            <p className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {new Date(pedido.creado_en).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{pedido.sede_nombre}</span>
              <span>•</span>
              <span className="font-bold text-zinc-900">{pedido.cliente_nombre}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS (TABS) */}
        <div className="flex border-b border-zinc-200 bg-white px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto text-xs font-bold pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('DETALLE')}
            className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'DETALLE'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-500 hover:text-black'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Detalle del Pedido</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WHATSAPP')}
            className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'WHATSAPP'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-zinc-500 hover:text-emerald-600'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Centro WhatsApp</span>
            {pedido.estado === 'ENTREGADO' && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px]">
                Listo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACADEMIA')}
            className={`pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'ACADEMIA'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-zinc-500 hover:text-amber-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
            <span>Ficha Alumno & Matrícula</span>
            {pedidoYaFormalizado ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                Oficial
              </span>
            ) : pedido.tipo_canal === 'ACADEMIA' ? (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] animate-pulse">
                Inscribir
              </span>
            ) : null}
          </button>
        </div>

        {/* ALERTA DE ÉXITO TEMPORAL */}
        <AnimatePresence>
          {mensajeExito && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2 shadow-inner"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mensajeExito}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CUERPO PRINCIPAL CONMUTABLE SEGÚN PESTAÑA */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-5">
          
          {/* ========================================================================= */}
          {/* PESTAÑA 1: DETALLE GENERAL DEL PEDIDO */}
          {/* ========================================================================= */}
          {activeTab === 'DETALLE' && (
            <div className="space-y-5">
              {/* 1. DATOS DEL CLIENTE Y CONTACTO */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Datos del Comprador / Alumno
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('WHATSAPP')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Abrir Centro WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-medium">Nombre Completo:</span>
                    <span className="text-xs font-bold text-zinc-950 block mt-0.5">
                      {pedido.cliente_nombre}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block font-medium">Teléfono / Celular:</span>
                    <span className="text-xs font-bold text-zinc-950 block mt-0.5 font-mono">
                      {pedido.cliente_telefono || 'No registrado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block font-medium">DNI / Documento:</span>
                    <span className="text-xs font-bold text-zinc-950 block mt-0.5 font-mono">
                      {pedido.cliente_dni || (alumnoExistente ? alumnoExistente.dni : 'No proporcionado')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Sede: <strong className="text-zinc-900">{pedido.sede_nombre}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <span>Modalidad: <strong className="text-zinc-900">{pedido.metodo_entrega === 'DELIVERY_ICA' ? 'Envío a Domicilio' : 'Recojo en Sede'}</strong></span>
                  </div>
                </div>
              </div>

              {/* BANNER INFORMATIVO PARA PEDIDOS DE ACADEMIA */}
              {pedido.tipo_canal === 'ACADEMIA' && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">Pre-Inscripción de Curso en Academia</h4>
                      <p className="text-[11px] text-amber-800">
                        {pedidoYaFormalizado
                          ? 'Este alumno ya cuenta con matrícula oficial formalizada en el sistema.'
                          : 'Falta completar datos del alumno (DNI, apellidos, emergencia) para formalizar la matrícula.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACADEMIA')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{pedidoYaFormalizado ? 'Ver Ficha de Matrícula' : 'Rellenar Datos & Inscribir'}</span>
                  </button>
                </div>
              )}

              {/* 2. ÍTEMS DEL PEDIDO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Ítems y Conceptos Adquiridos ({pedido.items.length})
                  </span>
                </div>

                {pedido.items.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-center text-zinc-400 text-xs">
                    No hay ítems registrados en la base de datos para este pedido.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-200">
                    {pedido.items.map((item, idx) => {
                      const esCurso = item.es_matricula || item.nombre_producto.toLowerCase().includes('matrícula');
                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3.5 flex items-center justify-between gap-3 ${
                            esCurso ? 'bg-amber-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                esCurso ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {esCurso ? <GraduationCap className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-zinc-900 text-xs truncate">
                                {item.nombre_producto}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                                <span>Cant: {item.cantidad}</span>
                                <span>•</span>
                                <span>Unit: {formatCurrency(item.precio_unitario)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black font-mono text-zinc-950 block">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. RESUMEN FINANCIERO Y FORMA DE PAGO */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Liquidación y Método de Pago
                </span>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(pedido.subtotal)}</span>
                  </div>
                  {pedido.descuento ? (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Descuento Aplicado</span>
                      <span className="font-mono">-{formatCurrency(pedido.descuento)}</span>
                    </div>
                  ) : null}
                  <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-black text-zinc-950">
                    <span>Total Cobrado / Por Cobrar</span>
                    <span className="font-mono text-base">{formatCurrency(pedido.total)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-medium">Método de Pago:</span>
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md bg-zinc-200 text-zinc-900 font-bold text-xs">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{pedido.metodo_pago}</span>
                    </span>
                  </div>

                  {pedido.notas && (
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-medium">Notas de la Orden:</span>
                      <p className="text-[11px] text-zinc-700 bg-white p-2.5 rounded-xl border border-zinc-200 mt-1 leading-relaxed whitespace-pre-wrap font-mono">
                        {pedido.notas}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. CAMBIO RÁPIDO DE ESTADO OPERATIVO */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Actualizar Estado Operativo del Pedido
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Al marcar como <strong>Entregado</strong>, se generará la constancia para WhatsApp
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={actualizando || pedido.estado === 'PENDIENTE'}
                    onClick={() => handleCambiarEstado('PENDIENTE')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      pedido.estado === 'PENDIENTE'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    Pendiente
                  </button>

                  <button
                    type="button"
                    disabled={actualizando || pedido.estado === 'PAGADO'}
                    onClick={() => handleCambiarEstado('PAGADO')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      pedido.estado === 'PAGADO'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    Pagado
                  </button>

                  {pedido.tipo_canal === 'ACADEMIA' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('ACADEMIA')}
                      className="py-2 px-3 rounded-xl font-bold text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      title="Ir a la ficha de matrícula del alumno"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                      <span>{pedidoYaFormalizado ? 'Matriculado' : 'Inscribir'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actualizando || pedido.estado === 'ENTREGADO'}
                      onClick={() => handleCambiarEstado('ENTREGADO')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        pedido.estado === 'ENTREGADO'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Entregado</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actualizando || pedido.estado === 'CANCELADO'}
                    onClick={() => handleCambiarEstado('CANCELADO')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      pedido.estado === 'CANCELADO'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    Anulado
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PESTAÑA 2: CENTRO DE WHATSAPP DINÁMICO & CONTEXTUAL */}
          {/* ========================================================================= */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-4">
              {/* SELECTOR DE PLANTILLAS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Selecciona la Plantilla de Notificación
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    El mensaje se adapta con los productos, precios y datos reales del pedido
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Plantilla 1: ENTREGADO */}
                  <button
                    type="button"
                    onClick={() => handleCambiarPlantilla('ENTREGADO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      plantillaSeleccionada === 'ENTREGADO'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Constancia Entrega</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      Detalle de productos, total pagado y agradecimiento
                    </p>
                    {pedido.estado === 'ENTREGADO' && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase">
                        Sugerido
                      </span>
                    )}
                  </button>

                  {/* Plantilla 2: RECIBIDO */}
                  <button
                    type="button"
                    onClick={() => handleCambiarPlantilla('RECIBIDO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      plantillaSeleccionada === 'RECIBIDO'
                        ? 'bg-blue-50 border-blue-400 text-blue-950 ring-2 ring-blue-400/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Pedido Recibido</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      Confirmación y preparación en almacén
                    </p>
                    {pedido.estado === 'PENDIENTE' && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase">
                        Sugerido
                      </span>
                    )}
                  </button>

                  {/* Plantilla 3: LISTO */}
                  <button
                    type="button"
                    onClick={() => handleCambiarPlantilla('LISTO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      plantillaSeleccionada === 'LISTO'
                        ? 'bg-zinc-100 border-zinc-400 text-zinc-950 ring-2 ring-zinc-400/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Store className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
                      <span>Listo para Recojo</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      Dirección de sede, horarios e indicación
                    </p>
                  </button>

                  {/* Plantilla 4: ACADEMIA */}
                  <button
                    type="button"
                    onClick={() => handleCambiarPlantilla('ACADEMIA')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      plantillaSeleccionada === 'ACADEMIA'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Matrícula Academia</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      Bienvenida, curso, turno, kit e inicio
                    </p>
                    {pedido.tipo_canal === 'ACADEMIA' && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[8px] font-black uppercase">
                        Sugerido
                      </span>
                    )}
                  </button>

                  {/* Plantilla 5: COMPROBANTE */}
                  <button
                    type="button"
                    onClick={() => handleCambiarPlantilla('COMPROBANTE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 relative ${
                      plantillaSeleccionada === 'COMPROBANTE'
                        ? 'bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-400/20'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Pedir Comprobante</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                      Cuentas Yape, BCP y solicitud de voucher
                    </p>
                  </button>
                </div>
              </div>

              {/* OPCIONES DE PERSONALIZACIÓN PARA ACADEMIA */}
              {plantillaSeleccionada === 'ACADEMIA' && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-amber-900 block mb-1">
                      Turno a indicar en el mensaje:
                    </label>
                    <select
                      value={waTurno}
                      onChange={(e) => {
                        setWaTurno(e.target.value);
                        const txt = generarMensajeWhatsApp(pedido, 'ACADEMIA', {
                          turno: e.target.value,
                          fechaInicio: waFechaInicio || undefined,
                          codigoMatricula: matriculaExistente?.codigo_matricula || matriculaExitosaCodigo || undefined,
                          cursoNombre: formCursoNombre,
                        });
                        setMensajeEditable(txt);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-zinc-800"
                    >
                      <option value="Mañana (9:00 AM - 12:00 PM)">Mañana (9:00 AM - 12:00 PM)</option>
                      <option value="Tarde (3:00 PM - 6:00 PM)">Tarde (3:00 PM - 6:00 PM)</option>
                      <option value="Sábados Intensivo (9:00 AM - 2:00 PM)">Sábados Intensivo (9:00 AM - 2:00 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-amber-900 block mb-1">
                      Fecha estimada de inicio:
                    </label>
                    <input
                      type="date"
                      value={waFechaInicio}
                      onChange={(e) => {
                        setWaFechaInicio(e.target.value);
                        const txt = generarMensajeWhatsApp(pedido, 'ACADEMIA', {
                          turno: waTurno,
                          fechaInicio: e.target.value,
                          codigoMatricula: matriculaExistente?.codigo_matricula || matriculaExitosaCodigo || undefined,
                          cursoNombre: formCursoNombre,
                        });
                        setMensajeEditable(txt);
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-zinc-800"
                    />
                  </div>
                </div>
              )}

              {/* EDITOR DE MENSAJE EN VIVO */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Vista Previa y Edición Directa del Texto
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 text-[9px] font-mono">
                      {mensajeEditable.length} caracteres
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRestaurarPlantilla}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-black font-semibold cursor-pointer"
                    title="Restaurar texto original"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar</span>
                  </button>
                </div>

                <textarea
                  rows={9}
                  value={mensajeEditable}
                  onChange={(e) => setMensajeEditable(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-mono text-xs focus:bg-white focus:border-zinc-400 focus:ring-2 focus:ring-black/5 outline-none leading-relaxed transition-all resize-none shadow-2xs"
                  placeholder="Escribe o edita el mensaje que se enviará al WhatsApp del cliente..."
                />
              </div>

              {/* BOTONES DE ACCIÓN PARA WHATSAPP */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 font-medium">Destinatario:</span>
                  <span className="font-mono font-bold text-zinc-950 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                    {pedido.cliente_telefono || 'Sin número registrado'}
                  </span>
                  <span className="text-zinc-400">({pedido.cliente_nombre})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopiarMensajeWA}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-zinc-800 hover:text-black border border-zinc-200 hover:border-zinc-300 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {copiadoMsg ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleEnviarWhatsApp}
                    disabled={!pedido.cliente_telefono}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar a WhatsApp Oficial</span>
                    <ExternalLink className="w-3 h-3 text-emerald-200" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PESTAÑA 3: FICHA DE ALUMNO & FORMALIZACIÓN DE MATRÍCULA */}
          {/* ========================================================================= */}
          {activeTab === 'ACADEMIA' && (
            <div className="space-y-4">
              {cargandoFicha ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-zinc-600">Verificando historial en la academia...</p>
                </div>
              ) : pedidoYaFormalizado && !modoEdicion ? (
                /* CASO A: ALUMNO YA MATRICULADO OFICIALMENTE */
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <h4 className="font-bold text-sm text-emerald-950">
                          Alumno Matriculado Oficialmente en Galindo Academy
                        </h4>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Este alumno cuenta con expediente académico activo y matrícula formalizada.
                      </p>
                    </div>

                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-2xs">
                      {matriculaExitosaCodigo || matriculaExistente?.codigo_matricula}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-zinc-400 block uppercase font-bold">Alumno Registrado</span>
                      <span className="font-bold text-zinc-900 block mt-0.5">
                        {formNombres} {formApellidos}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
                        DNI: {formDni || 'No indicado'} • Cel: {formCelular}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-zinc-400 block uppercase font-bold">Curso & Sede</span>
                      <span className="font-bold text-zinc-900 block mt-0.5">
                        {formCursoNombre}
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        {formSede} • {formTurno}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('WHATSAPP')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Enviar Bienvenida por WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModoEdicion(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Editar / Completar Datos</span>
                      </button>
                    </div>

                    <a
                      href={`/admin/matriculas?busqueda=${formDni || pedido.cliente_dni}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ver en Gestión de Matrículas</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </a>
                  </div>
                </div>
              ) : (
                /* CASO B: FORMULARIO PARA COMPLETAR DATOS Y FORMALIZAR MATRÍCULA */
                <form onSubmit={handleFormalizarMatricula} className="space-y-4">
                  {modoEdicion ? (
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-xs text-blue-900 font-bold">
                          Modificando expediente y datos del alumno
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoEdicion(false)}
                        className="px-3 py-1 rounded-lg bg-white border border-blue-300 text-blue-900 text-xs font-bold hover:bg-blue-50 cursor-pointer shadow-2xs"
                      >
                        ← Volver a Ver Expediente
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 shadow-2xs">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 space-y-0.5">
                        <strong className="font-bold">Pre-Inscripción de Alumno (Pendiente de Formalizar):</strong>
                        <p>
                          Verifica el voucher o abono del cliente y completa los datos faltantes del alumno (DNI de 8 dígitos, apellidos completos, contacto de emergencia y confirmación de turno) antes de formalizar la matrícula oficial en la academia.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* BLOQUE 1: DATOS PERSONALES */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      1. Ficha de Identidad del Alumno
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          DNI del Alumno <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={formDni}
                          onChange={(e) => setFormDni(e.target.value.replace(/\D/g, ''))}
                          placeholder="8 dígitos"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-mono font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Nombres <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formNombres}
                          onChange={(e) => setFormNombres(e.target.value)}
                          placeholder="Nombres del alumno"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Apellidos <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formApellidos}
                          onChange={(e) => setFormApellidos(e.target.value)}
                          placeholder="Apellidos del alumno"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Celular WhatsApp <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formCelular}
                          onChange={(e) => setFormCelular(e.target.value.replace(/\D/g, ''))}
                          placeholder="9 dígitos"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-mono font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Fecha de Nacimiento
                        </label>
                        <input
                          type="date"
                          value={formFechaNac}
                          onChange={(e) => setFormFechaNac(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Distrito / Ciudad
                        </label>
                        <input
                          type="text"
                          value={formDistrito}
                          onChange={(e) => setFormDistrito(e.target.value)}
                          placeholder="Ej: Ica Centro, Parcona"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:border-black outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/70">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Contacto de Emergencia (Nombre / Parentesco)
                        </label>
                        <input
                          type="text"
                          value={formContactoEmergenciaNombre}
                          onChange={(e) => setFormContactoEmergenciaNombre(e.target.value)}
                          placeholder="Ej: María López (Madre)"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Teléfono de Emergencia
                        </label>
                        <input
                          type="text"
                          value={formContactoEmergenciaTelefono}
                          onChange={(e) => setFormContactoEmergenciaTelefono(e.target.value.replace(/\D/g, ''))}
                          placeholder="Teléfono del contacto"
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-mono focus:border-black outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 2: DATOS DEL CURSO Y HORARIO */}
                  <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      2. Asignación Académica & Plan de Pagos
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Curso / Programa Seleccionado <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formCursoId}
                          onChange={(e) => {
                            setFormCursoId(e.target.value);
                            const encontrado = cursosDisponibles.find((c) => c.id === e.target.value);
                            if (encontrado) {
                              setFormCursoNombre(encontrado.titulo);
                              if (encontrado.costo_total_contado) {
                                setFormTotalCurso(encontrado.costo_total_contado);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 focus:border-black outline-none"
                        >
                          <option value="curso-general">{formCursoNombre || 'Carrera Integral de Barbería'}</option>
                          {cursosDisponibles.map((curso) => (
                            <option key={curso.id} value={curso.id}>
                              {curso.titulo} {curso.costo_total_contado ? `— S/ ${curso.costo_total_contado}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Sede de Estudio <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formSede}
                          onChange={(e) => setFormSede(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 focus:border-black outline-none"
                        >
                          <option value="Sede Ica">Sede Ica (Calle Bolívar 536)</option>
                          <option value="Sede Huancayo">Sede Huancayo (Jr. Guido 654)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Turno Oficial <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formTurno}
                          onChange={(e) => setFormTurno(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 focus:border-black outline-none"
                        >
                          <option value="MANANA">Mañana (9:00 AM — 12:00 PM)</option>
                          <option value="TARDE">Tarde (3:00 PM — 6:00 PM)</option>
                          <option value="SABATINO">Sábados Intensivo (9:00 AM — 2:00 PM)</option>
                          <option value="NOCHE">Noche Especial (7:00 PM — 10:00 PM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Fecha de Inicio de Clases
                        </label>
                        <input
                          type="date"
                          value={formFechaInicio}
                          onChange={(e) => setFormFechaInicio(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Total Costo del Curso (S/)
                        </label>
                        <input
                          type="number"
                          value={formTotalCurso}
                          onChange={(e) => setFormTotalCurso(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-mono font-bold focus:border-black outline-none"
                        />
                      </div>
                    </div>

                    {/* Balance Financiero de la Matrícula */}
                    <div className="pt-2 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Abono Cobrado en este Pedido (S/)
                        </label>
                        <input
                          type="number"
                          value={formMontoPagado}
                          onChange={(e) => setFormMontoPagado(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-mono font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Saldo Restante / Por Cobrar
                        </label>
                        <div className="px-3 py-2 rounded-xl bg-zinc-200 text-xs font-mono font-bold text-zinc-900">
                          {formatCurrency(saldoRestanteCalculado)}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                          Cuotas Mensuales para el Saldo
                        </label>
                        <select
                          value={formNumeroCuotas}
                          onChange={(e) => setFormNumeroCuotas(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 focus:border-black outline-none"
                        >
                          <option value={0}>0 (Pago total al contado)</option>
                          <option value={1}>1 Cuota (a los 30 días)</option>
                          <option value={2}>2 Cuotas mensuales</option>
                          <option value={3}>3 Cuotas mensuales</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN FORMALIZAR */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {modoEdicion && (
                      <button
                        type="button"
                        onClick={() => setModoEdicion(false)}
                        className="px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-700 cursor-pointer shadow-2xs"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={guardandoMatricula}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {guardandoMatricula ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Formalizando en Supabase...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>
                            {pedidoYaFormalizado
                              ? 'Guardar Cambios de Matrícula'
                              : 'Formalizar Matrícula Oficial en Academia'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* PIE DEL MODAL (ACCIONES GLOBALES) */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleEliminar}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Pedido</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`/ticket/${pedido.codigo_pedido}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-zinc-800 hover:text-black border border-zinc-200 hover:border-zinc-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Ver Ticket Oficial</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>

            {pedido.estado !== 'ENTREGADO' && (
              <button
                type="button"
                onClick={() => handleCambiarEstado('ENTREGADO')}
                disabled={actualizando}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Marcar como Entregado</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
