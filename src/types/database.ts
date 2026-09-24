// ==========================================
// TIPOS BASE DE DATOS Y MODELO DE NEGOCIO
// SISTEMA GALINDO - ESCUELA DE BARBERÍA & E-COMMERCE
// ==========================================

export type UserRole = 'superadmin' | 'admin' | 'cajero' | 'docente' | 'alumno';

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  telefono?: string;
  rol: UserRole;
  avatar_url?: string;
  creado_en: string;
  activo: boolean;
}

// ------------------------------------------
// MÓDULO E-COMMERCE E INVENTARIO
// ------------------------------------------

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  sku: string; // Código único / barra
  nombre: string;
  slug: string;
  categoria_id: string;
  categoria?: Categoria;
  descripcion: string;
  especificaciones?: Record<string, string>; // Ej: { "Motor": "9000 RPM", "Cuchilla": "Fade de grafito" }
  precio_compra: number; // Costo para la barbería
  precio_venta: number;  // Precio al público
  precio_alumno?: number; // Precio con descuento especial para alumnos matriculados
  stock: number; // Stock total (stock_ica + stock_huancayo)
  stock_ica?: number; // Stock físico en Sede Ica
  stock_huancayo?: number; // Stock físico en Sede Huancayo
  stock_minimo: number;  // Umbral para alerta de bajo stock
  imagenes: string[];
  destacado: boolean;    // Para mostrar en la home / productos top
  en_oferta: boolean;
  precio_oferta?: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export type TipoMovimientoInventario = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'USO_CLASE' | 'TRASLADO_SEDE';

export interface MovimientoInventario {
  id: string;
  producto_id: string;
  producto?: Producto;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string; // Ej: "Compra a distribuidor Wahl", "Venta Ticket #012", "Uso en módulo práctico de corte"
  sede?: string; // 'ica' | 'huancayo'
  sede_destino?: string; // Para traslados entre sedes
  usuario_id: string;
  usuario_nombre?: string;
  referencia_id?: string; // ID del pedido o compra asociada
  fecha: string;
}

export type EstadoPedido = 'PENDIENTE' | 'PAGADO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO';
export type MetodoPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MIXTO';

export interface ItemPedido {
  id: string;
  pedido_id: string;
  producto_id: string;
  producto?: Producto;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  codigo_pedido: string; // Ej: GAL-2026-0001
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_dni?: string;
  direccion_entrega?: string;
  ciudad: string; // "Ica", "Parcona", "La Tinguiña", etc.
  metodo_entrega: 'RECOJO_SEDE' | 'DELIVERY_ICA';
  metodo_pago: MetodoPago;
  estado: EstadoPedido;
  subtotal: number;
  costo_envio: number;
  descuento: number;
  total: number;
  comprobante_pago_url?: string;
  es_alumno: boolean;
  alumno_id?: string;
  notas?: string;
  items: ItemPedido[];
  creado_en: string;
}

// ------------------------------------------
// MÓDULO ACADEMIA Y MATRÍCULAS
// ------------------------------------------

export type TurnoCurso = 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO' | 'DOMINICAL';
export type EstadoAcademico = 'MATRICULADO' | 'EN_CURSO' | 'EGRESADO' | 'RETIRADO' | 'SUSPENDIDO';

export interface TurnoOption {
  id: string;
  nombre: string;
  horario: string;
  dias?: string;
  vacantesDisponibles: number;
  duracion_meses?: number;
  costo_mensualidad?: number;
}

export interface Curso {
  id: string;
  titulo: string;
  slug: string;
  descripcion_corta: string;
  temario_detallado?: string[];
  duracion_semanas: number;
  horas_academicas: number;
  costo_matricula: number; // Pago único
  costo_mensualidad: number;
  costo_total_contado?: number; // Descuento si paga todo el curso
  incluye_kit: boolean;
  descripcion_kit?: string;
  imagen_url: string;
  activo: boolean;
  sede?: 'ica' | 'huancayo' | 'ambas' | 'todas' | string;
  turnos?: TurnoOption[];
  beneficios?: any[];
}

