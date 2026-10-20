// Test de verificación lógica para Pagos Cruzados / Mixtos
import assert from 'node:assert';

function parseDesglosePagoCruzado(notas, total = 0) {
  if (!notas) {
    return { efectivo: total / 2, digital: total / 2, canalDigital: 'YAPE' };
  }

  // 1. Extraer Efectivo
  const mEfec = notas.match(/S\/\.?\s*([\d,.]+)\s*(?:Efectivo|efectivo|en caja)/i);
  // 2. Extraer Digital
  const mDig =
    notas.match(/\+\s*S\/\.?\s*([\d,.]+)\s*(?:por|vía|via)?\s*([A-Za-z]+)?/i) ||
    notas.match(/S\/\.?\s*([\d,.]+)\s*(?:por|vía|via)\s*([A-Za-z]+)/i);

  let efectivo = mEfec ? parseFloat(mEfec[1].replace(',', '')) : 0;
  let digital = mDig ? parseFloat(mDig[1].replace(',', '')) : 0;

  // Canal digital
  let canalDigital = 'YAPE';
  if (/plin/i.test(notas)) canalDigital = 'PLIN';
  else if (/tarjeta/i.test(notas)) canalDigital = 'TARJETA';
  else if (/transferencia/i.test(notas)) canalDigital = 'TRANSFERENCIA';
  else if (/yape/i.test(notas)) canalDigital = 'YAPE';

  if (efectivo > 0 && digital === 0 && total > efectivo) {
    digital = total - efectivo;
  } else if (digital > 0 && efectivo === 0 && total > digital) {
    efectivo = total - digital;
  } else if (efectivo === 0 && digital === 0) {
    efectivo = total / 2;
    digital = total / 2;
  }

  return { efectivo, digital, canalDigital };
}

function normalizarMetodoPago(metodo, notas) {
  if (metodo && typeof metodo === 'string' && metodo.trim()) {
    const m = metodo.trim().toUpperCase();
    if (m === 'YAPE' || m.includes('YAPE')) return 'YAPE';
    if (m === 'PLIN' || m.includes('PLIN')) return 'PLIN';
    if (m === 'TRANSFERENCIA' || m.includes('TRANS') || m.includes('BCP') || m.includes('BBVA')) return 'TRANSFERENCIA';
    if (m === 'TARJETA' || m.includes('TARJETA') || m.includes('POS') || m.includes('CREDITO') || m.includes('DEBITO')) return 'TARJETA';
    if (m === 'MIXTO' || m.includes('MIXTO')) return 'MIXTO';
    if (m === 'EFECTIVO' || m.includes('EFECTIVO')) return 'EFECTIVO';
  }
  if (notas && typeof notas === 'string') {
    const match = notas.match(/\[METODO(?:_PAGO)?:\s*([A-Za-z0-9_]+)\]/i);
    if (match && match[1]) {
      return normalizarMetodoPago(match[1]);
    }
    const up = notas.toUpperCase();
    if (up.includes('PAGO CRUZADO') || up.includes('CRUZADO') || up.includes('MIXTO')) return 'MIXTO';
    if (up.includes('YAPE')) return 'YAPE';
    if (up.includes('PLIN')) return 'PLIN';
    if (up.includes('TRANSFERENCIA') || up.includes('BCP') || up.includes('BBVA')) return 'TRANSFERENCIA';
    if (up.includes('TARJETA') || up.includes('POS')) return 'TARJETA';
  }
  return 'EFECTIVO';
}

console.log('--- INICIANDO TEST SUITE DE PAGOS CRUZADOS ---');

// Test 1: Ticket real de la imagen (#POS-2026-6380)
const notaPOS1 = "Venta Mostrador POS atendida por Caja 1. Pago Cruzado: S/ 10.00 Efectivo + S/ 15.00 por YAPE.";
const res1 = parseDesglosePagoCruzado(notaPOS1, 25.00);
console.log('Test 1 (Ticket #POS-2026-6380):', res1);
assert.strictEqual(res1.efectivo, 10.00, 'Efectivo debe ser 10.00');
assert.strictEqual(res1.digital, 15.00, 'Digital debe ser 15.00');
assert.strictEqual(res1.canalDigital, 'YAPE', 'Canal debe ser YAPE');

// Test 2: Pago Cruzado con Plin
const notaPOS2 = "Venta Mostrador POS. Pago Cruzado: S/ 30.50 Efectivo + S/ 20.00 por PLIN.";
const res2 = parseDesglosePagoCruzado(notaPOS2, 50.50);
console.log('Test 2 (Plin):', res2);
assert.strictEqual(res2.efectivo, 30.50);
assert.strictEqual(res2.digital, 20.00);
assert.strictEqual(res2.canalDigital, 'PLIN');

// Test 3: Pago Cruzado con Tarjeta
const notaPOS3 = "Pago Cruzado: S/ 100.00 Efectivo + S/ 250.00 por TARJETA.";
const res3 = parseDesglosePagoCruzado(notaPOS3, 350.00);
console.log('Test 3 (Tarjeta):', res3);
assert.strictEqual(res3.efectivo, 100.00);
assert.strictEqual(res3.digital, 250.00);
assert.strictEqual(res3.canalDigital, 'TARJETA');

// Test 4: Web Checkout
const notaWeb = "[Pago Cruzado Web: S/ 45.00 Efectivo en caja + S/ 55.00 vía TRANSFERENCIA]";
const res4 = parseDesglosePagoCruzado(notaWeb, 100.00);
console.log('Test 4 (Web Transferencia):', res4);
assert.strictEqual(res4.efectivo, 45.00);
assert.strictEqual(res4.digital, 55.00);
assert.strictEqual(res4.canalDigital, 'TRANSFERENCIA');

// Test 5: Normalizar método desde notas con Pago Cruzado
const norm1 = normalizarMetodoPago(null, notaPOS1);
console.log('Test 5 (Normalizar desde notas con Yape):', norm1);
assert.strictEqual(norm1, 'MIXTO', 'Debe normalizarse como MIXTO y no ser confundido con YAPE directo');

// Test 6: Suma exacta arqueo
const ventas = [
  { total: 25.00, notas: notaPOS1, metodo: 'MIXTO' },
  { total: 50.50, notas: notaPOS2, metodo: 'MIXTO' },
  { total: 40.00, notas: null, metodo: 'EFECTIVO' },
  { total: 60.00, notas: null, metodo: 'YAPE' },
];

let totalEfectivoCaja = 0;
let totalDigital = 0;

ventas.forEach(v => {
  if (v.metodo === 'EFECTIVO') {
    totalEfectivoCaja += v.total;
  } else if (v.metodo === 'MIXTO') {
    const d = parseDesglosePagoCruzado(v.notas, v.total);
    totalEfectivoCaja += d.efectivo;
    totalDigital += d.digital;
  } else {
    totalDigital += v.total;
  }
});

console.log('Test 6 (Arqueo Total):', {
  totalEfectivoEsperadoEnGaveta: totalEfectivoCaja,
  totalDigitalEsperado: totalDigital,
  granTotal: totalEfectivoCaja + totalDigital
});

assert.strictEqual(totalEfectivoCaja, 10.00 + 30.50 + 40.00, 'Efectivo exacto en gaveta');
assert.strictEqual(totalDigital, 15.00 + 20.00 + 60.00, 'Digital exacto');
assert.strictEqual(totalEfectivoCaja + totalDigital, 175.50, 'Gran total exacto');

console.log('✅ TODOS LOS TESTS LÓGICOS DE PAGOS CRUZADOS PASARON SATISFACTORIAMENTE.');
