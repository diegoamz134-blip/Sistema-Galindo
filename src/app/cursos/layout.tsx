import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cursos de Barbería Profesional y Certificación Técnica | Galindo Barber Academy',
  description:
    'Aprende la profesión de Barbero Profesional: técnicas de corte fade, tijera, visagismo capilar, barboterapia y colorimetría en Ica y Huancayo. Clases 100% prácticas con modelos reales y certificación técnica oficial.',
  keywords: [
    'carrera de barbero',
    'curso de barberia profesional',
    'profesion de barbero',
    'academia de barberia Ica',
    'academia de barberia Huancayo',
    'clases de corte de cabello hombre',
    'tecnicas de fade degradado',
    'visagismo masculino',
    'corte a tijera profesional',
    'colorimetria barberia',
    'barboterapia y afeitado tradicional',
    'certificacion de barbero',
    'escuela de barberos peru',
    'matriculas academia barberia',
  ],
  alternates: {
    canonical: 'https://galindobarber.com/cursos',
  },
  openGraph: {
    title: 'Cursos de Barbería Profesional | Galindo Barber Academy',
    description:
      'Formación técnica intensiva con modelos reales, horarios flexibles y docentes especializados en Ica y Huancayo.',
    url: 'https://galindobarber.com/cursos',
    images: [
      {
        url: '/baner.webp',
        width: 1200,
        height: 630,
        alt: 'Cursos de Barbería Profesional - Galindo Barber Academy',
      },
    ],
  },
};

export default function CursosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
