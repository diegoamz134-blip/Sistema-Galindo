'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Producto } from '@/types/database';
import { SedeId, DEFAULT_SEDE_ID } from '@/lib/constants';

export interface CartItem {
  producto: Producto;
  cantidad: number;
  esPrecioAlumno?: boolean;
  tipo?: 'producto' | 'matricula';
  matriculaMetadata?: {
    cursoId: string;
    cursoNombre: string;
    turno: 'MANANA' | 'TARDE' | 'NOCHE' | 'SABATINO';
    sede: string;
    costoMatricula: number;
    totalCurso: number;
  };
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
  addToCart: (
    producto: Producto,
    esAlumno?: boolean,
    originCoords?: { x: number; y: number },
    matriculaMetadata?: CartItem['matriculaMetadata'],
    tipo?: 'producto' | 'matricula'
  ) => void;
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

  // Transición Animada de Sede y Modal de Bienvenida
  isTransitioningSede: boolean;
  targetSede: SedeId | null;
  transitionMessage: string;
  isWelcomeModalOpen: boolean;
  setIsWelcomeModalOpen: (open: boolean) => void;
  openWelcomeModal: () => void;
  seleccionarSedeBienvenida: (sede: SedeId, recordar?: boolean) => void;

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
const SEDE_PROMPTED_KEY = 'galindo_sede_welcome_prompted_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sedeSeleccionada, setSedeSeleccionadaState] = useState<SedeId>(DEFAULT_SEDE_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // Estados de Transición y Bienvenida de Sedes
  const [isTransitioningSede, setIsTransitioningSede] = useState(false);
  const [targetSede, setTargetSede] = useState<SedeId | null>(null);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  // Estados de animación y notificación
  const [isCartBumping, setIsCartBumping] = useState(false);
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);
  const [toastNotification, setToastNotification] = useState<ToastData | null>(null);

  // Cargar desde localStorage y verificar si se debe mostrar modal de bienvenida
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      const savedSede = localStorage.getItem(SEDE_STORAGE_KEY) as SedeId | null;
      if (savedSede && (savedSede === 'ica' || savedSede === 'huancayo')) {
        setSedeSeleccionadaState(savedSede);
      }

      // Comprobar si ya se seleccionó sede en esta sesión de navegación
      const alreadyPrompted = sessionStorage.getItem(SEDE_PROMPTED_KEY);
      if (!alreadyPrompted) {
        // Mostrar modal inicial estilo licorería para seleccionar sede
        setIsWelcomeModalOpen(true);
      }
    } catch (e) {
      console.error('Error loading cart/sede from storage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Función para ejecutar cambio animado de sede con subpantalla de carga
  const triggerSedeTransition = (nuevaSede: SedeId, customMsg?: string) => {
    setTargetSede(nuevaSede);
    setTransitionMessage(
      customMsg || (nuevaSede === 'huancayo' ? 'Cambiando a Sede Huancayo...' : 'Cambiando a Sede Ica...')
    );
    setIsTransitioningSede(true);

    // A los 450ms se aplica el cambio real de estado y almacenamiento
    setTimeout(() => {
      setSedeSeleccionadaState(nuevaSede);
      try {
        localStorage.setItem(SEDE_STORAGE_KEY, nuevaSede);
      } catch {}
    }, 450);

    // A los 880ms se retira la subpantalla suavemente
    setTimeout(() => {
      setIsTransitioningSede(false);
      setTargetSede(null);
    }, 880);
  };

  const setSedeSeleccionada = (nuevaSede: SedeId) => {
    if (nuevaSede === sedeSeleccionada && !isWelcomeModalOpen) return;
    triggerSedeTransition(nuevaSede);
  };

  const seleccionarSedeBienvenida = (nuevaSede: SedeId, recordar: boolean = true) => {
    try {
      sessionStorage.setItem(SEDE_PROMPTED_KEY, 'true');
      if (recordar) {
        localStorage.setItem(SEDE_STORAGE_KEY, nuevaSede);
      }
    } catch {}
    setIsWelcomeModalOpen(false);
    triggerSedeTransition(
      nuevaSede,
      `Bienvenido • Conectando con Sede ${nuevaSede === 'huancayo' ? 'Huancayo' : 'Ica'}...`
    );
  };

  const openWelcomeModal = () => {
    setIsWelcomeModalOpen(true);
  };

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
    originCoords?: { x: number; y: number },
    matriculaMetadata?: CartItem['matriculaMetadata'],
    tipo?: 'producto' | 'matricula'
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
      return [
        ...prev,
        {
          producto,
          cantidad: 1,
          tipo: tipo || (matriculaMetadata ? 'matricula' : 'producto'),
          matriculaMetadata,
        },
      ];
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
        isTransitioningSede,
        targetSede,
        transitionMessage,
        isWelcomeModalOpen,
        setIsWelcomeModalOpen,
        openWelcomeModal,
        seleccionarSedeBienvenida,
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
