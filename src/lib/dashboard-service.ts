import { supabase } from '@/lib/supabase';
import { MovimientoCaja, Matricula } from '@/types/database';

export interface DashboardSummary {
  cobrosHoy: number;
  efectivoCaja: number;
  digitalCaja: number;
  egresosHoy: number;
  alumnosActivos: number;
  stockCriticoCount: number;
  totalProductos: number;
  crecimientoVsAyer: number;
  isRealData: boolean;
}

export interface SalesDataPoint {
  label: string;
  tienda: number;
  academia: number;
  total: number;
}

export interface TopProductItem {
  id: string;
  nombre: string;
  categoria: string;
  unidadesVendidas: number;
  ingresos: number;
  stock: number;
  porcentaje: number;
}

export interface PaymentMethodItem {
  name: string;
  monto: number;
  porcentaje: number;
  color: string;
}

// -------------------------------------------------------------------------
// Helper: Obtener ventas consolidadas (Supabase 'pedidos' + Cache local POS)
// -------------------------------------------------------------------------
export async function getConsolidatedSales(sedeId?: string): Promise<any[]> {
  let dbSales: any[] = [];

  try {
    let query = supabase
      .from('pedidos')
      .select('id, codigo_pedido, total, subtotal, metodo_pago, estado, creado_en, cliente_nombre, notas, sede_id')
      .order('creado_en', { ascending: false });

    // Filtrar por sede si se especifica
    if (sedeId) {
      query = query.eq('sede_id', sedeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      dbSales = data;
    }
  } catch (err) {
    console.warn('Error al leer pedidos de Supabase:', err);
  }
  // -------------------------------------------------------------------------
  // IMPORTANTE: Se elimina la lógica de auto-sincronización desde localStorage
  // porque "revivía" datos falsos o eliminados de la base de datos (datos fantasma).
  // La fuente de verdad absoluta ahora es Supabase.
  // -------------------------------------------------------------------------

  return dbSales;
}

// -------------------------------------------------------------------------
// 1. Obtener Métricas Generales del Dashboard (Cobros, Caja, Stock, Alumnos)
// -------------------------------------------------------------------------
export async function getDashboardSummary(sedeId?: string): Promise<DashboardSummary> {
  try {
    const [productosRes, matriculasRes, ventasConsolidadas] = await Promise.all([
      supabase.from('productos').select('id, stock, stock_minimo, precio_venta, stock_ica, stock_huancayo'),
      supabase.from('matriculas').select('id, estado'),
      getConsolidatedSales(sedeId),
    ]);

    const productos = productosRes.data || [];
    const matriculas = matriculasRes.data || [];

    // Stock critico (por sede si se especifica)
    const stockCriticoCount = productos.filter((p) => {
      const stockSede =
        sedeId === 'huancayo'
          ? Number(p.stock_huancayo ?? p.stock)
          : Number(p.stock_ica ?? p.stock);
      return stockSede <= Number(p.stock_minimo || 3);
    }).length;

    // Alumnos activos
    const alumnosActivos = matriculas.filter(
      (m) => m.estado !== 'RETIRADO' && m.estado !== 'EGRESADO'
    ).length;

    // Calcular cobros de hoy
    const hoyStr = new Date().toISOString().slice(0, 10);
    let cobrosHoy = 0;
    let efectivoCaja = 0;
    let digitalCaja = 0;

    ventasConsolidadas.forEach((v) => {
      const fechaVenta = v.creado_en ? v.creado_en.slice(0, 10) : hoyStr;
      const monto = Number(v.total || 0);

      // Si es del día de hoy o turno actual
      if (fechaVenta === hoyStr) {
        cobrosHoy += monto;

        const metodo = String(v.metodo_pago || '').toUpperCase();
        if (metodo === 'EFECTIVO') {
          efectivoCaja += monto;
        } else if (metodo === 'MIXTO') {
          // Si es mixto y hay detalles
          const efecParte = v.ventaCompleta?.detallesPago?.efectivo ?? monto / 2;
          const digParte = v.ventaCompleta?.detallesPago?.digital ?? monto / 2;
          efectivoCaja += Number(efecParte);
          digitalCaja += Number(digParte);
        } else {
          // YAPE, PLIN, TRANSFERENCIA, TARJETA
          digitalCaja += monto;
        }
      }
    });


    return {
      cobrosHoy,
      efectivoCaja,
      digitalCaja,
      egresosHoy: 0,
      alumnosActivos,
      stockCriticoCount,
      totalProductos: productos.length,
      crecimientoVsAyer: cobrosHoy > 0 ? 100 : 0,
      isRealData: true,
    };
  } catch (error) {
    console.error('Error al consultar métricas del dashboard:', error);
    return {
      cobrosHoy: 0,
      efectivoCaja: 0,
      digitalCaja: 0,
      egresosHoy: 0,
      alumnosActivos: 0,
      stockCriticoCount: 0,
      totalProductos: 0,
      crecimientoVsAyer: 0,
      isRealData: true,
    };
  }
}

// -------------------------------------------------------------------------
// 2. Obtener Tendencia de Ventas (Evolución de Ingresos)
// -------------------------------------------------------------------------
export async function getSalesTrendData(periodo: '7d' | '30d' | 'año'): Promise<SalesDataPoint[]> {
  try {
    const ventas = await getConsolidatedSales();
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const resultado: Record<string, { tienda: number; academia: number; total: number }> = {};
    dias.forEach((d) => {
      resultado[d] = { tienda: 0, academia: 0, total: 0 };
    });

    if (ventas.length === 0) {
      return dias.map((d) => ({ label: d, tienda: 0, academia: 0, total: 0 }));
    }

    ventas.forEach((v) => {
      const fecha = v.creado_en ? new Date(v.creado_en) : new Date();
      const dayIndex = (fecha.getDay() + 6) % 7; // 0 = Lun, 6 = Dom
      const diaLabel = dias[dayIndex];
      const monto = Number(v.total || 0);

      resultado[diaLabel].tienda += monto;
      resultado[diaLabel].total += monto;
    });

    return dias.map((d) => ({
      label: d,
      tienda: resultado[d].tienda,
      academia: resultado[d].academia,
      total: resultado[d].total,
    }));
  } catch (err) {
    console.error('Error al calcular tendencia de ventas:', err);
    return [
      { label: 'Lun', tienda: 0, academia: 0, total: 0 },
      { label: 'Mar', tienda: 0, academia: 0, total: 0 },
      { label: 'Mié', tienda: 0, academia: 0, total: 0 },
      { label: 'Jue', tienda: 0, academia: 0, total: 0 },
      { label: 'Vie', tienda: 0, academia: 0, total: 0 },
      { label: 'Sáb', tienda: 0, academia: 0, total: 0 },
      { label: 'Dom', tienda: 0, academia: 0, total: 0 },
    ];
  }
}

// -------------------------------------------------------------------------
// 3. Obtener Ranking de Productos Top / Productos Estrella
// -------------------------------------------------------------------------
export async function getTopProductsRanking(): Promise<TopProductItem[]> {
  try {
    // 1. Consultar ítems de pedidos en Supabase
    let itemsFromDb: any[] = [];
    try {
      const { data } = await supabase
        .from('pedido_items')
        .select('nombre_producto, cantidad, subtotal, producto_id');
      if (data) itemsFromDb = data;
    } catch (e) {
      // Ignore
    }

    // 2. Usar exclusivamente la BD, evitando datos fantasma del localStorage
    const todosItems = itemsFromDb;

    // Agrupar por producto
    const mapaProductos = new Map<string, { unidades: number; ingresos: number; id: string }>();

    todosItems.forEach((it) => {
      const nombre = it.nombre_producto || 'Producto';
      const actual = mapaProductos.get(nombre) || { unidades: 0, ingresos: 0, id: it.producto_id || nombre };
      actual.unidades += Number(it.cantidad || 1);
      actual.ingresos += Number(it.subtotal || 0);
      mapaProductos.set(nombre, actual);
    });

    // Si aún no hay ventas de ítems, mostrar los productos disponibles de la tienda
    if (mapaProductos.size === 0) {
      const { data: prods } = await supabase
        .from('productos')
        .select('id, nombre, precio_venta, stock')
        .limit(5);

      if (prods && prods.length > 0) {
        return prods.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          categoria: 'Inventario General',
          unidadesVendidas: 0,
          ingresos: 0,
          stock: Number(p.stock || 0),
          porcentaje: 0,
        }));
      }
      return [];
    }

    const rankingTotal = Array.from(mapaProductos.values()).reduce((acc, curr) => acc + curr.ingresos, 0);

    const listaOrdenada = Array.from(mapaProductos.entries())
      .map(([nombre, datos]) => ({
        id: datos.id,
        nombre,
        categoria: 'Barber Supply & Tienda',
        unidadesVendidas: datos.unidades,
        ingresos: datos.ingresos,
        stock: 10,
        porcentaje: rankingTotal > 0 ? Math.round((datos.ingresos / rankingTotal) * 100) : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);

    return listaOrdenada;
  } catch (e) {
    console.error('Error al obtener productos top reales:', e);
    return [];
  }
}

