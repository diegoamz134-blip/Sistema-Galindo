import React from 'react';
import { AdminLayoutClient } from './AdminLayoutClient';

export const metadata = {
  title: 'Panel Administrativo | Galindo Barber Academy Ica',
  description: 'Control de tienda, inventario, caja chica y matrículas de la escuela de barbería Galindo en Ica.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
