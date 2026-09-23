'use client';

import React from 'react';
import { X, Printer, CheckCircle, MessageCircle, Calendar } from 'lucide-react';
import { MatriculaConDetalle } from '@/lib/academia-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BUSINESS_INFO } from '@/lib/constants';

interface ReciboMatriculaTicketProps {
  isOpen: boolean;
  onClose: () => void;
  matricula: MatriculaConDetalle;
}

export function ReciboMatriculaTicket({
  isOpen,
  onClose,
  matricula,
}: ReciboMatriculaTicketProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const pagadoMatricula = Number(matricula.monto_matricula_pagado) || 0;
  const cuotasPagadas = (matricula.cuotas || [])
    .filter((c) => c.estado === 'PAGADA')
    .reduce((acc, c) => acc + (Number(c.monto) || 0), 0);
  const totalAbonado = pagadoMatricula + cuotasPagadas;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Barra superior de herramientas */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Comprobante Oficial de Matrícula
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px] font-semibold px-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voucher Imprimible */}
        <div id="voucher-matricula" className="p-6 space-y-4 text-xs font-mono text-zinc-900 bg-white">
          
          {/* Logo y Encabezado */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-300">
            <div className="w-12 h-12 rounded-full overflow-hidden mx-auto border border-zinc-200 mb-1">
              <img src="/logo.jpg" alt="Logo Galindo" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-bold text-sm uppercase tracking-wider">
              Galindo Barber Academy
            </h2>
            <p className="text-[10px] text-zinc-500">
              {matricula.sede}
            </p>
            <p className="text-[10px] text-zinc-500">
              WhatsApp Oficial: {BUSINESS_INFO.whatsappDisplay}
            </p>
          </div>

          {/* Código y Fechas */}
          <div className="space-y-1 pb-2 border-b border-dashed border-zinc-200 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">N° MATRÍCULA:</span>
              <span className="font-bold">{matricula.codigo_matricula}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">FECHA REGISTRO:</span>
              <span>{formatDate(matricula.fecha_matricula)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">INICIO CLASES:</span>
              <span className="font-semibold">{formatDate(matricula.fecha_inicio || matricula.fecha_matricula)}</span>
            </div>
          </div>

          {/* Datos del Alumno */}
          <div className="space-y-1 pb-2 border-b border-dashed border-zinc-200 text-[11px]">
            <div className="text-zinc-500 uppercase text-[10px] font-bold">Datos del Estudiante</div>
            <div className="font-bold text-xs">
              {matricula.alumno.nombres} {matricula.alumno.apellidos}
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>DNI: {matricula.alumno.dni}</span>
              <span>CEL: {matricula.alumno.celular}</span>
            </div>
          </div>

          {/* Datos Académicos */}
          <div className="space-y-1 pb-2 border-b border-dashed border-zinc-200 text-[11px]">
            <div className="text-zinc-500 uppercase text-[10px] font-bold">Detalle Académico</div>
            <div className="font-semibold">
              {matricula.curso_nombre || matricula.curso?.titulo}
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Turno: {matricula.turno}</span>
              <span>Kit: {matricula.kit_entregado ? 'ENTREGADO' : 'PENDIENTE'}</span>
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-300 text-[11px]">
            <div className="flex justify-between text-zinc-600">
              <span>Costo Total del Curso:</span>
              <span>{formatCurrency(matricula.total_curso)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Matrícula Inicial:</span>
              <span>{formatCurrency(matricula.monto_matricula_pagado)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-700">
              <span>Total Abonado a la Fecha:</span>
              <span>{formatCurrency(totalAbonado)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-zinc-200 pt-1 text-zinc-950">
              <span>SALDO PENDIENTE:</span>
              <span>{formatCurrency(matricula.saldo_pendiente)}</span>
            </div>
          </div>

          {/* Cronograma de Cuotas */}
          {matricula.cuotas && matricula.cuotas.length > 0 && (
            <div className="space-y-1.5 pb-3 border-b border-dashed border-zinc-300 text-[10px]">
              <div className="text-zinc-500 uppercase font-bold text-[10px]">
                Cronograma de Cuotas Restantes
              </div>
              <div className="space-y-1">
                {matricula.cuotas.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-zinc-700">
                    <span>Cuota #{c.numero_cuota} ({formatDate(c.fecha_vencimiento)}):</span>
                    <span className={`font-bold ${c.estado === 'PAGADA' ? 'text-emerald-600' : 'text-zinc-950'}`}>
                      {formatCurrency(c.monto)} - {c.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pie del ticket */}
          <div className="text-center text-[10px] text-zinc-400 pt-2 space-y-1">
            <p>¡Gracias por ser parte de la familia Galindo!</p>
            <p className="text-[9px]">Conserva este comprobante para ingresar a clases.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