// -------------------------------------------------------------------------
// 4. Obtener Distribución de Métodos de Pago
// -------------------------------------------------------------------------
export async function getPaymentMethodsBreakdown(): Promise<PaymentMethodItem[]> {
  try {
    const ventas = await getConsolidatedSales();

    let totalYape = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;

    ventas.forEach((v) => {
      const monto = Number(v.total || 0);
      const metodo = String(v.metodo_pago || '').toUpperCase();

      if (metodo === 'YAPE' || metodo === 'PLIN') {
        totalYape += monto;
      } else if (metodo === 'EFECTIVO') {
        totalEfectivo += monto;
      } else if (metodo === 'MIXTO') {
        const efecParte = v.ventaCompleta?.detallesPago?.efectivo ?? monto / 2;
        const digParte = v.ventaCompleta?.detallesPago?.digital ?? monto / 2;
        totalEfectivo += Number(efecParte);
        totalYape += Number(digParte);
      } else {
        // TRANSFERENCIA, TARJETA
        totalTransferencia += monto;
      }
    });

    const granTotal = totalYape + totalEfectivo + totalTransferencia;

    return [
      {
        name: 'Yape / Plin',
        monto: totalYape,
        porcentaje: granTotal > 0 ? Math.round((totalYape / granTotal) * 100) : 0,
        color: '#10b981',
      },
      {
        name: 'Efectivo (Gaveta)',
        monto: totalEfectivo,
        porcentaje: granTotal > 0 ? Math.round((totalEfectivo / granTotal) * 100) : 0,
        color: '#09090b',
      },
      {
        name: 'Transferencia / Tarjeta',
        monto: totalTransferencia,
        porcentaje: granTotal > 0 ? Math.round((totalTransferencia / granTotal) * 100) : 0,
        color: '#06b6d4',
      },
    ];
  } catch (err) {
    console.error('Error al obtener métodos de pago reales:', err);
    return [
      { name: 'Yape / Plin', monto: 0, porcentaje: 0, color: '#10b981' },
      { name: 'Efectivo (Gaveta)', monto: 0, porcentaje: 0, color: '#09090b' },
      { name: 'Transferencia / Tarjeta', monto: 0, porcentaje: 0, color: '#06b6d4' },
    ];
  }
}

