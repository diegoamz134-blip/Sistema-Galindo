import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Caja y Confirmación de Pedido | Galindo Barber',
  description:
    'Finaliza tu pedido o reserva de herramientas y cursos con recojo en tienda física y pagos vía Yape, Plin o Efectivo.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
