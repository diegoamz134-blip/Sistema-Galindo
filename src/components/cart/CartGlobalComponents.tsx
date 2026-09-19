'use client';

import React from 'react';
import { FlyToCartOverlay } from './FlyToCartOverlay';
import { CartToastNotification } from './CartToastNotification';

export function CartGlobalComponents() {
  return (
    <>
      <FlyToCartOverlay />
      <CartToastNotification />
    </>
  );
}
