'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  GraduationCap,
  Store,
  Layers,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MessageCircle,
  ExternalLink,
  Edit3,
  RotateCcw,
  CreditCard,
  X,
  Printer,
  FileText,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { DetallePedidoModal } from '@/components/admin/pedidos/DetallePedidoModal';
import { EditarPedidoModal } from '@/components/admin/pedidos/EditarPedidoModal';
import { AnularPedidoModal } from '@/components/admin/pedidos/AnularPedidoModal';
import {
  PedidoCompleto,
  EstadisticasPedidos,
  getPedidosAdmin,
  getEstadisticasPedidos,
  actualizarEstadoPedido,
  FiltrosPedidosAdmin,
} from '@/lib/pedidos-service';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useSede } from '@/context/SedeContext';
import { useAuth } from '@/context/AuthContext';

export default function AdminPedidosPage() {
  const { sedeActiva, sedeInfo } = useSede();
  const { user, userMeta } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Todos los pedidos de la sede activa (para conteos de tabs y filtrado instantáneo)
  const [todosPedidosSede, setTodosPedidosSede] = useState<PedidoCompleto[]>([]);

  // Pestaña principal de canales (Opción A): POS | WEB_TIENDA | ACADEMIA | TODOS
  const [canalActivo, setCanalActivo] = useState<'POS_MOSTRADOR' | 'WEB_TIENDA' | 'ACADEMIA' | 'TODOS'>('POS_MOSTRADOR');

  // Filtros secundarios
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'PAGADO' | 'ENTREGADO' | 'CANCELADO'>('TODOS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | 'HOY' | 'SEMANA'>('TODAS');

  // Modal de Detalle
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoCompleto | null>(null);
  const pedidoSeleccionadoIdRef = useRef<string | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<'DETALLE' | 'WHATSAPP' | 'ACADEMIA'>('DETALLE');

  // Modal de Edición
  const [pedidoParaEditar, setPedidoParaEditar] = useState<PedidoCompleto | null>(null);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  // Modal de Anulación
  const [pedidoParaAnular, setPedidoParaAnular] = useState<PedidoCompleto | null>(null);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);

  // Nombre del usuario actual para auditorías
  const nombreUsuario = userMeta?.nombre || user?.email?.split('@')[0] || 'Administrador Galindo';

  // Sede estricta
  const sedeFiltroTexto = sedeActiva === 'huancayo' ? 'Huancayo' : 'Ica';

  // Cargar datos desde Supabase
  const cargarDatos = useCallback(async () => {
    try {
      // Consultamos todos los pedidos de la sede activa
      const lista = await getPedidosAdmin({
        sede: sedeFiltroTexto,
        fecha: filtroFecha,
      });

      setTodosPedidosSede(lista);

      // Si hay un pedido abierto en el modal de detalle, actualizarlo en vivo
      const currentSelectedId = pedidoSeleccionadoIdRef.current;
      if (currentSelectedId) {
        const actualizado = lista.find((p) => p.id === currentSelectedId);
        if (actualizado) {
          setPedidoSeleccionado(actualizado);
        }
      }
    } catch (err) {
      console.error('Error al cargar pedidos y ventas:', err);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, [sedeFiltroTexto, filtroFecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Suscripción Realtime a cambios en pedidos
  useEffect(() => {
    const handleEventoLocal = () => cargarDatos();
    window.addEventListener('galindo_pedido_web_realizado', handleEventoLocal);
    window.addEventListener('galindo_sede_changed', handleEventoLocal);

    const channel = supabase
      .channel('admin_pedidos_pos_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      window.removeEventListener('galindo_pedido_web_realizado', handleEventoLocal);
      window.removeEventListener('galindo_sede_changed', handleEventoLocal);
      supabase.removeChannel(channel);
    };
  }, [cargarDatos]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Conteos exactos por cada canal para la sede activa
  const conteos = useMemo(() => {
    const pos = todosPedidosSede.filter((p) => p.tipo_canal === 'POS_MOSTRADOR').length;
    const web = todosPedidosSede.filter((p) => p.tipo_canal === 'WEB_TIENDA').length;
    const academia = todosPedidosSede.filter((p) => p.tipo_canal === 'ACADEMIA').length;
    const todos = todosPedidosSede.length;
    return { pos, web, academia, todos };
  }, [todosPedidosSede]);

  // Lista filtrada en memoria
  const pedidosFiltrados = useMemo(() => {
    let resultado = todosPedidosSede;

    // 1. Si hay búsqueda por texto, buscar en todos los canales de la sede
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (p) =>
          p.codigo_pedido.toLowerCase().includes(q) ||
          p.cliente_nombre.toLowerCase().includes(q) ||
          p.cliente_telefono.includes(q) ||
          (p.cliente_dni && p.cliente_dni.includes(q)) ||
          p.items.some((it) => it.nombre_producto.toLowerCase().includes(q)) ||
          (p.notas && p.notas.toLowerCase().includes(q))
      );
    } else {
      // Si no hay búsqueda de texto, filtrar por el canal activo
      if (canalActivo !== 'TODOS') {
        resultado = resultado.filter((p) => p.tipo_canal === canalActivo);
      }
    }

    // 2. Estado
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter((p) => p.estado === filtroEstado);
    }

    return resultado;
  }, [todosPedidosSede, canalActivo, filtroEstado, busqueda]);

  // Métricas de la vista actual
  const statsCalculadas = useMemo(() => {
    const universo = pedidosFiltrados;
    const totalPedidos = universo.length;
    const pendientes = universo.filter((p) => p.estado === 'PENDIENTE').length;
    const entregados = universo.filter((p) => p.estado === 'ENTREGADO').length;
    const anulados = universo.filter((p) => p.estado === 'CANCELADO').length;
    const totalFacturado = universo
      .filter((p) => p.estado !== 'CANCELADO')
      .reduce((acc, p) => acc + p.total, 0);

    return { totalPedidos, pendientes, entregados, anulados, totalFacturado };
  }, [pedidosFiltrados]);

  // Manejadores de Modales
  const handleOpenDetalle = (ped: PedidoCompleto, tab: 'DETALLE' | 'WHATSAPP' | 'ACADEMIA' = 'DETALLE') => {
    pedidoSeleccionadoIdRef.current = ped.id;
    setPedidoSeleccionado(ped);
    setInitialModalTab(tab);
    setModalDetalleOpen(true);
  };

  const handleOpenEditar = (e: React.MouseEvent, ped: PedidoCompleto) => {
    e.stopPropagation();
    setPedidoParaEditar(ped);
    setModalEditarOpen(true);
  };

  const handleOpenAnular = (e: React.MouseEvent, ped: PedidoCompleto) => {
    e.stopPropagation();
    setPedidoParaAnular(ped);
    setModalAnularOpen(true);
  };

  // Configuración de las Pestañas de Canal (Opción A)
  const TABS_CANAL = [
    {
      id: 'POS_MOSTRADOR',
      label: 'Ventas Mostrador (POS)',
      icon: Store,
      count: conteos.pos,
      desc: 'Cobros presenciales',
      activeClass: 'bg-zinc-950 text-white shadow-md border-zinc-950',
      badgeClass: 'bg-zinc-800 text-zinc-100',
    },
    {
      id: 'WEB_TIENDA',
      label: 'Pedidos Tienda Web',
      icon: ShoppingBag,
      count: conteos.web,
      desc: 'Compras online supply',
      activeClass: 'bg-blue-600 text-white shadow-md border-blue-600',
      badgeClass: 'bg-blue-800 text-blue-100',
    },
    {
      id: 'ACADEMIA',
      label: 'Academia & Matrículas',
      icon: GraduationCap,
      count: conteos.academia,
      desc: 'Inscripciones y cursos',
      activeClass: 'bg-amber-600 text-white shadow-md border-amber-600',
      badgeClass: 'bg-amber-800 text-amber-100',
    },
    {
      id: 'TODOS',
      label: 'Todas las Ventas',
      icon: Layers,
      count: conteos.todos,
      desc: 'Historial consolidado',
      activeClass: 'bg-black text-white shadow-md border-black',
      badgeClass: 'bg-zinc-800 text-zinc-100',
    },
  ] as const;

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'PAGADO':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'ENTREGADO':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'CANCELADO':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
  };

  const getCanalBadge = (canal: string) => {
    switch (canal) {
      case 'ACADEMIA':
        return {
          icon: GraduationCap,
          label: 'Academia',
          color: 'bg-amber-100 text-amber-900 border-amber-200',
        };
      case 'WEB_TIENDA':
        return {
          icon: ShoppingBag,
          label: 'Tienda Web',
          color: 'bg-blue-100 text-blue-900 border-blue-200',
        };
      case 'POS_MOSTRADOR':
        return {
          icon: Store,
          label: 'Mostrador POS',
          color: 'bg-zinc-100 text-zinc-900 border-zinc-300',
        };
      default:
        return {
          icon: ShoppingBag,
          label: 'Venta',
          color: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* CABECERA CON CONTEXTO DE SEDE ESTRICTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 uppercase tracking-tight">
              Gestión de Pedidos & Ventas
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
            <span>Control integral de ventas POS, tienda online y matrículas en tiempo real.</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-bold text-zinc-900">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              Sede Activa: {sedeInfo.nombre} ({sedeFiltroTexto})
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge informativo de Sede activa */}
          <div className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white shadow-2xs text-xs font-bold text-zinc-800 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                sedeActiva === 'ica' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
            <span>Filtrado Exclusivo: {sedeInfo.nombre}</span>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑAS PRINCIPALES DE CANAL (OPCIÓN A) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS_CANAL.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = canalActivo === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCanalActivo(tab.id as any)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? tab.activeClass
                  : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/70 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-black tracking-tight block">
                    {tab.label}
                  </span>
                </div>

                {/* Badge con el Conteo */}
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-xs font-black shrink-0 ${
                    isActive ? tab.badgeClass : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                  }`}
                >
                  {tab.count}
                </span>
              </div>

              <p
                className={`text-[11px] mt-2 ${
                  isActive ? 'text-white/80' : 'text-zinc-500'
                }`}
              >
                {tab.desc}
              </p>

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* KPIS DE LA VISTA SELECCIONADA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registros */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
            Ventas en esta Vista
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-zinc-950 font-mono">
              {statsCalculadas.totalPedidos}
            </span>
            <span className="text-[10px] text-zinc-500">
              {canalActivo === 'TODOS' ? 'Historial global' : 'Filtrado por canal'}
            </span>
          </div>
        </div>

        {/* Pendientes de Despacho */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-amber-700 block">
              Por Atender / Pendientes
            </span>
            {statsCalculadas.pendientes > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
              {statsCalculadas.pendientes}
            </span>
            <span className="text-[10px] font-bold text-amber-700">Por entregar</span>
          </div>
        </div>

        {/* Entregados */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
            Entregados Conformes
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              {statsCalculadas.entregados}
            </span>
            <span className="text-[10px] text-zinc-500">Despachos listos</span>
          </div>
        </div>

        {/* Facturación en esta Vista */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
            Importe Facturado
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-zinc-950 font-mono truncate">
              {formatCurrency(statsCalculadas.totalFacturado)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono pt-0.5">
            {statsCalculadas.anulados > 0 ? `(${statsCalculadas.anulados} anulados excluidos)` : 'Sin anulaciones'}
          </p>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por ticket (POS-...), cliente, DNI, teléfono o producto..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200 text-xs focus:border-black outline-none bg-zinc-50/50"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="p-1 text-zinc-400 hover:text-black absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Rango de Fecha */}
          <div className="flex items-center gap-2">
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white text-zinc-800 outline-none cursor-pointer"
            >
              <option value="TODAS">Historial Completo</option>
              <option value="HOY">Solo Hoy</option>
              <option value="SEMANA">Últimos 7 días</option>
            </select>
          </div>
        </div>

        {/* Pestañas de Estado Operativo */}
        <div className="flex border-t border-zinc-100 pt-3 overflow-x-auto gap-1 text-xs">
          {(
            [
              { id: 'TODOS', label: 'Todos los Estados' },
              { id: 'PENDIENTE', label: `Pendientes (${statsCalculadas.pendientes})` },
              { id: 'ENTREGADO', label: `Entregados (${statsCalculadas.entregados})` },
              { id: 'PAGADO', label: 'Pagados' },
              { id: 'CANCELADO', label: `Anulados (${statsCalculadas.anulados})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer ${
                filtroEstado === tab.id
                  ? 'bg-black text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE VENTAS Y PEDIDOS */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
        {cargando ? (
          <div className="py-20 text-center text-zinc-400">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-zinc-600">Cargando registros de {sedeInfo.nombre}...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto shadow-2xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">No se encontraron ventas ni pedidos</h3>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-sm mx-auto">
                {busqueda || filtroEstado !== 'TODOS'
                  ? 'Intenta ajustar los filtros de estado o el texto de búsqueda.'
                  : `No hay registros en la pestaña ${
                      TABS_CANAL.find((t) => t.id === canalActivo)?.label
                    } para la sede ${sedeInfo.nombre}.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticket / Canal</th>
                  <th className="py-3 px-4">Fecha & Sede</th>
                  <th className="py-3 px-4">Cliente / Contacto</th>
                  <th className="py-3 px-4">Ítems Adquiridos</th>
                  <th className="py-3 px-4 text-right">Total Cobrado</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70">
                {pedidosFiltrados.map((pedido) => {
                  const canalInfo = getCanalBadge(pedido.tipo_canal);
                  const CanalRowIcon = canalInfo.icon;
                  const esAnulado = pedido.estado === 'CANCELADO';

                  return (
                    <tr
                      key={pedido.id}
                      onClick={() => handleOpenDetalle(pedido)}
                      className={`hover:bg-zinc-50/80 transition-colors cursor-pointer group ${
                        esAnulado ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Código y Canal */}
                      <td className="py-3.5 px-4 font-mono">
                        <div
                          className={`font-bold group-hover:underline ${
                            esAnulado ? 'line-through text-rose-700' : 'text-zinc-950'
                          }`}
                        >
                          {pedido.codigo_pedido}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border mt-1 ${canalInfo.color}`}
                        >
                          <CanalRowIcon className="w-2.5 h-2.5" />
                          <span>{canalInfo.label}</span>
                        </span>
                      </td>

                      {/* Fecha y Sede */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-900 font-medium font-mono text-[11px]">
                          {new Date(pedido.creado_en).toLocaleString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{pedido.sede_nombre}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-950">{pedido.cliente_nombre}</div>
                        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{pedido.cliente_telefono || 'Sin teléfono'}</span>
                          {pedido.cliente_dni && <span>• DNI {pedido.cliente_dni}</span>}
                        </div>
                      </td>

                      {/* Resumen Ítems */}
                      <td className="py-3.5 px-4">
                        <div className="text-zinc-800 font-medium max-w-[220px] truncate">
                          {pedido.items.length > 0
                            ? pedido.items.map((i) => `${i.cantidad}x ${i.nombre_producto}`).join(', ')
                            : pedido.notas || 'Sin detalle de ítems'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {pedido.items.length} {pedido.items.length === 1 ? 'concepto' : 'conceptos'}
                        </div>
                      </td>

                      {/* Total & Método */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div
                          className={`font-black text-sm ${
                            esAnulado ? 'line-through text-rose-600' : 'text-zinc-950'
                          }`}
                        >
                          {formatCurrency(pedido.total)}
                        </div>
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                          {pedido.metodo_pago}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEstadoBadge(
                            pedido.estado
                          )}`}
                        >
                          {pedido.estado}
                        </span>
                      </td>

                      {/* Botones de Acción en Fila */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón: Ver Detalle */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetalle(pedido, 'DETALLE')}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Ver detalles completos del pedido"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Botón: Editar Venta */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditar(e, pedido)}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar datos del cliente, método de pago o notas"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Botón: Anular Venta */}
                          {esAnulado ? (
                            <span
                              className="p-1.5 rounded-lg text-rose-300 cursor-not-allowed opacity-50"
                              title="Esta venta ya fue anulada y su stock reingresado"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleOpenAnular(e, pedido)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Anular venta y reingresar stock al Kardex"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botón: Ver Ticket */}
                          <a
                            href={`/ticket/${pedido.codigo_pedido}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
                            title="Imprimir o ver ticket oficial"
                          >
                            <Printer className="w-4 h-4" />
                          </a>

                          {/* Botón: WhatsApp */}
                          {pedido.cliente_telefono && (
                            <button
                              type="button"
                              onClick={() => handleOpenDetalle(pedido, 'WHATSAPP')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Abrir centro de mensajes WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALES DEL MÓDULO */}
      {/* ========================================================================= */}

      {/* 1. Modal Detallado de Pedido */}
      <DetallePedidoModal
        pedido={pedidoSeleccionado}
        isOpen={modalDetalleOpen}
        initialTab={initialModalTab}
        onClose={() => {
          pedidoSeleccionadoIdRef.current = null;
          setModalDetalleOpen(false);
          setPedidoSeleccionado(null);
        }}
        onPedidoActualizado={cargarDatos}
        onEditarClick={(ped) => {
          setPedidoParaEditar(ped);
          setModalEditarOpen(true);
        }}
        onAnularClick={(ped) => {
          setPedidoParaAnular(ped);
          setModalAnularOpen(true);
        }}
      />

      {/* 2. Modal de Edición de Datos de Venta */}
      <EditarPedidoModal
        pedido={pedidoParaEditar}
        isOpen={modalEditarOpen}
        onClose={() => {
          setModalEditarOpen(false);
          setPedidoParaEditar(null);
        }}
        onPedidoEditado={cargarDatos}
      />

      {/* 3. Modal de Anulación Formal con Devolución a Kardex */}
      <AnularPedidoModal
        pedido={pedidoParaAnular}
        isOpen={modalAnularOpen}
        usuarioActual={nombreUsuario}
        onClose={() => {
          setModalAnularOpen(false);
          setPedidoParaAnular(null);
        }}
        onAnulacionExitosa={cargarDatos}
      />
    </div>
  );
}