export interface HorarioCurso {
  id: string;
  curso_id: string;
  curso?: Curso;
  sede: string; // Ej: "Sede Central Ica - Calle Bolívar"
  turno: TurnoCurso;
  dias: string; // Ej: "Lunes a Jueves" o "Sábados intensivo"
  hora_inicio: string; // "09:00"
  hora_fin: string;    // "12:00"
  fecha_inicio: string;
  fecha_fin: string;
  cupos_totales: number;
  cupos_ocupados: number;
  docente_id?: string;
  docente_nombre?: string;
  activo: boolean;
}

export interface Alumno {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email?: string;
  direccion?: string;
  distrito: string; // Ica, Subtanjalla, Parcona, etc.
  fecha_nacimiento?: string;
  foto_url?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  creado_en: string;
}

export interface Matricula {
  id: string;
  codigo_matricula: string; // Ej: MAT-2026-0045
  alumno_id: string;
  alumno?: Alumno;
  curso_id: string;
  curso?: Curso;
  curso_nombre?: string;
  horario_id?: string;
  horario?: HorarioCurso;
  sede?: string;
  turno?: TurnoCurso | string;
  fecha_matricula: string;
  fecha_inicio?: string;
  estado: EstadoAcademico;
  monto_matricula_pagado: number;
  total_curso: number;
  saldo_pendiente: number;
  kit_entregado: boolean;
  fecha_entrega_kit?: string | null;
  notas?: string;
  cuotas: CuotaMatricula[];
}

export type EstadoCuota = 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'CONDONADA';

export interface CuotaMatricula {
  id: string;
  matricula_id: string;
  numero_cuota: number; // Cuota 1, 2, 3...
  monto: number;
  fecha_vencimiento: string;
  fecha_pago?: string;
  estado: EstadoCuota;
  metodo_pago?: MetodoPago;
  numero_operacion?: string;
  comprobante_url?: string;
  cajero_id?: string;
}

// ------------------------------------------
// MÓDULO CAJA CHICA Y FINANZAS
// ------------------------------------------

export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type TipoMovimientoCaja = 'INGRESO_VENTA' | 'INGRESO_MATRICULA' | 'INGRESO_OTRO' | 'EGRESO_GASTO' | 'EGRESO_COMPRA_INSUMO';

export interface CajaChica {
  id: string;
  sede: string;
  usuario_apertura_id: string;
  usuario_apertura_nombre: string;
  fecha_apertura: string;
  monto_apertura: number; // Saldo inicial en efectivo para vuelto
  
  usuario_cierre_id?: string;
  usuario_cierre_nombre?: string;
  fecha_cierre?: string;
  
  total_ingresos_efectivo: number;
  total_ingresos_digital: number; // Yape, Plin, Transferencias
  total_egresos_efectivo: number;
  
  saldo_teorico_efectivo: number; // monto_apertura + ingresos_efectivo - egresos_efectivo
  saldo_real_efectivo?: number;   // Arqueo físico al final del día
  diferencia?: number;            // Faltante o sobrante
  
  estado: EstadoCaja;
  observaciones?: string;
}

export interface MovimientoCaja {
  id: string;
  caja_id: string;
  tipo: TipoMovimientoCaja;
  monto: number;
  metodo_pago: MetodoPago;
  concepto: string; // Ej: "Venta Ticket #023", "Pago Cuota 1 Alumno Carlos Rojas", "Compra de papel toalla y desinfectante"
  categoria_gasto?: 'SERVICIOS' | 'INSUMOS_CLASE' | 'ALIMENTACION' | 'MANTENIMIENTO' | 'OTROS';
  referencia_id?: string; // ID de Pedido o de Cuota
  comprobante_url?: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha: string;
}

// ------------------------------------------
// MÉTRICAS Y DASHBOARD
// ------------------------------------------

export interface DashboardMetrics {
  ventas_hoy: number;
  pedidos_hoy: number;
  alumnos_activos: number;
  ingresos_mes: number;
  total_caja_hoy: number;
  stock_critico_count: number;
  cuotas_por_vencer_semana: number;
}
