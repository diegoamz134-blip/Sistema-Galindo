'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Check,
  X,
  Edit2,
  Trash2,
  Store,
  ShoppingBag,
  Package,
  Boxes,
  GraduationCap,
  BarChart3,
  Settings,
  LayoutDashboard,
  Search,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ModuloId,
  LISTA_MODULOS,
  TODOS_LOS_MODULOS,
  PerfilUsuarioSistema,
} from '@/lib/permisos';
import {
  listarUsuariosSistema,
  actualizarPerfilUsuario,
  crearNuevoUsuario,
  eliminarUsuarioSistema,
} from '@/lib/usuarios-service';
import { useAuth } from '@/context/AuthContext';

// Mapeo dinámico de iconos según ID de módulo
const ICONOS_MODULO: Record<ModuloId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  pos: Store,
  pedidos: ShoppingBag,
  productos: Package,
  inventario: Boxes,
  matriculas: GraduationCap,
  reportes: BarChart3,
  configuracion: Settings,
};

export function GestionUsuariosPanel() {
  const { user, userMeta, recargarPerfil, signOut } = useAuth();
  const [usuarios, setUsuarios] = useState<PerfilUsuarioSistema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState<'todas' | 'ica' | 'huancayo'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Estado del modal (crear / editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);

  // Campos del formulario
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSede, setFormSede] = useState<'ica' | 'huancayo' | 'todas'>('todas');
  const [formPermisos, setFormPermisos] = useState<ModuloId[]>(['pos', 'productos']);
  const [showPassword, setShowPassword] = useState(false);

  // Estados de proceso y feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState<PerfilUsuarioSistema | null>(null);

  // Cargar usuarios
  const cargarUsuarios = async () => {
    setIsLoading(true);
    try {
      const data = await listarUsuariosSistema();
      setUsuarios(data);
    } catch {
      setMensajeError('No se pudo cargar la lista de usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 5000);
  };

  const mostrarError = (msg: string) => {
    setMensajeError(msg);
    setTimeout(() => setMensajeError(null), 5000);
  };

  // Abrir modal para crear
  const handleNuevoUsuario = () => {
    setModoEdicion(false);
    setUsuarioEditandoId(null);
    setFormNombre('');
    setFormEmail('');
    setFormTelefono('');
    setFormPassword('');
    setFormSede('todas');
    setFormPermisos(['pos', 'productos']);
    setShowPassword(false);
    setModalError(null);
    setMensajeError(null);
    setModalOpen(true);
  };

  // Abrir modal para editar
  const handleEditarUsuario = (u: PerfilUsuarioSistema) => {
    setModoEdicion(true);
    setUsuarioEditandoId(u.id);
    setFormNombre(u.nombre_completo);
    setFormEmail(u.email);
    setFormTelefono(u.telefono || '');
    setFormPassword('');
    setFormSede(u.sede_asignada || 'todas');
    setFormPermisos(u.permisos || []);
    setShowPassword(false);
    setModalError(null);
    setMensajeError(null);
    setModalOpen(true);
  };

  // Toggle de un módulo individual en el formulario
  const toggleModuloPermiso = (modId: ModuloId) => {
    if (formPermisos.includes(modId)) {
      setFormPermisos(formPermisos.filter((id) => id !== modId));
    } else {
      setFormPermisos([...formPermisos, modId]);
    }
  };

  // Guardar (Crear o Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setModalError('Ingrese el nombre completo del colaborador');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setModalError('Ingrese un correo electrónico válido');
      return;
    }
    if (!modoEdicion && (!formPassword || formPassword.length < 6)) {
      setModalError('La contraseña inicial debe tener al menos 6 caracteres');
      return;
    }
    if (formPermisos.length === 0) {
      setModalError('Debe seleccionar al menos un módulo permitido');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      if (modoEdicion && usuarioEditandoId) {
        const usuarioActual = usuarios.find((u) => u.id === usuarioEditandoId);
        const esSuper = usuarioActual?.es_superadmin ?? false;

        const res = await actualizarPerfilUsuario(usuarioEditandoId, {
          nombre_completo: formNombre.trim(),
          email: formEmail.trim().toLowerCase(),
          telefono: formTelefono.trim(),
          sede_asignada: formSede,
          permisos: esSuper ? TODOS_LOS_MODULOS : formPermisos,
          es_superadmin: esSuper,
          rol: esSuper ? 'superadmin' : 'cajero',
          password: formPassword.trim().length >= 6 ? formPassword.trim() : undefined,
        });

        if (res.success) {
          setModalOpen(false);
          mostrarExito(`Permisos de "${formNombre}" actualizados con éxito.`);
          await cargarUsuarios();
          await recargarPerfil();
        } else {
          setModalError(res.error || 'Error al actualizar el usuario');
        }
      } else {
        const res = await crearNuevoUsuario({
          nombre_completo: formNombre.trim(),
          email: formEmail.trim().toLowerCase(),
          telefono: formTelefono.trim(),
          password: formPassword || 'Galindo2026*',
          sede_asignada: formSede,
          permisos: formPermisos,
          es_superadmin: false,
        });

        if (res.success) {
          if (res.usuario) {
            setUsuarios((prev) => [res.usuario!, ...prev.filter((u) => u.email !== res.usuario!.email)]);
          }
          setModalOpen(false);
          mostrarExito(`Usuario "${formNombre}" creado exitosamente.`);
          await cargarUsuarios();
        } else {
          setModalError(res.error || 'Error al registrar el usuario');
        }
      }
    } catch {
      setModalError('Ocurrió un error inesperado al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmar y eliminar
  const handleConfirmarEliminar = async () => {
    if (!usuarioEliminando) return;

    const emailTarget = usuarioEliminando.email.toLowerCase().trim();
    if (emailTarget === 'admin@galindobarber.pe' || emailTarget === 'admin@galindo.com') {
      mostrarError('No está permitido eliminar la cuenta de administrador principal activa');
      setUsuarioEliminando(null);
      return;
    }

    const currentEmail = (user?.email || '').toLowerCase().trim();
    const isSelf = emailTarget === currentEmail;

    setIsSubmitting(true);
    try {
      const res = await eliminarUsuarioSistema(usuarioEliminando.id, usuarioEliminando.email);
      if (res.success) {
        if (isSelf) {
          mostrarExito('Tu cuenta ha sido eliminada correctamente. Redirigiendo...');
          setUsuarioEliminando(null);
          setTimeout(async () => {
            await signOut();
          }, 1200);
          return;
        }

        setUsuarios((prev) =>
          prev.filter(
            (item) => item.id !== usuarioEliminando.id && item.email.toLowerCase().trim() !== emailTarget
          )
        );
        mostrarExito(`Usuario "${usuarioEliminando.nombre_completo}" eliminado correctamente.`);
      } else {
        mostrarError(res.error || 'No se pudo eliminar el usuario');
      }
    } catch {
      mostrarError('Ocurrió un error inesperado al eliminar el usuario');
    } finally {
      setIsSubmitting(false);
      setUsuarioEliminando(null);
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const coincideBusqueda =
        u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
        (u.telefono && u.telefono.includes(busqueda));

      const coincideSede =
        filtroSede === 'todas' ||
        u.sede_asignada === 'todas' ||
        u.sede_asignada === filtroSede;

      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && u.activo) ||
        (filtroEstado === 'inactivos' && !u.activo);

      return coincideBusqueda && coincideSede && coincideEstado;
    });
  }, [usuarios, busqueda, filtroSede, filtroEstado]);

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER DE GESTIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-zinc-950 tracking-tight">
              Usuarios y Permisos
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium">
              {usuarios.length} cuentas
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
            Gestiona el acceso de los colaboradores y configura los módulos que cada persona puede utilizar.
          </p>
        </div>

        <button
          onClick={handleNuevoUsuario}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* FEEDBACK TOASTS */}
      <AnimatePresence>
        {mensajeExito && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </motion.div>
        )}
        {mensajeError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensajeError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-200/70">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value as any)}
            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:border-zinc-900 cursor-pointer"
          >
            <option value="todas">Todas las Sedes</option>
            <option value="ica">Sede Ica</option>
            <option value="huancayo">Sede Huancayo</option>
          </select>
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:border-zinc-900 cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activos">Solo Cuentas Activas</option>
            <option value="inactivos">Solo Suspendidas</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE USUARIOS */}
      {isLoading ? (
        <div className="py-14 text-center text-zinc-400 flex flex-col items-center justify-center gap-2.5">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
          <p className="text-xs text-zinc-500 font-medium">Cargando usuarios...</p>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="py-14 text-center bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl p-6 space-y-2.5">
          <Users className="w-8 h-8 text-zinc-300 mx-auto" />
          <h3 className="text-xs font-semibold text-zinc-700">No se encontraron usuarios</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {busqueda ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no se han registrado colaboradores.'}
          </p>
          <button
            onClick={handleNuevoUsuario}
            className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer mt-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registrar colaborador
          </button>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Colaborador & Sede</th>
                  <th className="px-5 py-3">Módulos Autorizados</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {usuariosFiltrados.map((u) => {
                  const emailLower = u.email.toLowerCase().trim();
                  const currentEmailLower = (user?.email || '').toLowerCase().trim();
                  const isSelf = Boolean(currentEmailLower && emailLower === currentEmailLower);
                  const isRootAdmin = emailLower === 'admin@galindobarber.pe' || emailLower === 'admin@galindo.com';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-zinc-50/60 transition-colors ${
                        !u.activo ? 'bg-zinc-50/30 opacity-70' : ''
                      }`}
                    >
                      {/* Colaborador & Sede */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0 ${
                              u.es_superadmin
                                ? 'bg-zinc-900 text-zinc-100'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200/80'
                            }`}
                          >
                            {u.nombre_completo.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-zinc-900 text-xs sm:text-sm truncate">
                                {u.nombre_completo}
                              </p>
                              {u.es_superadmin && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[10px] font-medium tracking-tight shrink-0">
                                  Superadmin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>

                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                                <MapPin className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                {u.sede_asignada === 'ica'
                                  ? 'Sede Ica'
                                  : u.sede_asignada === 'huancayo'
                                  ? 'Sede Huancayo'
                                  : 'Todas las Sedes'}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${u.activo ? 'text-emerald-700' : 'text-zinc-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                {u.activo ? 'Activo' : 'Inactivo'}
                              </span>
                              {u.telefono && (
                                <span className="text-[10px] text-zinc-400 hidden sm:inline">
                                  • {u.telefono}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Módulos Permitidos */}
                      <td className="px-5 py-3.5">
                        {u.es_superadmin ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                            Acceso Total (Todos los módulos)
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {u.permisos && u.permisos.length > 0 ? (
                              u.permisos.map((modId) => {
                                const modInfo = LISTA_MODULOS.find((m) => m.id === modId);
                                if (!modInfo) return null;
                                const ModIcon = ICONOS_MODULO[modId] || Package;
                                return (
                                  <span
                                    key={modId}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80"
                                  >
                                    <ModIcon className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                                    {modInfo.nombreCorto}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-xs text-rose-500 font-medium">
                                Sin permisos asignados
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditarUsuario(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Editar permisos"
                          >
                            <Edit2 className="w-3 h-3 text-zinc-500" />
                            <span>Editar</span>
                          </button>

                          {isRootAdmin ? (
                            <span
                              className="px-2 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-100 rounded-md border border-zinc-200"
                              title="Cuenta administradora principal protegida por el sistema"
                            >
                              {isSelf ? 'Tu cuenta (Principal)' : 'Admin Principal'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUsuarioEliminando(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={isSelf ? 'Eliminar tu propia cuenta' : 'Eliminar usuario'}
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>{isSelf ? 'Eliminar (Mía)' : 'Eliminar'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR USUARIO (ESTILO CORPORATIVO LIMPIO) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden z-10 max-h-[92vh] flex flex-col font-sans"
            >
              {/* Header sobrio y profesional */}
              <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-zinc-950 tracking-tight">
                    {modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {modoEdicion
                      ? 'Actualiza los datos del usuario y sus módulos autorizados.'
                      : 'Ingresa las credenciales y define a qué secciones tendrá acceso.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="overflow-y-auto p-6 space-y-5 flex-1">
                {/* Alerta de Error */}
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Datos de Acceso */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Datos de acceso
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Nombre completo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formNombre}
                        onChange={(e) => setFormNombre(e.target.value)}
                        placeholder="Ej. Carlos Mendoza"
                        className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Correo electrónico <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        disabled={modoEdicion}
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="carlos@galindobarber.pe"
                        className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all disabled:bg-zinc-50 disabled:text-zinc-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        {modoEdicion ? 'Nueva contraseña (opcional)' : (
                          <>Contraseña <span className="text-rose-500">*</span></>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={!modoEdicion}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder={modoEdicion ? 'Sin cambios' : 'Mínimo 6 caracteres'}
                          className="w-full h-9 pl-3 pr-8 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formTelefono}
                        onChange={(e) => setFormTelefono(e.target.value)}
                        placeholder="914 614 424"
                        className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Sede Asignada */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Sede asignada
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200/70">
                    {[
                      { id: 'todas', label: 'Todas las Sedes' },
                      { id: 'ica', label: 'Sede Ica' },
                      { id: 'huancayo', label: 'Sede Huancayo' },
                    ].map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setFormSede(s.id as any)}
                        className={`py-1.5 px-2.5 rounded-lg text-xs transition-all text-center cursor-pointer ${
                          formSede === s.id
                            ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                            : 'text-zinc-600 hover:text-zinc-950 font-medium'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permisos de Módulos */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Módulos permitidos ({formPermisos.length} de {LISTA_MODULOS.length})
                    </label>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setFormPermisos(TODOS_LOS_MODULOS)}
                        className="text-zinc-600 hover:text-zinc-950 font-medium transition-colors cursor-pointer"
                      >
                        Marcar todos
                      </button>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => setFormPermisos(['pos', 'productos'])}
                        className="text-zinc-600 hover:text-zinc-950 font-medium transition-colors cursor-pointer"
                      >
                        Solo POS
                      </button>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => setFormPermisos([])}
                        className="text-zinc-400 hover:text-zinc-700 font-medium transition-colors cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Grid de Módulos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LISTA_MODULOS.map((mod) => {
                      const ModIcon = ICONOS_MODULO[mod.id] || Package;
                      const isChecked = formPermisos.includes(mod.id);

                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModuloPermiso(mod.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer select-none ${
                            isChecked
                              ? 'bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900 shadow-2xs'
                              : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                              isChecked
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            <ModIcon className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-zinc-900 truncate">
                                {mod.label}
                              </p>
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                  isChecked
                                    ? 'bg-zinc-900 border-zinc-900 text-white'
                                    : 'border-zinc-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug line-clamp-1">
                              {mod.descripcion}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{modoEdicion ? 'Guardar cambios' : 'Crear usuario'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (LIMPIO Y SOBRIO) */}
      <AnimatePresence>
        {usuarioEliminando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUsuarioEliminando(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 8 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-zinc-200 z-10 space-y-4 font-sans"
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-semibold text-zinc-950 tracking-tight">
                  {(user?.email || '').toLowerCase().trim() === usuarioEliminando.email.toLowerCase().trim()
                    ? '¿Eliminar tu propia cuenta?'
                    : '¿Eliminar colaborador?'}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar a{' '}
                  <span className="font-semibold text-zinc-900">{usuarioEliminando.nombre_completo}</span>?
                </p>
                <p className="text-[11px] text-zinc-400">
                  {(user?.email || '').toLowerCase().trim() === usuarioEliminando.email.toLowerCase().trim()
                    ? 'Se revocarán todos tus accesos y tu sesión se cerrará de inmediato.'
                    : 'Se revocarán todos sus accesos al sistema inmediatamente.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioEliminando(null)}
                  disabled={isSubmitting}
                  className="py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEliminar}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {(user?.email || '').toLowerCase().trim() === usuarioEliminando.email.toLowerCase().trim()
                      ? 'Sí, eliminar mi cuenta'
                      : 'Eliminar'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
