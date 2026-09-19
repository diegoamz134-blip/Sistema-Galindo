// ==========================================
// UTILIDADES GENERALES - SISTEMA GALINDO
// ==========================================

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
];

const DIAS_SEMANA = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Formatea un número como moneda peruana (PEN / Soles) de forma determinista
 * Ej: formatCurrency(120.5) => "S/ 120.50"
 */
export function formatCurrency(amount: number): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `S/ ${safeAmount.toFixed(2)}`;
}

/**
 * Formatea una fecha de manera determinista (sin discrepancias de locale entre servidor y navegador)
 * Ej: "16 Set 2026"
 */
export function formatDate(dateString: string | Date): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate().toString().padStart(2, '0');
  const month = MESES[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formatea fecha y hora determinista: "DD/MM/YYYY HH:mm"
 * Ej: "16/09/2026 10:15"
 */
export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '-';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Retorna la fecha actual en texto en español de manera determinista
 */
export function getFormattedCurrentDate(d: Date = new Date()): string {
  const diaSemana = DIAS_SEMANA[d.getDay()];
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  return `${diaSemana}, ${dia} ${mes} ${anio}`;
}

/**
 * Genera un enlace directo a WhatsApp con mensaje codificado
 */
export function generateWhatsAppLink(
  phoneNumber: string,
  message: string
): string {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
}

/**
 * Genera un código legible de pedido o matrícula
 */
export function generateCode(prefix: 'GAL' | 'MAT' | 'CAJ' | 'REC' | 'POS'): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomNum}`;
}

/**
 * Convierte un texto a slug para URLs limpias
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
}

/**
 * Clase auxiliar para concatenar clases CSS condicionales (Tailwind)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
