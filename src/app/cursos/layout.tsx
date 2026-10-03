import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cursos y Academia de Barbería Profesional | Matrículas Abiertas',
  description:
    'Aprende el arte del fade, corte a tijera y visagismo capilar en Galindo Barber Academy. Clases prácticas presenciales en Ica y Huancayo con certificación técnica.',
  alternates: {
    canonical: 'https://galindobarber.pe/cursos',
  },
  openGraph: {
    title: 'Cursos de Barbería Profesional | Galindo Barber Academy',
    description:
      'Formación técnica intensiva con modelos reales y docentes especializados. Matrículas disponibles para sedes Ica y Huancayo.',
    url: 'https://galindobarber.pe/cursos',
  },
};

export default function CursosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
