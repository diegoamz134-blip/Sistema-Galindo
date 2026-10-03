import { supabase } from '@/lib/supabase';
import { PedidoCompleto } from '@/lib/pedidos-service';
import { format, subDays, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { matchSede } from '@/lib/academia-service';

export type RangoFecha = 'HOY' | '7_DIAS' | 'MES' | 'AÑO' | 'TODO';
export type SedeFiltro = 'ica' | 'huancayo' | 'TODAS';

export interface KPIReporte {
  ingresosBrutos: number;
  gastosOperativos: number;
  gananciaNeta: number;
  ticketPromedio: number;
  ventasTotales: number;
}

export interface GraficoEvolucion {
  fecha: string;
  ingresos: number;
  gastos: number;
}

export interface MetodoPagoData {
  name: string;
  value: number;
  color: string;
}

export interface DistribucionCanal {
  name: string;
  value: number;
  color: string;
}

export interface ProductoTop {
  id: string;
  nombre: string;
  ingresos: number;
  unidades: number;
}

export interface ReporteFinanciero {
  kpis: KPIReporte;
  graficoEvolucion: GraficoEvolucion[];
  metodosPago: MetodoPagoData[];
  distribucionCanal: DistribucionCanal[];
  productosTop: ProductoTop[];
  topGastos: { concepto: string; monto: number; fecha: string }[];
}

export async function getReporteFinanciero(
  rango: RangoFecha,
  sedeFiltro: SedeFiltro
): Promise<ReporteFinanciero> {
  try {
    const ahora = new Date();
    let fechaInicio = new Date(0); // Principio de los tiempos

    if (rango === 'HOY') {
      fechaInicio = new Date();
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (rango === '7_DIAS') {
      fechaInicio = subDays(ahora, 7);
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (rango === 'MES') {
      fechaInicio = startOfMonth(ahora);
    } else if (rango === 'AÑO') {
      fechaInicio = startOfYear(ahora);
    }

    const fechaISO = fechaInicio.toISOString();

    // 1. Obtener Pedidos (Ventas POS y Tienda Web)
    const queryPedidos = supabase
      .from('pedidos')
      .select(`
        id, codigo_pedido, total, metodo_pago, creado_en, sede_id, es_alumno, ciudad, notas,
        pedido_items(
          producto_id, nombre_producto, cantidad, subtotal
        )
      `)
      .neq('estado', 'CANCELADO')
      .gte('creado_en', fechaISO);

    // 2. Obtener Gastos (Movimientos de caja)
    const queryCaja = supabase
      .from('movimientos_caja')
      .select('monto, concepto, creado_en, fecha, tipo, caja_id')
      .in('tipo', ['EGRESO', 'PAGO_PROVEEDOR', 'GASTO_OPERATIVO', 'RETIRO'])
      .gte('creado_en', fechaISO);

    // 3. Obtener Cajas Chicas para mapear por sede
    const queryCajas = supabase.from('cajas_chicas').select('id, sede');

    // 4. Obtener Matrículas pagadas en el rango
    const queryMatriculas = supabase
      .from('matriculas')
      .select('id, codigo_matricula, sede, monto_matricula_pagado, creado_en, fecha_matricula')
      .gte('creado_en', fechaISO);

    // 5. Obtener Cuotas de Matrícula pagadas en el rango
    const queryCuotas = supabase
      .from('cuotas_matricula')
      .select('id, monto, fecha_pago, metodo_pago, estado, matricula_id, matriculas(id, sede)')
      .eq('estado', 'PAGADA')
      .gte('fecha_pago', fechaISO);

    const [
      { data: pedidosDataRaw },
      { data: gastosDataRaw },
      { data: cajasDataRaw },
      { data: matriculasDataRaw },
      { data: cuotasDataRaw },
    ] = await Promise.all([queryPedidos, queryCaja, queryCajas, queryMatriculas, queryCuotas]);

    // Filtrar pedidos por sede
    const pedidosData = (pedidosDataRaw || []).filter((ped: any) => {
      if (sedeFiltro === 'TODAS') return true;
      const sedeCandidata = ped.sede_id || ped.ciudad || ped.notas || '';
      return matchSede(sedeCandidata, sedeFiltro);
    });

    // Mapear cajas a sedes
    const cajasMap = new Map<string, string>();
    (cajasDataRaw || []).forEach((c: any) => {
      if (c.id && c.sede) cajasMap.set(c.id, c.sede);
    });

    // Filtrar gastos por sede
    const gastosFiltrados = (gastosDataRaw || []).filter((g: any) => {
      if (sedeFiltro === 'TODAS') return true;
      const sedeCaja = g.caja_id ? cajasMap.get(g.caja_id) : undefined;
      if (sedeCaja) return matchSede(sedeCaja, sedeFiltro);
      if (g.concepto && typeof g.concepto === 'string') {
        return matchSede(g.concepto, sedeFiltro);
      }
      return true;
    });

    // Filtrar matrículas por sede
    const matriculasData = (matriculasDataRaw || []).filter((m: any) => {
      if (sedeFiltro === 'TODAS') return true;
      return matchSede(m.sede, sedeFiltro);
    });

    // Filtrar cuotas pagadas por sede
    const cuotasData = (cuotasDataRaw || []).filter((c: any) => {
      if (sedeFiltro === 'TODAS') return true;
      const sedeCuota = c.matriculas?.sede;
      return matchSede(sedeCuota, sedeFiltro);
    });

    // --- CÁLCULOS DE KPIs ---
    let ingresosBrutos = 0;
    let gastosOperativos = 0;
    let ventasTotales = pedidosData.length + matriculasData.length + cuotasData.length;

    let efectivo = 0;
    let yapePlin = 0;
    let transferencia = 0;

    let academiaIngresos = 0;
    let tiendaIngresos = 0;

    const mapaProductos = new Map<string, ProductoTop>();

    // Mapeo cronológico para el gráfico
    const mapFechas = new Map<string, { fecha: string; ingresos: number; gastos: number; sortKey: number }>();

    const addToMap = (fechaStr: string, tipo: 'ingreso' | 'gasto', monto: number) => {
      const d = new Date(fechaStr);
      let key = '';
      let sortKey = 0;

      if (rango === 'AÑO' || rango === 'TODO') {
        key = format(d, 'MMM yyyy', { locale: es });
        sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      } else {
        key = format(d, 'dd MMM', { locale: es });
        sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      }

      if (!mapFechas.has(key)) {
        mapFechas.set(key, { fecha: key, ingresos: 0, gastos: 0, sortKey });
      }
      if (tipo === 'ingreso') mapFechas.get(key)!.ingresos += monto;
      else mapFechas.get(key)!.gastos += monto;
    };

    // 1. Procesar Pedidos
    pedidosData.forEach((ped: any) => {
      const monto = Number(ped.total || 0);
      ingresosBrutos += monto;

      // Métodos de pago
      const metodo = (ped.metodo_pago || 'EFECTIVO').toUpperCase();
      if (metodo.includes('EFECTIVO') || metodo.includes('MIXTO')) efectivo += monto;
      else if (metodo.includes('YAPE') || metodo.includes('PLIN')) yapePlin += monto;
      else transferencia += monto;

      // Academia vs Tienda
      const esPos = ped.codigo_pedido?.startsWith('POS-');
      const tieneMatricula = ped.pedido_items?.some((it: any) =>
        it.nombre_producto?.toLowerCase().includes('matrícula') ||
        it.nombre_producto?.toLowerCase().includes('matricula') ||
        it.nombre_producto?.toLowerCase().includes('barbería integral')
      );

      if (tieneMatricula || (!esPos && ped.es_alumno)) {
        academiaIngresos += monto;
      } else {
        tiendaIngresos += monto;
      }

      // Productos Top
      ped.pedido_items?.forEach((it: any) => {
        const prodId = it.producto_id || it.nombre_producto;
        if (!mapaProductos.has(prodId)) {
          mapaProductos.set(prodId, { id: prodId, nombre: it.nombre_producto || 'Sin nombre', ingresos: 0, unidades: 0 });
        }
        const prod = mapaProductos.get(prodId)!;
        prod.ingresos += Number(it.subtotal || 0);
        prod.unidades += Number(it.cantidad || 1);
      });

      addToMap(ped.creado_en, 'ingreso', monto);
    });

    // 2. Procesar Matrículas Pagadas de Alumnos
    matriculasData.forEach((m: any) => {
      const monto = Number(m.monto_matricula_pagado || 0);
      if (monto > 0) {
        ingresosBrutos += monto;
        academiaIngresos += monto;
        efectivo += monto; // Matrícula mostrador default
        addToMap(m.creado_en || m.fecha_matricula || new Date().toISOString(), 'ingreso', monto);
      }
    });

    // 3. Procesar Cuotas Pagadas de Alumnos
    cuotasData.forEach((c: any) => {
      const monto = Number(c.monto || 0);
      if (monto > 0) {
        ingresosBrutos += monto;
        academiaIngresos += monto;
        const metodo = (c.metodo_pago || 'EFECTIVO').toUpperCase();
        if (metodo.includes('EFECTIVO') || metodo.includes('MIXTO')) efectivo += monto;
        else if (metodo.includes('YAPE') || metodo.includes('PLIN')) yapePlin += monto;
        else transferencia += monto;

        addToMap(c.fecha_pago || new Date().toISOString(), 'ingreso', monto);
      }
    });

    // 4. Procesar Gastos
    const topGastosArray: { concepto: string; monto: number; fecha: string }[] = [];
    gastosFiltrados.forEach((g: any) => {
      const monto = Number(g.monto || 0);
      gastosOperativos += monto;
      topGastosArray.push({
        concepto: g.concepto || 'Egreso de caja chica',
        monto,
        fecha: g.fecha || g.creado_en,
      });

      addToMap(g.fecha || g.creado_en, 'gasto', monto);
    });

    // Ordenar gastos de mayor a menor
    topGastosArray.sort((a, b) => b.monto - a.monto);

    const gananciaNeta = ingresosBrutos - gastosOperativos;
    const ticketPromedio = ventasTotales > 0 ? ingresosBrutos / ventasTotales : 0;

    // Rellenar días vacíos si es 7_DIAS para que el gráfico siempre se vea continuo
    if (rango === '7_DIAS') {
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const k = format(d, 'dd MMM', { locale: es });
        const sortKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (!mapFechas.has(k)) {
          mapFechas.set(k, { fecha: k, ingresos: 0, gastos: 0, sortKey });
        }
      }
    }

    // Ordenar de forma cronológica estricta (más antiguo a la izquierda, más reciente a la derecha)
    const graficoEvolucion = Array.from(mapFechas.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ fecha, ingresos, gastos }) => ({ fecha, ingresos, gastos }));

    return {
      kpis: {
        ingresosBrutos,
        gastosOperativos,
        gananciaNeta,
        ticketPromedio,
        ventasTotales,
      },
      graficoEvolucion,
      metodosPago: [
        { name: 'Efectivo', value: efectivo, color: '#10b981' },
        { name: 'Yape / Plin', value: yapePlin, color: '#8b5cf6' },
        { name: 'Transferencia', value: transferencia, color: '#0ea5e9' },
      ].filter((m) => m.value > 0),
      distribucionCanal: [
        { name: 'Academia', value: academiaIngresos, color: '#f59e0b' },
        { name: 'Tienda / POS', value: tiendaIngresos, color: '#0f172a' },
      ].filter((m) => m.value > 0),
      productosTop: Array.from(mapaProductos.values())
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 5),
      topGastos: topGastosArray.slice(0, 5),
    };
  } catch (error: any) {
    console.error('Error al generar reporte financiero:', error?.message || error);
    return {
      kpis: { ingresosBrutos: 0, gastosOperativos: 0, gananciaNeta: 0, ticketPromedio: 0, ventasTotales: 0 },
      graficoEvolucion: [],
      metodosPago: [],
      distribucionCanal: [],
      productosTop: [],
      topGastos: [],
    };
  }
}
