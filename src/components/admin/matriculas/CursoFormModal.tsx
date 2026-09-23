'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  GraduationCap,
  Sparkles,
  Plus,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  Clock,
  Package,
  Check,
  AlertCircle,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';
import { Curso, TurnoOption } from '@/types/database';
import { CursoInput, guardarCurso, DEFAULT_TURNOS } from '@/lib/academia-service';
import { formatCurrency } from '@/lib/utils';
import { comprimirFotoWeb } from '@/lib/image-utils';

interface CursoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  cursoAEditar?: Curso | null;
  onCursoGuardado: (curso: Curso) => void;
  onCursoEliminado?: (cursoId: string) => Promise<void> | void;
}

const TEMAS_SUGERIDOS = [
  'Fundamentos de barbería y ergonomía',
  'Manejo de máquinas y peines guía',
  'Técnicas de degradado Fade (Low, Mid, High)',
  'Técnica de tijera sobre peine y texturizado',
  'Afeitado clásico con toalla caliente y navaja',
  'Perfilado de barba y visagismo capilar',
  'Colorimetría: Decoloración global y platinados',
  'Diseños freestyle y líneas urbanas',
  'Bioseguridad, esterilización y servicio al cliente',
];

const IMAGENES_PRESET = [
  {
    label: 'Barbería Integral',
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Fade Avanzado',
    url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Tijera y Clásicos',
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
  },
];

