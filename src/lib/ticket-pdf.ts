import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Genera y descarga un PDF en alta resolución (300 DPI) con el diseño exacto del ticket de mostrador.
 * Utiliza dimensiones proporcionales de 90mm para emular un ticket térmico / móvil oficial.
 */
export async function exportarTicketPDF(elementoId: string, codigoTicket: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const elemento = document.getElementById(elementoId);
  if (!elemento) {
    console.error(`No se encontró el elemento con ID: ${elementoId}`);
    return false;
  }

  try {
    // Captura a 3x para nitidez máxima en tipografía, bordes y código de barras
    const canvas = await html2canvas(elemento, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (element) => {
        // Ignorar elementos interactivos marcados para no salir en el comprobante impreso
        return element.hasAttribute('data-ignore-pdf');
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;

    // Ancho estándar de ticket físico de 90mm, altura proporcional
    const pdfWidthMm = 90;
    const pdfHeightMm = (canvasHeightPx * pdfWidthMm) / canvasWidthPx;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
      compress: true,
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');
    pdf.save(`Ticket-Galindo-${codigoTicket}.pdf`);
    return true;
  } catch (error) {
    console.error('Error al generar PDF del ticket:', error);
    return false;
  }
}

/**
 * Genera un archivo File del PDF del ticket en memoria.
 * Permite compartirlo nativamente en WhatsApp / móviles o subirlo.
 */
export async function generarTicketPDFFile(
  elementoId: string,
  codigoTicket: string
): Promise<File | null> {
  if (typeof window === 'undefined') return null;

  const elemento = document.getElementById(elementoId);
  if (!elemento) {
    console.error(`No se encontró el elemento con ID: ${elementoId}`);
    return null;
  }

  try {
    const canvas = await html2canvas(elemento, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (element) => element.hasAttribute('data-ignore-pdf'),
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;

    const pdfWidthMm = 90;
    const pdfHeightMm = (canvasHeightPx * pdfWidthMm) / canvasWidthPx;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
      compress: true,
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');
    const blob = pdf.output('blob');
    return new File([blob], `Ticket-Galindo-${codigoTicket}.pdf`, {
      type: 'application/pdf',
    });
  } catch (error) {
    console.error('Error al generar File PDF:', error);
    return null;
  }
}

/**
 * Comprueba si el dispositivo soporta compartir archivos nativamente (Android, iPhone, iPad).
 */
export function puedeCompartirArchivosNativo(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false;
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
