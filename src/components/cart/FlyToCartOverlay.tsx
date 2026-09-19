'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';

export function FlyToCartOverlay() {
  const { flyingItems, removeFlyingItem, triggerCartBump, showToast } = useCart();

  if (flyingItems.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              left: item.startX,
              top: item.startY,
              x: '-50%',
              y: '-50%',
              scale: 0.9,
              opacity: 1,
            }}
            animate={{
              left: [item.startX, (item.startX + item.targetX) / 2, item.targetX],
              top: [
                item.startY,
                Math.min(item.startY, item.targetY) - 70,
                item.targetY,
              ],
              scale: [0.9, 1.25, 0.25],
              opacity: [1, 1, 0.1],
              rotate: [0, -18, 12, 0],
            }}
            transition={{
              duration: 0.65,
              ease: [0.25, 1, 0.5, 1],
              times: [0, 0.45, 1],
            }}
            onAnimationComplete={() => {
              triggerCartBump();
              showToast(
                {
                  id: item.id,
                  nombre: item.nombre,
                  imagenes: [item.imageUrl],
                } as any,
                item.precio
              );
              removeFlyingItem(item.id);
            }}
            className="fixed pointer-events-none w-14 h-14 rounded-2xl border-2 border-white bg-black shadow-2xl overflow-hidden ring-4 ring-black/20 flex items-center justify-center"
            style={{ willChange: 'transform, left, top, opacity' }}
          >
            <img
              src={item.imageUrl}
              alt={item.nombre}
              className="w-full h-full object-cover"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
