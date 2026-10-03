import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tienda Oficial Barber Supply | Máquinas, Tijeras e Insumos',
  description:
    'Catálogo oficial de herramientas de barbería en Ica y Huancayo. Máquinas Wahl, BaBylissPRO, patilleras, tijeras profesionales y kits para estudiantes.',
  alternates: {
    canonical: 'https://galindobarber.pe/tienda',
  },
  openGraph: {
    title: 'Tienda Oficial Barber Supply | Galindo Barber',
    description:
      'Compra máquinas originales Wahl, BaBylissPRO y accesorios de barbería con recojo express en tienda física de Ica y Huancayo.',
    url: 'https://galindobarber.pe/tienda',
  },
};

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