// -------------------------------------------------------------------------
// 5. Obtener Movimientos Recientes de Caja y Ventas
// -------------------------------------------------------------------------
export async function getRecentMovements(): Promise<MovimientoCaja[]> {
  try {
    // 1. Intentar leer movimientos_caja
    const { data: movs } = await supabase
      .from('movimientos_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(6);

    if (movs && movs.length > 0) {
      return movs;
    }

    // 2. Si no hay movimientos de caja registrados, mostrar las ventas del POS recientes
    const ventas = await getConsolidatedSales();
    if (ventas.length > 0) {
      return ventas.slice(0, 6).map((v) => ({
        id: v.id || v.codigo_pedido,
        caja_id: 'caja-pos',
        tipo: 'INGRESO_VENTA',
        monto: Number(v.total || 0),
        metodo_pago: v.metodo_pago || 'EFECTIVO',
        concepto: `Venta Mostrador Ticket #${v.codigo_pedido} - ${v.cliente_nombre || 'Cliente Mostrador'}`,
        usuario_id: 'usr-admin',
        usuario_nombre: 'Diego Galindo',
        fecha: v.creado_en || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error('Error al consultar movimientos recientes:', err);
  }

  return [];
}

// -------------------------------------------------------------------------
// 6. Obtener Alumnos y Cuotas Críticas
// -------------------------------------------------------------------------
export async function getActiveStudents(): Promise<Matricula[]> {
  try {
    const { data } = await supabase.from('matriculas').select('*').limit(5);

    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error('Error al consultar matrículas de Supabase:', err);
  }

  return [];
}

// -------------------------------------------------------------------------
// 7. Obtener Pedidos Web y POS Recientes para Gestión Operativa
// -------------------------------------------------------------------------
export interface PedidoReciente {
  id: string;
  codigo_pedido: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_dni?: string;
  metodo_pago: string;
  metodo_entrega?: string;
  estado: string;
  total: number;
  creado_en: string;
  notas?: string;
}

export async function getRecentOrders(limit = 8, sedeId?: string): Promise<PedidoReciente[]> {
  try {
    let query = supabase
      .from('pedidos')
      .select('id, codigo_pedido, cliente_nombre, cliente_telefono, cliente_dni, metodo_pago, metodo_entrega, estado, total, creado_en, notas, sede_id')
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (sedeId) {
      query = query.eq('sede_id', sedeId);
    }

    const { data, error } = await query;

    if (!error && data) {
      return data as PedidoReciente[];
    }
  } catch (err) {
    console.error('Error al obtener pedidos recientes de Supabase:', err);
  }
  return [];
}

export async function updateOrderStatus(
  pedidoId: string,
  nuevoEstado: 'PENDIENTE' | 'PAGADO' | 'EN_CAMINO' | 'ENTREGADO' | 'CANCELADO'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
      .eq('id', pedidoId);

    if (!error) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('galindo_pedido_web_realizado'));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error al actualizar estado del pedido:', err);
    return false;
  }
}

