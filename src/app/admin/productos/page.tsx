'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Boxes,
  UploadCloud,
  Trash2,
  MoreVertical,
  Pencil,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Producto, Categoria } from '@/types/database';
import {
  getAdminProductsPaginado,
  getAdminProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  CreateProductInput,
  UpdateProductInput,
} from '@/lib/products-service';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80';

// Utilidad para comprimir y optimizar fotos del catálogo en el navegador (WebP/JPEG)
async function comprimirFotoProducto(
  file: File,
  maxDimension = 900,
  calidad = 0.82
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no disponible'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', calidad);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', calidad);
        }

        const head = dataUrl.indexOf(',') + 1;
        const sizeBytes = Math.round(((dataUrl.length - head) * 3) / 4);
        const sizeKb = Math.max(1, Math.round(sizeBytes / 1024));

        resolve({ dataUrl, sizeKb });
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
  });
}

const POR_PAGINA = 20;

function generarBotonesPaginacion(actual: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (actual <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (actual >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', actual - 1, actual, actual + 1, '...', total];
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showModalNuevo, setShowModalNuevo] = useState(false);

  // Paginación inteligente (20 productos por página)
  const [pagina, setPagina] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Formulario Nuevo Producto
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stockIca, setStockIca] = useState('');
  const [stockHuancayo, setStockHuancayo] = useState('');
  const [stockMinimo, setStockMinimo] = useState('3');
  const [imagenUrl, setImagenUrl] = useState('');
  const [imagenPesoKb, setImagenPesoKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [descripcion, setDescripcion] = useState('');
  const [destacado, setDestacado] = useState(false);
  const [enOferta, setEnOferta] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Estados para Acciones (Tres Puntos, Editar y Eliminar)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [deletingProducto, setDeletingProducto] = useState<Producto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce inteligente para búsqueda en la base de datos (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(busqueda.trim());
      setPagina(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // Cargar datos paginados (exactamente 20 por página)
  const cargarDatos = useCallback(
    async (targetPage = pagina, silencioso = false) => {
      if (!silencioso) setIsLoading(true);
      try {
        const [resPaginado, cats] = await Promise.all([
          getAdminProductsPaginado({
            pagina: targetPage,
            porPagina: POR_PAGINA,
            busqueda: debouncedBusqueda,
            categoriaId: categoriaFiltro,
          }),
          categorias.length > 0 ? Promise.resolve(categorias) : getCategories(),
        ]);

        setProductos(resPaginado.productos);
        setTotalProductos(resPaginado.total);
        setTotalPaginas(resPaginado.totalPaginas);
        if (categorias.length === 0 && cats.length > 0) {
          setCategorias(cats);
          setCategoriaId((curr) => curr || cats[0].id);
        }
      } catch (err) {
        console.error('Error al cargar datos paginados:', err);
      } finally {
        setIsLoading(false);
        if (!silencioso) setIsRefreshing(false);
      }
    },
    [pagina, debouncedBusqueda, categoriaFiltro, categorias]
  );

  useEffect(() => {
    cargarDatos(pagina, false);
  }, [pagina, debouncedBusqueda, categoriaFiltro]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await cargarDatos(pagina, true);
  };

  // Sincronización en Tiempo Real (Supabase Realtime WebSockets + re-enfoque)
  useEffect(() => {
    const channel = supabase
      .channel('admin_productos_live_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => {
          handleRefresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias' },
        () => {
          handleRefresh();
        }
      )
      .subscribe();

    const onFocus = () => handleRefresh();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [pagina, debouncedBusqueda, categoriaFiltro]);

  // Generador 100% automático de SKU correlativo único
  const generarSkuAutomatico = useCallback(() => {
    const nextNum = String((totalProductos || productos.length) + 1).padStart(4, '0');
    return `GAL-${nextNum}`;
  }, [totalProductos, productos]);

  const abrirModalNuevo = () => {
    setEditingProducto(null);
    setFormError(null);
    setNombre('');
    setPrecioCompra('');
    setPrecioVenta('');
    setStockIca('');
    setStockHuancayo('0');
    setStockMinimo('3');
    setImagenUrl('');
    setImagenPesoKb(null);
    setDescripcion('');
    setDestacado(false);
    setEnOferta(false);
    setSku(generarSkuAutomatico());
    setShowModalNuevo(true);
  };

  const abrirModalEditar = (p: Producto) => {
    setMenuOpenId(null);
    setEditingProducto(p);
    setFormError(null);
    setNombre(p.nombre);
    setSku(p.sku);
    setCategoriaId(p.categoria_id || (categorias[0]?.id ?? ''));
    setPrecioCompra(String(p.precio_compra ?? '0'));
    setPrecioVenta(String(p.precio_venta ?? '0'));
    setStockIca(String(p.stock_ica ?? p.stock ?? '0'));
    setStockHuancayo(String(p.stock_huancayo ?? '0'));
    setStockMinimo(String(p.stock_minimo ?? '3'));
    setImagenUrl(p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : '');
    setImagenPesoKb(null);
    setDescripcion(p.descripcion || '');
    setDestacado(Boolean(p.destacado));
    setEnOferta(Boolean(p.en_oferta));
    setShowModalNuevo(true);
  };

  const handleConfirmarEliminar = async () => {
    if (!deletingProducto) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(deletingProducto.id);
      if (res.success) {
        setProductos((prev) => prev.filter((p) => p.id !== deletingProducto.id));
        setSuccessToast(`Producto "${deletingProducto.nombre}" eliminado correctamente.`);
        setTimeout(() => setSuccessToast(null), 4000);
        setDeletingProducto(null);
      } else {
        alert(`No se pudo eliminar el producto: ${res.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error al eliminar producto:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsCompressing(true);
    setFormError(null);
    try {
      const { dataUrl, sizeKb } = await comprimirFotoProducto(file, 900, 0.82);
      setImagenUrl(dataUrl);
      setImagenPesoKb(sizeKb);
    } catch (err) {
      console.error('Error comprimiendo imagen:', err);
      setFormError('No se pudo optimizar la imagen seleccionada.');
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

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const finalSku = sku.trim() || generarSkuAutomatico();
    const parsedStockIca = Math.max(0, parseInt(stockIca, 10) || 0);
    const parsedStockHyo = Math.max(0, parseInt(stockHuancayo, 10) || 0);
    const totalConsolidado = parsedStockIca + parsedStockHyo;

    if (editingProducto) {
      const updateData: UpdateProductInput = {
        nombre,
        sku: finalSku,
        categoria_id: categoriaId || null,
        descripcion: descripcion || `${nombre} para uso profesional de barbería`,
        precio_compra: parseFloat(precioCompra) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        precio_alumno: null,
        stock_ica: parsedStockIca,
        stock_huancayo: parsedStockHyo,
        stock: totalConsolidado,
        stock_minimo: parseInt(stockMinimo, 10) || 3,
        imagen_url: imagenUrl || undefined,
        destacado,
        en_oferta: enOferta,
      };

      const res = await updateProduct(editingProducto.id, updateData);

      if (res.success && res.data) {
        setProductos((prev) =>
          prev.map((item) => (item.id === editingProducto.id ? res.data! : item))
        );
        setShowModalNuevo(false);
        setEditingProducto(null);
        setSuccessToast(`¡Producto "${nombre}" actualizado exitosamente!`);
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setFormError(res.error || 'Error al actualizar el producto en Supabase');
      }
    } else {
      const input: CreateProductInput = {
        nombre,
        sku: finalSku,
        categoria_id: categoriaId,
        descripcion: descripcion || `${nombre} para uso profesional de barbería`,
        precio_compra: parseFloat(precioCompra) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        stock_ica: parsedStockIca,
        stock_huancayo: parsedStockHyo,
        stock: totalConsolidado,
        stock_minimo: parseInt(stockMinimo, 10) || 3,
        imagen_url: imagenUrl || undefined,
        destacado,
        en_oferta: enOferta,
      };

      const res = await createProduct(input);

      if (res.success && res.data) {
        setProductos((prev) => [res.data!, ...prev]);
        setShowModalNuevo(false);
        setSuccessToast(`¡Producto "${nombre}" registrado exitosamente!`);
        setTimeout(() => setSuccessToast(null), 4000);

        // Limpiar campos
        setNombre('');
        setSku('');
        setPrecioCompra('');
        setPrecioVenta('');
        setStockIca('');
        setStockHuancayo('0');
        setStockMinimo('3');
        setImagenUrl('');
        setImagenPesoKb(null);
        setDescripcion('');
        setDestacado(false);
        setEnOferta(false);
      } else {
        if (res.error?.includes('violates row-level security')) {
          setFormError(
            'Permiso denegado por seguridad (RLS en Supabase). Por favor ejecuta el script database/habilitar_productos.sql en el SQL Editor de tu servidor.'
          );
        } else {
          setFormError(res.error || 'Error al guardar el producto en Supabase');
        }
      }
    }
    setIsSaving(false);
  };

  const productosFiltrados = productos;

  const primerItemVisible = totalProductos === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const ultimoItemVisible = Math.min(pagina * POR_PAGINA, totalProductos);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Notificación de Éxito */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Catálogo de Productos & Inventario
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-mono font-semibold">
              {totalProductos} {totalProductos === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Precios regulares para clientes y descuentos para alumnos de la academia.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Recargar inventario desde Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isRefreshing ? 'Recargando...' : 'Recargar'}</span>
          </button>

          <button
            type="button"
            onClick={abrirModalNuevo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, marca o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-xs focus:border-black outline-none shadow-xs transition-colors"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
            >
              Limpiar
            </button>
          )}
        </div>

        <select
          value={categoriaFiltro}
          onChange={(e) => {
            setCategoriaFiltro(e.target.value);
            setPagina(1);
          }}
          className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 text-xs focus:border-black outline-none shadow-xs cursor-pointer font-medium"
        >
          <option value="todas">Todas las categorías ({totalProductos})</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-zinc-400 font-mono space-y-3">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-zinc-400" />
            <p>Cargando productos de Supabase...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <Boxes className="w-7 h-7 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900">
                {busqueda || categoriaFiltro !== 'todas'
                  ? 'No se encontraron productos con ese filtro'
                  : 'No hay productos registrados en el inventario'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {busqueda || categoriaFiltro !== 'todas'
                  ? 'Prueba modificando los términos de búsqueda o seleccionando todas las categorías.'
                  : 'Empieza registrando tu primer producto para que esté disponible para ventas y en la tienda pública.'}
              </p>
            </div>
            {!busqueda && categoriaFiltro === 'todas' && (
              <button
                type="button"
                onClick={abrirModalNuevo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Producto</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto min-h-[260px] pb-6 w-full">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-zinc-50/80 text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Producto</th>
                  <th className="px-5 py-3.5 font-medium font-mono">SKU</th>
                  <th className="px-5 py-3.5 font-medium">Costo Compra</th>
                  <th className="px-5 py-3.5 font-medium">Precio Venta</th>
                  <th className="px-5 py-3.5 font-medium text-center">Stock</th>
                  <th className="px-5 py-3.5 font-medium text-center">Estado</th>
                  <th className="px-5 py-3.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {productosFiltrados.map((p) => {
                  const stockBajo = p.stock <= p.stock_minimo;
                  const catNombre =
                    p.categoria?.nombre ||
                    categorias.find((c) => c.id === p.categoria_id)?.nombre ||
                    'Sin categoría';

                  const img =
                    p.imagenes && p.imagenes.length > 0
                      ? p.imagenes[0]
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              <img
                                src={img}
                                alt={p.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Boxes className="w-5 h-5 text-zinc-400 opacity-60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 truncate">{p.nombre}</p>
                            <p className="text-[11px] text-zinc-500">{catNombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-500 font-semibold">
                        {p.sku}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-500">
                        {formatCurrency(p.precio_compra)}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-zinc-950">
                        {formatCurrency(p.precio_venta)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                              stockBajo
                                ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold'
                                : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                            }`}
                          >
                            {p.stock} un.
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 mt-1">
                            ICA: <b className="text-zinc-700">{p.stock_ica ?? p.stock}</b> • HYO: <b className="text-zinc-700">{p.stock_huancayo ?? 0}</b>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === p.id ? null : p.id);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Opciones del producto"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenId === p.id && (
                          <>
                            {/* Overlay transparente para cerrar al hacer clic afuera */}
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setMenuOpenId(null)}
                            />

                            {/* Menú de opciones */}
                            <div className="absolute right-5 top-11 z-30 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => abrirModalEditar(p)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Editar producto</span>
                              </button>
                              <div className="my-1 border-t border-zinc-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingProducto(p);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Eliminar producto</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación Inteligente (20 productos por página) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-zinc-50/80 border-t border-zinc-200 text-xs">
            <div className="text-zinc-500 font-medium">
              Mostrando <span className="font-bold text-zinc-900">{primerItemVisible}</span> a{' '}
              <span className="font-bold text-zinc-900">{ultimoItemVisible}</span> de{' '}
              <span className="font-bold text-zinc-900 font-mono">{totalProductos}</span> productos
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                disabled={pagina <= 1 || isLoading}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-1">
                {generarBotonesPaginacion(pagina, totalPaginas).map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-1.5 text-zinc-400 font-mono">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setPagina(Number(p))}
                      disabled={isLoading}
                      className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pagina === p
                          ? 'bg-zinc-950 text-white shadow-2xs'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={pagina >= totalPaginas || isLoading}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* Modal Nuevo o Editar Producto */}
      {showModalNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                  {editingProducto ? 'Editar Producto' : 'Registrar Nuevo Producto'}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {editingProducto
                    ? 'Modifica los precios, existencias o información del producto seleccionado.'
                    : 'Agrega un artículo al catálogo para venta en mostrador y tienda virtual.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalNuevo(false);
                  setEditingProducto(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{formError}</div>
              </div>
            )}

            <form onSubmit={handleGuardarProducto} className="space-y-4 text-xs">
              {/* Nombre del Producto */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Wahl Magic Clip Cordless 5 Estrellas"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black focus:bg-white transition-all text-xs"
                />
              </div>

              {/* SKU y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
                      <span>Código SKU</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-semibold">
                        Automático
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSku(generarSkuAutomatico())}
                      className="text-[10px] text-zinc-500 hover:text-black font-mono underline cursor-pointer"
                      title="Generar nuevo código correlativo"
                    >
                      Regenerar
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="GAL-0001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono uppercase outline-none focus:border-black focus:bg-white transition-all text-xs"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Código comercial único asignado automáticamente por el sistema.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Categoría *</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black focus:bg-white transition-all text-xs cursor-pointer"
                  >
                    {categorias.length === 0 ? (
                      <option value="">Cargando categorías...</option>
                    ) : (
                      categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Costo y Precio de Venta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Costo Compra (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    required
                    placeholder="0.00"
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black focus:bg-white transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Precio Venta (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    required
                    placeholder="0.00"
                    value={precioVenta}
                    onChange={(e) => setPrecioVenta(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-950 font-bold font-mono outline-none focus:border-black focus:bg-white transition-all text-xs"
                  />
                </div>
              </div>

              {/* Stock Multi-Sede (Ica y Huancayo) y Mínimo */}
              <div className="space-y-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider block">
                      Inventario Físico por Sede
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Asigna el stock según la tienda donde tengas mercadería física disponible
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-zinc-800 shadow-2xs">
                    Total Consolidado:{' '}
                    <b className="text-black font-black">
                      {(parseInt(stockIca, 10) || 0) + (parseInt(stockHuancayo, 10) || 0)} un.
                    </b>
                  </span>
                </div>

                {/* Botones de Asignación Rápida */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Destinar a:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStockHuancayo('0');
                      if (stockIca === '0' || !stockIca) setStockIca('10');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                      (parseInt(stockIca, 10) || 0) > 0 && (parseInt(stockHuancayo, 10) || 0) === 0
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:border-black'
                    }`}
                  >
                    Exclusivo Ica
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockIca('0');
                      if (stockHuancayo === '0' || !stockHuancayo) setStockHuancayo('10');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                      (parseInt(stockIca, 10) || 0) === 0 && (parseInt(stockHuancayo, 10) || 0) > 0
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:border-black'
                    }`}
                  >
                    Exclusivo Huancayo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (stockIca === '0' || !stockIca) setStockIca('5');
                      if (stockHuancayo === '0' || !stockHuancayo) setStockHuancayo('5');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                      (parseInt(stockIca, 10) || 0) > 0 && (parseInt(stockHuancayo, 10) || 0) > 0
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700 hover:border-black'
                    }`}
                  >
                    Ambas Sedes
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-zinc-800 mb-1 text-xs">
                      Stock Sede Ica *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={stockIca}
                      onChange={(e) => setStockIca(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-mono font-bold outline-none focus:border-black transition-all text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 block">Calle Bolívar 536</span>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-800 mb-1 text-xs">
                      Stock Sede Huancayo *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0"
                      value={stockHuancayo}
                      onChange={(e) => setStockHuancayo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-mono font-bold outline-none focus:border-black transition-all text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 block">Jr. Guido 654</span>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-800 mb-1 text-xs">
                      Alerta Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="3"
                      value={stockMinimo}
                      onChange={(e) => setStockMinimo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black transition-all text-xs"
                    />
                    <span className="text-[10px] text-zinc-400 mt-1 block">Aviso para reabastecer</span>
                  </div>
                </div>

                {/* Explicación Dinámica en Tiempo Real */}
                {(() => {
                  const numIca = parseInt(stockIca, 10) || 0;
                  const numHyo = parseInt(stockHuancayo, 10) || 0;
                  if (numIca > 0 && numHyo === 0) {
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200" />
                        <span>
                          Este producto aparecerá <strong>únicamente en Sede Ica</strong> ({numIca} un.). En Huancayo no se mostrará.
                        </span>
                      </div>
                    );
                  }
                  if (numIca === 0 && numHyo > 0) {
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 ring-2 ring-blue-200" />
                        <span>
                          Este producto aparecerá <strong>únicamente en Sede Huancayo</strong> ({numHyo} un.). En Ica no se mostrará.
                        </span>
                      </div>
                    );
                  }
                  if (numIca > 0 && numHyo > 0) {
                    return (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 ring-2 ring-purple-200" />
                        <span>
                          Este producto estará <strong>disponible en ambas sedes</strong> ({numIca} en Ica y {numHyo} en Huancayo) con inventarios independientes.
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                      <span>
                        Coloca la cantidad en la sede donde tengas mercadería. La sede que tenga <strong>0</strong> no mostrará el producto en la tienda ni en el mostrador.
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Selector de Imagen Comprimida desde Galería */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
                    <span>Foto del Producto</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">
                      Galería
                    </span>
                  </label>
                  {imagenUrl && (
                    <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Optimizado ({imagenPesoKb ? `${imagenPesoKb} KB` : 'Listo'})
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSeleccionarArchivo}
                  className="hidden"
                />

                {!imagenUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/70 hover:bg-zinc-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:scale-105 group-hover:text-black transition-all">
                      {isCompressing ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        {isCompressing ? 'Optimizando foto...' : 'Seleccionar foto de la galería'}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Compresión automática inteligente: nitidez HD en tienda y peso ultra liviano (&lt;100 KB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-zinc-200 shrink-0 shadow-xs">
                        <img
                          src={imagenUrl}
                          alt="Vista previa del producto"
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
                          {imagenPesoKb ? `Peso optimizado: ~${imagenPesoKb} KB` : 'Imagen comprimida'} • Carga instantánea
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
              </div>

              {/* Descripción */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Descripción Corta
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la máquina o producto, tipo de motor, cuchillas o usos..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 text-xs outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>

              {/* Opciones Adicionales */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                  <input
                    type="checkbox"
                    checked={destacado}
                    onChange={(e) => setDestacado(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
                  />
                  <span>Producto Destacado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-700">
                  <input
                    type="checkbox"
                    checked={enOferta}
                    onChange={(e) => setEnOferta(e.target.checked)}
                    className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
                  />
                  <span>En Oferta</span>
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalNuevo(false);
                    setEditingProducto(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:text-black font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{editingProducto ? 'Actualizando...' : 'Guardando...'}</span>
                    </>
                  ) : (
                    <span>{editingProducto ? 'Guardar Cambios' : 'Guardar Producto'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bonito de Confirmación para Eliminar Producto */}
      {deletingProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  ¿Eliminar este producto?
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Esta acción es permanente. El producto será retirado del catálogo, inventario y de la tienda oficial.
                </p>
              </div>
            </div>

            {/* Tarjeta resumen del producto a eliminar */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200 overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={
                    deletingProducto.imagenes && deletingProducto.imagenes.length > 0
                      ? deletingProducto.imagenes[0]
                      : DEFAULT_PRODUCT_IMAGE
                  }
                  alt={deletingProducto.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-zinc-950 truncate">
                  {deletingProducto.nombre}
                </p>
                <p className="text-[11px] font-mono text-zinc-500 font-semibold mt-0.5">
                  SKU: {deletingProducto.sku}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px]">
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(deletingProducto.precio_venta)}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="font-mono text-zinc-500">
                    {deletingProducto.stock} un. en stock
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingProducto(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmarEliminar}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
