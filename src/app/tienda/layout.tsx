import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tienda Barber Supply | Máquinas Wahl, BaBylissPRO y Herramientas de Barbería',
  description:
    'Catálogo oficial de herramientas profesionales para barberos y estilistas en Ica y Huancayo. Máquinas originales Wahl, BaBylissPRO, patilleras, tijeras de filo dulce, navajas y kits para estudiantes.',
  keywords: [
    'tienda de barberia',
    'barber supply peru',
    'maquinas de cortar cabello profesionales',
    'maquinas Wahl originales',
    'distribuidor Wahl Ica',
    'Wahl Magic Clip Cordless',
    'BaBylissPRO Skeleton Trimmer',
    'patilleras profesionales',
    'tijeras de barbero filo dulce',
    'navajas de afeitar clasicas',
    'capas de corte y peines',
    'tienda de barberia Huancayo',
    'insumos para barberos',
  ],
  alternates: {
    canonical: 'https://galindobarber.pe/tienda',
  },
  openGraph: {
    title: 'Tienda Barber Supply | Galindo Barber Academy',
    description:
      'Compra máquinas originales Wahl, BaBylissPRO y herramientas profesionales de barbería con recojo express en tienda física de Ica y Huancayo.',
    url: 'https://galindobarber.pe/tienda',
    images: [
      {
        url: '/baner.webp',
        width: 1200,
        height: 630,
        alt: 'Tienda de Herramientas de Barbería - Galindo Barber Supply',
      },
    ],
  },
};

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
