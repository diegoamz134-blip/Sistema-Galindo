'use client';

import React from 'react';
import { FlyToCartOverlay } from './FlyToCartOverlay';
import { CartToastNotification } from './CartToastNotification';
import { WelcomeSedeModal } from '@/components/sede/WelcomeSedeModal';
import { SedeTransitionOverlay } from '@/components/sede/SedeTransitionOverlay';
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner';

export function CartGlobalComponents() {
  return (
    <>
      <FlyToCartOverlay />
      <CartToastNotification />
      <WelcomeSedeModal />
      <SedeTransitionOverlay />
      <CookieConsentBanner />
    </>
  );
}

