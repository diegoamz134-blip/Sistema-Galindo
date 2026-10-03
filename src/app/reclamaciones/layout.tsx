import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Libro de Reclamaciones Virtual | Galindo Barber Academy & Supply',
  description:
    'Hoja de reclamación oficial virtual de Galindo Barber conforme al D.S. N° 011-2011-PCM e INDECOPI (Perú).',
  alternates: {
    canonical: 'https://galindobarber.pe/reclamaciones',
  },
};

export default function ReclamacionesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
