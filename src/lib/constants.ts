// ==========================================
// CONSTANTES DE NEGOCIO Y SEDES - SISTEMA GALINDO
// ==========================================

export type SedeId = 'ica' | 'huancayo';

export interface SedeInfo {
  id: SedeId;
  nombre: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  direccionCompleta: string;
  telefono: string;
  whatsapp: string;
  whatsappDisplay: string;
  horario: string;
  referencia: string;
  mapsUrl: string;
}

export const SEDES: Record<SedeId, SedeInfo> = {
  ica: {
    id: 'ica',
    nombre: 'Sede Ica',
    ciudad: 'Ica',
    departamento: 'Ica',
    direccion: 'Calle Bolívar 536',
    direccionCompleta: 'Calle Bolívar 536, Centro de Ica, Perú',
    telefono: '914614424',
    whatsapp: '51914614424',
    whatsappDisplay: '+51 914 614 424',
    horario: 'Lunes a Sábado: 9:00 AM - 8:00 PM',
    referencia: 'Calle Bolívar 536, Centro Histórico de Ica',
    mapsUrl: 'https://maps.google.com/?q=Calle+Bolivar+536+Ica+Peru',
  },
  huancayo: {
    id: 'huancayo',
    nombre: 'Sede Huancayo',
    ciudad: 'Huancayo',
    departamento: 'Junín',
    direccion: 'Jr. Guido 654',
    direccionCompleta: 'Jr. Guido 654, Huancayo, Junín, Perú',
    telefono: '967577215',
    whatsapp: '51967577215',
    whatsappDisplay: '+51 967 577 215',
    horario: 'Lunes a Sábado: 9:00 AM - 8:00 PM',
    referencia: 'Jr. Guido 654, Huancayo',
    mapsUrl: 'https://maps.google.com/?q=Jr.+Guido+654+Huancayo+Peru',
  },
};

export const DEFAULT_SEDE_ID: SedeId = 'ica';

export const BUSINESS_INFO = {
  name: 'Galindo Barber Academy & Supply',
  shortName: 'Galindo Barber',
  city: 'Ica & Huancayo, Perú',
  address: 'Sede Ica: Calle Bolívar 536 | Sede Huancayo: Jr. Guido 654',
  whatsapp: '51914614424',
  whatsappDisplay: '+51 914 614 424',
  email: 'contacto@galindobarber.pe',
  openingHours: 'Lunes a Sábado: 9:00 AM - 8:00 PM',
  // Medios de Pago Oficiales de la Tienda (Stand Mostrador)
  yapeNumber: '972799397',
  yapeHolder: 'GALINDO BARBERS E.I.R.L.',
  bcpAccount: '3807019622054',
  bcpAccountFormatted: '380-7019622054',
  bcpCci: '002-380-007-019-622-054-48',
  bcpHolder: 'GALINDO BARBERS E.I.R.L.',
  instagram: '@galindo.barbershop',
  facebook: 'Galindo Barber Academy',
};

export const METODOS_PAGO_LABELS: Record<string, { label: string; color: string }> = {
  YAPE: { label: 'Yape', color: 'bg-purple-600 text-white' },
  PLIN: { label: 'Plin', color: 'bg-cyan-600 text-white' },
  EFECTIVO: { label: 'Efectivo', color: 'bg-emerald-600 text-white' },
  TRANSFERENCIA: { label: 'Transferencia BCP', color: 'bg-blue-600 text-white' },
  MIXTO: { label: 'Pago Cruzado (Efectivo + Yape)', color: 'bg-indigo-600 text-white' },
  TARJETA: { label: 'Tarjeta Débito/Crédito', color: 'bg-amber-600 text-white' },
};

export const ESTADOS_MATRICULA_LABELS: Record<string, { label: string; badgeColor: string }> = {
  MATRICULADO: { label: 'Matriculado', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  EN_CURSO: { label: 'En Curso', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  EGRESADO: { label: 'Egresado', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  RETIRADO: { label: 'Retirado', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  SUSPENDIDO: { label: 'Suspendido', badgeColor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

export const ESTADOS_CUOTA_LABELS: Record<string, { label: string; badgeColor: string }> = {
  PENDIENTE: { label: 'Por Vencer', badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  PAGADA: { label: 'Pagada', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  VENCIDA: { label: 'Vencida / Moroso', badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  CONDONADA: { label: 'Condonada', badgeColor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

export const TURNOS_CURSO_LABELS: Record<string, string> = {
  MANANA: 'Mañana (9:00 AM - 12:00 PM)',
  TARDE: 'Tarde (3:00 PM - 6:00 PM)',
  NOCHE: 'Noche (6:30 PM - 9:30 PM)',
  SABATINO: 'Sábados Intensivo (9:00 AM - 2:00 PM)',
  DOMINICAL: 'Domingos Intensivo (9:00 AM - 2:00 PM)',
};
