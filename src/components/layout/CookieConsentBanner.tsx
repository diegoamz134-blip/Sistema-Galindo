'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'galindo_cookie_consent_v1';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Mostrar tras 1 segundo de navegación
        const timer = setTimeout(() => setShowBanner(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorar si el storage está restringido
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'all');
      window.dispatchEvent(new Event('galindo_cookie_consent_updated'));
    } catch {}
    setShowBanner(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'essential');
      window.dispatchEvent(new Event('galindo_cookie_consent_updated'));
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Aviso de privacidad y cookies"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-0 inset-x-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] py-3.5 px-4 sm:px-8 text-black select-none"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <div className="flex items-start sm:items-center gap-3 text-xs text-zinc-800 leading-relaxed">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-black mt-0.5 sm:mt-0">
              <Cookie className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="font-bold text-black uppercase tracking-tight mr-1">
                Privacidad y Cookies:
              </span>
              <span>
                Utilizamos cookies y almacenamiento local para recordar tu sede (Ica o Huancayo), gestionar tu carrito de compras y optimizar la velocidad del sitio. Puedes consultar nuestra{' '}
                <Link href="/cookies" className="font-semibold underline text-black hover:text-zinc-600">
                  Política de Cookies
                </Link>{' '}
                y{' '}
                <Link href="/privacidad" className="font-semibold underline text-black hover:text-zinc-600">
                  Política de Privacidad
                </Link>.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleAcceptEssential}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Solo Esenciales
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-5 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              Aceptar Todas
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