export function CursoFormModal({
  isOpen,
  onClose,
  cursoAEditar,
  onCursoGuardado,
  onCursoEliminado,
}: CursoFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imagenPesoKb, setImagenPesoKb] = useState<number | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [costoMatricula, setCostoMatricula] = useState('80');
  const [costoMensualidad, setCostoMensualidad] = useState('250');
  const [costoTotalContado, setCostoTotalContado] = useState('750');
  const [duracionSemanas, setDuracionSemanas] = useState('12');
  const [horasAcademicas, setHorasAcademicas] = useState('90');
  const [incluyeKit, setIncluyeKit] = useState(true);
  const [descripcionKit, setDescripcionKit] = useState(
    'Incluye capa profesional Galindo, peine de carbono, bieldo talquero y atomizador oficial.'
  );
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);

  // Lista interactiva de turnos y horarios de estudio
  const [turnos, setTurnos] = useState<TurnoOption[]>(DEFAULT_TURNOS);

  // Lista interactiva de materias / módulos del temario
  const [temario, setTemario] = useState<string[]>([]);
  const [nuevoTema, setNuevoTema] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cursoAEditar) {
      setTitulo(cursoAEditar.titulo || '');
      setDescripcionCorta(cursoAEditar.descripcion_corta || '');
      setCostoMatricula(String(cursoAEditar.costo_matricula || 80));
      setCostoMensualidad(String(cursoAEditar.costo_mensualidad || 250));
      setCostoTotalContado(String(cursoAEditar.costo_total_contado || 750));
      setDuracionSemanas(String(cursoAEditar.duracion_semanas || 12));
      setHorasAcademicas(String(cursoAEditar.horas_academicas || 90));
      setIncluyeKit(Boolean(cursoAEditar.incluye_kit));
      setDescripcionKit(cursoAEditar.descripcion_kit || '');
      setImagenUrl(cursoAEditar.imagen_url || '');
      setImagenPesoKb(null);
      setShowUrlInput(false);
      setActivo(cursoAEditar.activo !== false);

      // Cargar turnos u horarios configurados
      if (Array.isArray(cursoAEditar.turnos) && cursoAEditar.turnos.length > 0) {
        setTurnos(cursoAEditar.turnos);
      } else if (Array.isArray(cursoAEditar.beneficios) && cursoAEditar.beneficios.length > 0) {
        try {
          const parsed = cursoAEditar.beneficios.map((b: any) =>
            typeof b === 'string' ? JSON.parse(b) : b
          );
          setTurnos(parsed.length > 0 ? parsed : DEFAULT_TURNOS);
        } catch {
          setTurnos(DEFAULT_TURNOS);
        }
      } else {
        setTurnos(DEFAULT_TURNOS);
      }

      if (Array.isArray(cursoAEditar.temario_detallado)) {
        setTemario(cursoAEditar.temario_detallado);
      } else {
        setTemario([]);
      }
    } else {
      // Valores iniciales por defecto para un nuevo curso
      setTitulo('');
      setDescripcionCorta('');
      setCostoMatricula('80');
      setCostoMensualidad('250');
      setCostoTotalContado('750');
      setDuracionSemanas('12');
      setHorasAcademicas('90');
      setIncluyeKit(true);
      setDescripcionKit('Incluye capa profesional Galindo, peine de carbono, bieldo y atomizador.');
      setImagenUrl('');
      setImagenPesoKb(null);
      setShowUrlInput(false);
      setActivo(true);
      setTurnos(DEFAULT_TURNOS);
      setTemario([
        'Fundamentos de barbería y ergonomía',
        'Manejo de máquinas y peines guía',
        'Técnicas de degradado Fade (Low, Mid, High)',
        'Técnica de tijera sobre peine y texturizado',
        'Afeitado clásico con toalla caliente y navaja',
      ]);
    }
    setError(null);
  }, [cursoAEditar, isOpen]);

  if (!isOpen) return null;

  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP, HEIC).');
      return;
    }

    setIsCompressing(true);
    setError(null);
    try {
      const { dataUrl, sizeKb } = await comprimirFotoWeb(file, 1000, 0.84);
      setImagenUrl(dataUrl);
      setImagenPesoKb(sizeKb);
    } catch (err) {
      console.error('Error al comprimir foto:', err);
      setError('No se pudo optimizar la imagen seleccionada.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEliminarImagen = () => {
    setImagenUrl('');
    setImagenPesoKb(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateTurno = (index: number, campo: keyof TurnoOption, valor: any) => {
    const nuevos = [...turnos];
    nuevos[index] = {
      ...nuevos[index],
      [campo]: valor,
    };
    setTurnos(nuevos);
  };

  const handleRemoveTurno = (index: number) => {
    if (turnos.length <= 1) {
      setError('El curso debe tener al menos un turno u horario disponible.');
      return;
    }
    setTurnos(turnos.filter((_, i) => i !== index));
  };

  const handleAddTurnoPreset = (preset: {
    nombre: string;
    horario: string;
    dias: string;
    vacantes: number;
  }) => {
    const nuevo: TurnoOption = {
      id: `turno-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
      nombre: preset.nombre,
      horario: preset.horario,
      dias: preset.dias,
      vacantesDisponibles: preset.vacantes,
    };
    setTurnos([...turnos, nuevo]);
  };

  const handleAddTema = () => {
    if (!nuevoTema.trim()) return;
    if (!temario.includes(nuevoTema.trim())) {
      setTemario([...temario, nuevoTema.trim()]);
    }
    setNuevoTema('');
  };

  const handleAddSugerido = (tema: string) => {
    if (!temario.includes(tema)) {
      setTemario([...temario, tema]);
    }
  };

  const handleRemoveTema = (index: number) => {
    setTemario(temario.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) {
      setError('Por favor escribe el título del curso.');
      return;
    }

    if (!descripcionCorta.trim()) {
      setError('Por favor agrega una descripción corta para la portada.');
      return;
    }

    if (turnos.length === 0) {
      setError('Debes configurar al menos un turno u horario para el curso.');
      return;
    }

    if (temario.length === 0) {
      setError('Agrega al menos una materia o módulo en el temario.');
      return;
    }

    setGuardando(true);

    try {
      const payload: CursoInput = {
        id: cursoAEditar?.id,
        titulo: titulo.trim(),
        descripcion_corta: descripcionCorta.trim(),
        temario_detallado: temario,
        duracion_semanas: Number(duracionSemanas) || 8,
        horas_academicas: Number(horasAcademicas) || 60,
        costo_matricula: Number(costoMatricula) || 80,
        costo_mensualidad: Number(costoMensualidad) || 250,
        costo_total_contado: costoTotalContado ? Number(costoTotalContado) : undefined,
        incluye_kit: false,
        descripcion_kit: undefined,
        imagen_url: imagenUrl,
        activo,
        turnos,
      };

      const res = await guardarCurso(payload);

      if (!res.ok || !res.curso) {
        throw new Error(res.error || 'Error al guardar el curso');
      }

      onCursoGuardado(res.curso);
      onClose();
    } catch (err: any) {
      console.error('Error guardando curso:', err);
      setError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-zinc-200 z-10 space-y-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950 uppercase tracking-tight">
                {cursoAEditar ? 'Editar Programa Académico' : 'Crear Nuevo Curso & Materias'}
              </h3>
              <p className="text-xs text-zinc-500">
                Esta información se mostrará directamente en la Portada y en la página de Cursos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* 1. TÍTULO Y DESCRIPCIÓN DE PORTADA */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-zinc-900 block mb-1">
                Título del Curso / Programa *
              </label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Barbería Integral & Fade Profesional"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-zinc-950 font-bold text-sm focus:border-black outline-none bg-zinc-50/50"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-900 block mb-1">
                Descripción Corta (Aparece en la Portada Principal) *
              </label>
              <textarea
                required
                rows={2}
                value={descripcionCorta}
                onChange={(e) => setDescripcionCorta(e.target.value)}
                placeholder="Ej. Aprende desde cero todas las técnicas modernas de degradado, tijera y visagismo con modelos reales y certificación oficial."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-zinc-950 text-xs leading-relaxed focus:border-black outline-none bg-zinc-50/50 resize-none"
              />
            </div>
          </div>

          {/* 2. COSTOS Y FINANZAS */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
              Estructura Financiera & Precios
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Matrícula (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
                    S/
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={costoMatricula}
                    onChange={(e) => setCostoMatricula(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-bold bg-white focus:border-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Mensualidad (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
                    S/
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={costoMensualidad}
                    onChange={(e) => setCostoMensualidad(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-bold bg-white focus:border-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Total al Contado (S/)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
                    S/
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={costoTotalContado}
                    onChange={(e) => setCostoTotalContado(e.target.value)}
                    placeholder="750.00"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-bold bg-white focus:border-black outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. DURACIÓN Y HORAS ACADÉMICAS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-zinc-900 block mb-1">
                Duración (Semanas) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={duracionSemanas}
                onChange={(e) => setDuracionSemanas(e.target.value)}
                placeholder="12"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-semibold bg-zinc-50/50 focus:border-black outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-900 block mb-1">
                Horas Académicas *
              </label>
              <input
                type="number"
                min="1"
                required
                value={horasAcademicas}
                onChange={(e) => setHorasAcademicas(e.target.value)}
                placeholder="90"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-zinc-950 font-mono font-semibold bg-zinc-50/50 focus:border-black outline-none"
              />
            </div>
          </div>

          {/* 4. TURNOS, HORARIOS & VACANTES DISPONIBLES */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-900" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 block">
                  Turnos, Horarios & Vacantes ({turnos.length})
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
                Se muestran en &quot;Selecciona tu turno de estudio&quot; en la web
              </span>
            </div>

            {/* Tarjetas de Turnos Editables */}
            <div className="space-y-2.5">
              {turnos.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                        Nombre del Turno
                      </label>
                      <input
                        type="text"
                        value={t.nombre}
                        onChange={(e) => handleUpdateTurno(idx, 'nombre', e.target.value)}
                        placeholder="Ej. Turno Mañana"
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold text-zinc-950 bg-white focus:border-black outline-none"
                      />
                    </div>
                    <div className="w-28 sm:w-32">
                      <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                        Vacantes Libres
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={t.vacantesDisponibles}
                        onChange={(e) => handleUpdateTurno(idx, 'vacantesDisponibles', Number(e.target.value) || 0)}
                        placeholder="Vacantes"
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold font-mono text-zinc-950 bg-white focus:border-black outline-none text-center"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTurno(idx)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer self-end mb-0.5 shrink-0"
                      title="Eliminar este turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                        Horario de Clases
                      </label>
                      <input
                        type="text"
                        value={t.horario}
                        onChange={(e) => handleUpdateTurno(idx, 'horario', e.target.value)}
                        placeholder="Ej. 9:00 AM — 12:00 PM"
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-800 bg-zinc-50/50 focus:border-black outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-600 block mb-1">
                        Días de Clase (Frecuencia)
                      </label>
                      <input
                        type="text"
                        value={t.dias || ''}
                        onChange={(e) => handleUpdateTurno(idx, 'dias', e.target.value)}
                        placeholder="Ej. Lunes, Miércoles y Viernes"
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-800 bg-zinc-50/50 focus:border-black outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Presets Rápidos */}
            <div className="pt-1.5 space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-medium block">
                Añadir horarios rápidos con un clic:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleAddTurnoPreset({
                      nombre: 'Turno Mañana',
                      horario: '9:00 AM — 12:00 PM',
                      dias: 'Lunes, Miércoles y Viernes',
                      vacantes: 6,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:border-zinc-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Mañana (9:00 AM — 12:00 PM)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddTurnoPreset({
                      nombre: 'Turno Tarde',
                      horario: '3:00 PM — 6:00 PM',
                      dias: 'Lunes, Miércoles y Viernes',
                      vacantes: 6,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:border-zinc-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Tarde (3:00 PM — 6:00 PM)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddTurnoPreset({
                      nombre: 'Turno Noche',
                      horario: '6:30 PM — 9:30 PM',
                      dias: 'Lunes a Viernes',
                      vacantes: 4,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:border-zinc-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Noche (6:30 PM — 9:30 PM)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddTurnoPreset({
                      nombre: 'Sábados Intensivo',
                      horario: '9:00 AM — 2:00 PM',
                      dias: 'Todos los Sábados',
                      vacantes: 4,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:border-zinc-300 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Sábados Intensivo (9:00 AM — 2:00 PM)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddTurnoPreset({
                      nombre: 'Nuevo Turno',
                      horario: 'Horario a coordinar',
                      dias: 'Días a coordinar',
                      vacantes: 5,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black text-white hover:bg-zinc-800 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Turno Personalizado</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. TEMARIO DETALLADO / MATERIAS */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Materias & Módulos del Curso ({temario.length})
              </span>
              <span className="text-[10px] text-zinc-400">
                Se muestran como viñetas en la portada
              </span>
            </div>

            {/* Input para agregar materia */}
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoTema}
                onChange={(e) => setNuevoTema(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTema();
                  }
                }}
                placeholder="Escribe una materia (ej. Colorimetría capilar y platinados)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-950 text-xs focus:border-black outline-none"
              />
              <button
                type="button"
                onClick={handleAddTema}
                className="px-3.5 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {/* Sugerencias Rápidas de Barbería */}
            <div>
              <span className="text-[10px] font-semibold text-zinc-500 block mb-1.5">
                Sugerencias de materias frecuentes (clic para añadir):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMAS_SUGERIDOS.filter((s) => !temario.includes(s)).slice(0, 5).map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddSugerido(sug)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:border-black hover:text-black text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista actual de materias añadidas */}
            <div className="space-y-1.5 pt-1">
              {temario.map((tema, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-zinc-200 text-zinc-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs truncate font-medium">{tema}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTema(idx)}
                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar materia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. IMAGEN / BANNER DEL CURSO */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Imagen de Portada & Banner
              </span>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[10px] text-zinc-500 hover:text-black font-semibold underline cursor-pointer"
              >
                {showUrlInput ? 'Ocultar enlace web' : 'O pegar enlace web'}
              </button>
            </div>

            {/* Input de archivo de la galería oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSeleccionarArchivo}
              className="hidden"
            />

            {!imagenUrl ? (
              /* ESTADO VACÍO: CAJA DASHED PARA ELEGIR DE LA GALERÍA */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50/70 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group shadow-2xs"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-50 shadow-xs border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:scale-105 group-hover:text-black transition-all">
                  {isCompressing ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
                  ) : (
                    <UploadCloud className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">
                    {isCompressing ? 'Optimizando foto en alta definición...' : 'Seleccionar foto de la galería'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Compresión automática inteligente: nitidez HD en tienda y peso ultra liviano (&lt;100 KB)
                  </p>
                </div>
              </div>
            ) : (
              /* ESTADO CON FOTO: FOTO LISTA PARA CATÁLOGO */
              <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 shadow-xs">
                    <img
                      src={imagenUrl}
                      alt="Vista previa del curso"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-950">Foto lista para catálogo</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                        WebP HD
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {imagenPesoKb ? `Peso optimizado: ~${imagenPesoKb} KB • ` : 'Imagen comprimida • '}Carga instantánea
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-zinc-200 text-zinc-700 hover:text-black hover:border-zinc-300 shadow-xs transition-colors cursor-pointer"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={handleEliminarImagen}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Presets rápidos de muestra */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 font-medium">O usar foto de muestra:</span>
              {IMAGENES_PRESET.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setImagenUrl(p.url);
                    setImagenPesoKb(null);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${
                    imagenUrl === p.url
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input URL secundario si el usuario lo activa */}
            {showUrlInput && (
              <div className="pt-1">
                <input
                  type="url"
                  value={imagenUrl.startsWith('data:') ? '' : imagenUrl}
                  onChange={(e) => {
                    setImagenUrl(e.target.value);
                    setImagenPesoKb(null);
                  }}
                  placeholder="Pega un enlace web directo (https://...)"
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-950 text-xs focus:border-black outline-none"
                />
              </div>
            )}
          </div>

          {/* 7. VISIBILIDAD EN PORTADA */}
          <div className="p-3.5 rounded-xl border border-zinc-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-900 block text-xs">
                Visible en la Página Principal y Catálogo
              </span>
              <p className="text-[11px] text-zinc-500">
                Si desactivas esta opción, el curso quedará pausado sin mostrarse a los clientes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
            {cursoAEditar && onCursoEliminado ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el curso "${cursoAEditar.titulo}"?`)) {
                    onCursoEliminado(cursoAEditar.id);
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Curso</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando Curso...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{cursoAEditar ? 'Guardar Cambios' : 'Publicar Curso'}</span>
                </>
              )}
            </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
