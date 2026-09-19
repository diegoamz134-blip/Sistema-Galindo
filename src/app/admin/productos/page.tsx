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
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Producto, Categoria } from '@/types/database';
import {
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

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showModalNuevo, setShowModalNuevo] = useState(false);

  // Formulario Nuevo Producto
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('');
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

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [prods, cats] = await Promise.all([getAdminProducts(), getCategories()]);
        if (!isMounted) return;
        setProductos(prods);
        setCategorias(cats);
        if (cats.length > 0) {
          setCategoriaId((curr) => curr || cats[0].id);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [prods, cats] = await Promise.all([getAdminProducts(), getCategories()]);
      setProductos(prods);
      setCategorias(cats);
    } catch (err) {
      console.error('Error al recargar:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sincronización en Tiempo Real (Supabase Realtime WebSockets + re-enfoque)
  useEffect(() => {
    // 1. Canal WebSocket en vivo para escuchar cambios de productos y categorías
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

    // 2. Sincronización automática al volver a la pestaña o desbloquear el teléfono
    const onFocus = () => handleRefresh();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Generador 100% automático de SKU correlativo único (ej: GAL-0001, GAL-0002)
  const generarSkuAutomatico = useCallback((prods: Producto[] = productos) => {
    let maxNum = prods.length;
    prods.forEach((p) => {
      const match = p.sku?.match(/^(?:GAL|PROD)-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = String(maxNum + 1).padStart(4, '0');
    return `GAL-${nextNum}`;
  }, [productos]);

  const abrirModalNuevo = () => {
    setEditingProducto(null);
    setFormError(null);
    setNombre('');
    setPrecioCompra('');
    setPrecioVenta('');
    setStock('');
    setStockMinimo('3');
    setImagenUrl('');
    setImagenPesoKb(null);
    setDescripcion('');
    setDestacado(false);
    setEnOferta(false);
    setSku(generarSkuAutomatico(productos));
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
    setStock(String(p.stock ?? '0'));
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

    const finalSku = sku.trim() || generarSkuAutomatico(productos);

    if (editingProducto) {
      const updateData: UpdateProductInput = {
        nombre,
        sku: finalSku,
        categoria_id: categoriaId || null,
        descripcion: descripcion || `${nombre} para uso profesional de barbería`,
        precio_compra: parseFloat(precioCompra) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        precio_alumno: null,
        stock: parseInt(stock, 10) || 0,
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
        stock: parseInt(stock, 10) || 0,
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
        setStock('');
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

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = categoriaFiltro === 'todas' || p.categoria_id === categoriaFiltro;
    return coincideTexto && coincideCat;
  });

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
              {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
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
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 text-xs focus:border-black outline-none shadow-xs cursor-pointer font-medium"
        >
          <option value="todas">Todas las categorías ({productos.length})</option>
          {categorias.map((cat) => {
            const count = productos.filter((p) => p.categoria_id === cat.id).length;
            return (
              <option key={cat.id} value={cat.id}>
                {cat.nombre} ({count})
              </option>
            );
          })}
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
          <div className="overflow-x-auto min-h-[260px] pb-12 w-full">
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
                      : DEFAULT_PRODUCT_IMAGE;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                            <img
                              src={img}
                              alt={p.nombre}
                              className="w-full h-full object-cover"
                            />
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
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                            stockBajo
                              ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                          }`}
                        >
                          {p.stock} un.
                        </span>
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

              {/* Stock Inicial y Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Stock Inicial *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black focus:bg-white transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Alerta Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="3"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black focus:bg-white transition-all text-xs"
                  />
                </div>
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
