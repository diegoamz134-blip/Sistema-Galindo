// =========================================================================
// DEFINICIÓN DE MÓDULOS Y PERMISOS DEL SISTEMA - GALINDO BARBER
// =========================================================================

export type ModuloId =
  | 'dashboard'
  | 'pos'
  | 'pedidos'
  | 'productos'
  | 'inventario'
  | 'matriculas'
  | 'reportes'
  | 'configuracion';

export interface ModuloDef {
  id: ModuloId;
  label: string;
  nombreCorto: string;
  descripcion: string;
  ruta: string;
  icono: string;
  categoria: 'Principal' | 'Operativa' | 'Analítica' | 'Ajustes';
  badgeColor: string;
}

export const TODOS_LOS_MODULOS: ModuloId[] = [
  'dashboard',
  'pos',
  'pedidos',
  'productos',
  'inventario',
  'matriculas',
  'reportes',
  'configuracion',
];

export const LISTA_MODULOS: ModuloDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard General',
    nombreCorto: 'Dashboard',
    descripcion: 'Métricas clave, resumen de ventas y accesos rápidos',
    ruta: '/admin',
    icono: 'LayoutDashboard',
    categoria: 'Principal',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  },
  {
    id: 'pos',
    label: 'Punto de Venta (POS)',
    nombreCorto: 'POS',
    descripcion: 'Caja rápida de mostrador, venta de productos e impresión de tickets',
    ruta: '/admin/pos',
    icono: 'Store',
    categoria: 'Operativa',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'pedidos',
    label: 'Pedidos Web & Ventas',
    nombreCorto: 'Pedidos',
    descripcion: 'Recepción, validación de pagos Yape/Plin y despacho de órdenes online',
    ruta: '/admin/pedidos',
    icono: 'ShoppingBag',
    categoria: 'Operativa',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'productos',
    label: 'Productos & Catálogo',
    nombreCorto: 'Productos',
    descripcion: 'Catálogo de máquinas, tijeras, insumos, precios y destacados',
    ruta: '/admin/productos',
    icono: 'Package',
    categoria: 'Operativa',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'inventario',
    label: 'Inventario (Kardex)',
    nombreCorto: 'Inventario',
    descripcion: 'Entradas de mercadería, salidas, mermas y traslados Ica / Huancayo',
    ruta: '/admin/inventario',
    icono: 'Boxes',
    categoria: 'Operativa',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'matriculas',
    label: 'Academia & Matrículas',
    nombreCorto: 'Matrículas',
    descripcion: 'Alumnos, cursos de barbería, cronograma de cuotas, carnets y contratos',
    ruta: '/admin/matriculas',
    icono: 'GraduationCap',
    categoria: 'Operativa',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'reportes',
    label: 'Reportes & Analítica',
    nombreCorto: 'Reportes',
    descripcion: 'Ingresos por sede, productos más vendidos, utilidades y cierres',
    ruta: '/admin/reportes',
    icono: 'BarChart3',
    categoria: 'Analítica',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'configuracion',
    label: 'Ajustes del Sistema',
    nombreCorto: 'Ajustes',
    descripcion: 'Sedes, datos del negocio, formatos de ticket y gestión de cuentas de usuario',
    ruta: '/admin/configuracion',
    icono: 'Settings',
    categoria: 'Ajustes',
    badgeColor: 'bg-zinc-800 text-white border-zinc-900',
  },
];

export interface PerfilUsuarioSistema {
  id: string;
  auth_user_id?: string;
  email: string;
  nombre_completo: string;
  telefono?: string;
  rol: string;
  permisos: ModuloId[];
  sede_asignada: 'ica' | 'huancayo' | 'todas';
  es_superadmin: boolean;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

// Plantillas / Presets rápidos para facilitar asignación
export const PRESETS_PERMISOS: { id: string; label: string; desc: string; modulos: ModuloId[] }[] = [
  {
    id: 'todos',
    label: 'Acceso Total',
    desc: 'Habilita todos los módulos y funciones del sistema',
    modulos: TODOS_LOS_MODULOS,
  },
  {
    id: 'caja',
    label: 'Cajero / Mostrador',
    desc: 'Solo Punto de Venta (POS) y catálogo de Productos',
    modulos: ['pos', 'productos'],
  },
  {
    id: 'academia',
    label: 'Academia & Docencia',
    desc: 'Gestión de estudiantes, matrículas y cuotas',
    modulos: ['matriculas'],
  },
  {
    id: 'logistica',
    label: 'Logística & Almacén',
    desc: 'Catálogo de productos, Kardex y pedidos web',
    modulos: ['productos', 'inventario', 'pedidos'],
  },
  {
    id: 'ventas_reportes',
    label: 'Administrador Operativo',
    desc: 'POS, pedidos, inventario, matrículas y reportes',
    modulos: ['dashboard', 'pos', 'pedidos', 'productos', 'inventario', 'matriculas', 'reportes'],
  },
];

/**
 * Determina si un usuario tiene acceso a un módulo específico
 */
export function tienePermisoModulo(
  permisos: ModuloId[] | undefined | null,
  moduloId: ModuloId,
  esSuperadmin = false
): boolean {
  if (esSuperadmin) return true;
  if (!permisos || !Array.isArray(permisos)) return false;
  return permisos.includes(moduloId);
}

/**
 * Obtiene la ruta de redirección por defecto para un usuario según sus permisos
 */
export function obtenerRutaInicio(permisos: ModuloId[] | undefined | null, esSuperadmin = false): string {
  if (esSuperadmin) return '/admin';
  if (!permisos || permisos.length === 0) return '/admin/pos'; // Fallback

  const ordenPreferencia: ModuloId[] = [
    'dashboard',
    'pos',
    'pedidos',
    'matriculas',
    'productos',
    'inventario',
    'reportes',
    'configuracion',
  ];

  for (const mod of ordenPreferencia) {
    if (permisos.includes(mod)) {
      const match = LISTA_MODULOS.find((m) => m.id === mod);
      if (match) return match.ruta;
    }
  }

  return '/admin';
}
