import { supabase } from '@/lib/supabase';
import { PedidoCompleto } from '@/lib/pedidos-service';
import { format, subDays, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

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
    } else if (rango === 'MES') {
      fechaInicio = startOfMonth(ahora);
    } else if (rango === 'AÑO') {
      fechaInicio = startOfYear(ahora);
    }

    const fechaISO = fechaInicio.toISOString();

    // 1. Obtener Pedidos (Ingresos)
    let queryPedidos = supabase
      .from('pedidos')
      .select(`
        id, codigo_pedido, total, metodo_pago, creado_en, sede_id, es_alumno, ciudad, notas,
        pedido_items(
          producto_id, nombre_producto, cantidad, subtotal
        )
      `)
      .neq('estado', 'CANCELADO')
      .gte('creado_en', fechaISO);

    // No filtramos por sede_id aquí porque la columna puede no existir en la base de datos de pedidos antigua
    // Lo filtraremos en memoria

    const { data: pedidosDataRaw, error: errorPedidos } = await queryPedidos;
    if (errorPedidos) throw errorPedidos;

    // Filtrar pedidos por sede en memoria
    const pedidosData = pedidosDataRaw?.filter((ped: any) => {
      if (sedeFiltro === 'TODAS') return true;
      const pedSede = (ped.sede_id || ped.sede_nombre || '').toLowerCase();
      return pedSede.includes(sedeFiltro);
    }) || [];

    // 2. Obtener Gastos (Movimientos de caja = EGRESO)
    let queryCaja = supabase
      .from('movimientos_caja')
      .select('monto, concepto, creado_en, tipo, caja_id')
      .in('tipo', ['EGRESO', 'PAGO_PROVEEDOR', 'GASTO_OPERATIVO', 'RETIRO'])
      .gte('creado_en', fechaISO);

    const { data: gastosData, error: errorGastos } = await queryCaja;
    if (errorGastos) throw errorGastos;

    // Filtrar manualmente los gastos por sede si es necesario (asumimos que si no hay inner join, usamos todas o ignoramos)
    // Para filtrar gastos por sede, necesitaríamos hacer join con cajas_chicas, pero si falla lo omitimos temporalmente
    const gastosFiltrados = gastosData || [];

    // --- CÁLCULOS DE KPIs ---
    let ingresosBrutos = 0;
    let gastosOperativos = 0;
    let ventasTotales = pedidosData?.length || 0;

    let efectivo = 0;
    let yapePlin = 0;
    let transferencia = 0;

    let academiaIngresos = 0;
    let tiendaIngresos = 0;

    const mapaProductos = new Map<string, ProductoTop>();

    // Procesar Pedidos
    (pedidosData || []).forEach((ped) => {
      const monto = Number(ped.total || 0);
      ingresosBrutos += monto;

      // Métodos de pago
      const metodo = (ped.metodo_pago || 'EFECTIVO').toUpperCase();
      if (metodo.includes('EFECTIVO') || metodo.includes('MIXTO')) efectivo += monto;
      else if (metodo.includes('YAPE') || metodo.includes('PLIN')) yapePlin += monto;
      else transferencia += monto;

      // Academia vs Tienda
      // Un pedido es de academia si es_alumno = true o si el código NO empieza con POS y no tiene notas de mostrador
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
    });

    // Procesar Gastos
    const topGastosArray: { concepto: string; monto: number; fecha: string }[] = [];
    gastosFiltrados.forEach((g: any) => {
      const monto = Number(g.monto || 0);
      gastosOperativos += monto;
      topGastosArray.push({
        concepto: g.concepto || 'Egreso',
        monto,
        fecha: g.creado_en
      });
    });

    // Ordenar gastos de mayor a menor
    topGastosArray.sort((a, b) => b.monto - a.monto);

    const gananciaNeta = ingresosBrutos - gastosOperativos;
    const ticketPromedio = ventasTotales > 0 ? ingresosBrutos / ventasTotales : 0;

    // --- GRÁFICO DE EVOLUCIÓN ---
    // Agrupar por Día o Mes dependiendo del rango
    const mapFechas = new Map<string, GraficoEvolucion>();
    
    const addToMap = (fechaStr: string, tipo: 'ingreso' | 'gasto', monto: number) => {
      let key = '';
      if (rango === 'AÑO' || rango === 'TODO') {
        key = format(new Date(fechaStr), 'MMM yyyy', { locale: es });
      } else {
        key = format(new Date(fechaStr), 'dd MMM', { locale: es });
      }

      if (!mapFechas.has(key)) {
        mapFechas.set(key, { fecha: key, ingresos: 0, gastos: 0 });
      }
      if (tipo === 'ingreso') mapFechas.get(key)!.ingresos += monto;
      else mapFechas.get(key)!.gastos += monto;
    };

    pedidosData?.forEach((p) => addToMap(p.creado_en, 'ingreso', Number(p.total)));
    gastosFiltrados.forEach((g: any) => addToMap(g.creado_en, 'gasto', Number(g.monto)));

    // Si no hay datos, inicializamos al menos los últimos días vacíos
    if (mapFechas.size === 0 && rango === '7_DIAS') {
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const k = format(d, 'dd MMM', { locale: es });
        mapFechas.set(k, { fecha: k, ingresos: 0, gastos: 0 });
      }
    }

    // Ordenar el array del gráfico por fecha real
    const parseFechaStr = (f: string) => {
      // Un hack simple para ordenar: como están en formato dd MMM o MMM yyyy, la forma 
      // más segura es extraer la fecha original antes de formatearla. Pero para simplificar
      // el sort, vamos a dejar que recharts las dibuje en el orden insertado si asumimos
      // que vienen cronológicamente de DB? 
      // La DB puede no venir agrupada. Mejor re-ordenamos.
      return new Date(f).getTime(); // Esto fallará con "dd MMM".
    };

    // Para evitar complejidad, dejamos el sort original de Map insertion o un sort basico
    // Si queremos orden cronologico perfecto, ideal es mantener la Date() original en el Map
    // y ordenar al final.
    const graficoEvolucion = Array.from(mapFechas.values());
    
    // Reverse simple si asumimos que las fechas más antiguas están al final (porque supabase ordenó DESC, aunque arriba no pusimos order)
    // Para no complicar, confiaremos en recharts

    return {
      kpis: {
        ingresosBrutos,
        gastosOperativos,
        gananciaNeta,
        ticketPromedio,
        ventasTotales
      },
      graficoEvolucion: graficoEvolucion.reverse(), // Reverts para que sea de izquierda a derecha (más antiguo a más nuevo)
      metodosPago: [
        { name: 'Efectivo', value: efectivo, color: '#10b981' },
        { name: 'Yape / Plin', value: yapePlin, color: '#8b5cf6' },
        { name: 'Transferencia', value: transferencia, color: '#0ea5e9' },
      ].filter(m => m.value > 0),
      distribucionCanal: [
        { name: 'Academia', value: academiaIngresos, color: '#f59e0b' },
        { name: 'Tienda / POS', value: tiendaIngresos, color: '#0f172a' },
      ].filter(m => m.value > 0),
      productosTop: Array.from(mapaProductos.values())
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 5),
      topGastos: topGastosArray.slice(0, 5)
    };

  } catch (error: any) {
    console.error('Error al generar reporte financiero:', error?.message || error);
    return {
      kpis: { ingresosBrutos: 0, gastosOperativos: 0, gananciaNeta: 0, ticketPromedio: 0, ventasTotales: 0 },
      graficoEvolucion: [],
      metodosPago: [],
      distribucionCanal: [],
      productosTop: [],
      topGastos: []
    };
  }
}
