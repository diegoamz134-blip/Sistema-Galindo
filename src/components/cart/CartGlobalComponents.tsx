'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FlyToCartOverlay } from './FlyToCartOverlay';
import { CartToastNotification } from './CartToastNotification';
import { WelcomeSedeModal } from '@/components/sede/WelcomeSedeModal';
import { SedeTransitionOverlay } from '@/components/sede/SedeTransitionOverlay';
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner';
import { FloatingWhatsAppButton } from '@/components/common/FloatingWhatsAppButton';

export function CartGlobalComponents() {
  const pathname = usePathname();

  // No renderizar overlays ni banners de la tienda pública dentro del panel administrativo
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <FlyToCartOverlay />
      <CartToastNotification />
      <WelcomeSedeModal />
      <SedeTransitionOverlay />
      <CookieConsentBanner />
      <FloatingWhatsAppButton />
    </>
  );
}

