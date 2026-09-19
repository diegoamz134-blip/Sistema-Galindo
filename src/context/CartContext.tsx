'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Producto } from '@/types/database';
import { SedeId, DEFAULT_SEDE_ID } from '@/lib/constants';

export interface CartItem {
  producto: Producto;
  cantidad: number;
  esPrecioAlumno?: boolean;
}

export interface FlyingItem {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  imageUrl: string;
  nombre: string;
  precio: number;
}

export interface ToastData {
  id: string;
  producto: Producto;
  precio: number;
  esAlumno?: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (producto: Producto, esAlumno?: boolean, originCoords?: { x: number; y: number }) => void;
  updateQuantity: (productoId: string, delta: number) => void;
  removeFromCart: (productoId: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  modoAlumno: boolean;
  setModoAlumno: (modo: boolean) => void;
  sedeSeleccionada: SedeId;
  setSedeSeleccionada: (sede: SedeId) => void;
  totalItems: number;
  totalPrice: number;

  // Animaciones y Notificaciones
  isCartBumping: boolean;
  triggerCartBump: () => void;
  flyingItems: FlyingItem[];
  removeFlyingItem: (id: string) => void;
  toastNotification: ToastData | null;
  showToast: (producto: Producto, precio: number, esAlumno?: boolean) => void;
  dismissToast: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'galindo_cart_v1';
const SEDE_STORAGE_KEY = 'galindo_sede_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<SedeId>(DEFAULT_SEDE_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // Estados de animación y notificación
  const [isCartBumping, setIsCartBumping] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [toastNotification, setToastNotification] = useState<ToastData | null>(null);

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      const savedSede = localStorage.getItem(SEDE_STORAGE_KEY) as SedeId | null;
      if (savedSede && (savedSede === 'ica' || savedSede === 'huancayo')) {
        setSedeSeleccionada(savedSede);
      }
    } catch (e) {
      console.error('Error loading cart from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Guardar en localStorage al cambiar
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      localStorage.setItem(SEDE_STORAGE_KEY, sedeSeleccionada);
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }, [cartItems, sedeSeleccionada, isLoaded]);

  const triggerCartBump = () => {
    setIsCartBumping(true);
    setTimeout(() => {
      setIsCartBumping(false);
    }, 600);
  };

  const removeFlyingItem = (id: string) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  };

  const showToast = (producto: Producto, precio: number, esAlumno = false) => {
    setToastNotification({
      id: `${Date.now()}`,
      producto,
      precio,
      esAlumno,
    });
  };

  const dismissToast = () => {
    setToastNotification(null);
  };

  // Auto-dismiss del toast tras 3.5 segundos
  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  const addToCart = (
    producto: Producto,
    _esAlumno?: boolean,
    originCoords?: { x: number; y: number }
  ) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });

    // Iniciar animación Fly-To-Cart si estamos en el navegador
    if (typeof window !== 'undefined') {
      let targetX = window.innerWidth - 60;
      let targetY = 40;
      const targetEl = document.getElementById('navbar-cart-button');
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      const startX = originCoords?.x ?? (window.innerWidth / 2);
      const startY = originCoords?.y ?? (window.innerHeight / 2);

      const precio = producto.precio_oferta || producto.precio_venta;

      const newFlyItem: FlyingItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        startX,
        startY,
        targetX,
        targetY,
        imageUrl: producto.imagenes?.[0] || '/logo.jpg',
        nombre: producto.nombre,
        precio,
      };

      setFlyingItems((prev) => [...prev, newFlyItem]);
    }
  };

  const updateQuantity = (productoId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productoId: string) => {
    setCartItems((prev) => prev.filter((item) => item.producto.id !== productoId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.cantidad, 0);

  const totalPrice = cartItems.reduce((acc, item) => {
    const precio = item.producto.precio_oferta || item.producto.precio_venta;
    return acc + precio * item.cantidad;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartOpen,
        setCartOpen,
        modoAlumno: false,
        setModoAlumno: () => {},
        sedeSeleccionada,
        setSedeSeleccionada,
        totalItems,
        totalPrice,
        isCartBumping,
        triggerCartBump,
        flyingItems,
        removeFlyingItem,
        toastNotification,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
}
