'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
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
        className="fixed bottom-0 inset-x-0 w-full z-[999] bg-white border-t border-zinc-200 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] py-3 px-4 sm:px-8 text-black select-none"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <div className="text-xs text-zinc-900 leading-relaxed">
            <span className="font-black text-black uppercase tracking-tight mr-1">
              Privacidad y Cookies:
            </span>
            <span>
              Utilizamos almacenamiento local técnico únicamente para recordar tu carrito y tu sede de atención (Ica o Huancayo).{' '}
              <b className="font-bold text-black">No utilizamos rastreadores publicitarios de terceros ni comercializamos tus datos personales.</b>{' '}
              Puedes consultar nuestra{' '}
              <Link href="/cookies" className="font-bold underline text-black hover:text-zinc-600">
                Política de Cookies
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="font-bold underline text-black hover:text-zinc-600">
                Política de Privacidad
              </Link>
              .
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleAccept}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm active:scale-95 text-center"
            >
              Entendido
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
