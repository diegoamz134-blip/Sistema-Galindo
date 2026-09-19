'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MOCK_MATRICULAS, MOCK_CURSOS } from '@/lib/mock-data';
import { Matricula } from '@/types/database';

export default function AdminMatriculasPage() {
  const [matriculas, setMatriculas] = useState<Matricula[]>(MOCK_MATRICULAS);
  const [busqueda, setBusqueda] = useState('');
  const [showModalNueva, setShowModalNueva] = useState(false);

  // Formulario
  const [dni, setDni] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('');
  const [cursoId, setCursoId] = useState(MOCK_CURSOS[0].id);
  const [montoMatricula, setMontoMatricula] = useState('80');

  const handleCrearMatricula = (e: React.FormEvent) => {
    e.preventDefault();
    const cursoSeleccionado = MOCK_CURSOS.find((c) => c.id === cursoId);

    const nuevaMat: Matricula = {
      id: `mat-${Date.now()}`,
      codigo_matricula: `MAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      alumno_id: `alum-${Date.now()}`,
      alumno: {
        id: `alum-${Date.now()}`,
        dni,
        nombres,
        apellidos,
        celular,
        distrito: 'Ica Centro',
        creado_en: new Date().toISOString(),
      },
      curso_id: cursoId,
      curso: cursoSeleccionado,
      horario_id: 'hor-default',
      fecha_matricula: new Date().toISOString().split('T')[0],
      estado: 'EN_CURSO',
      monto_matricula_pagado: parseFloat(montoMatricula) || 0,
      total_curso: cursoSeleccionado?.costo_total_contado || 750,
      saldo_pendiente: (cursoSeleccionado?.costo_total_contado || 750) - (parseFloat(montoMatricula) || 0),
      kit_entregado: false,
      cuotas: [
        {
          id: `cuota-${Date.now()}-1`,
          matricula_id: `mat-${Date.now()}`,
          numero_cuota: 1,
          monto: 250,
          fecha_vencimiento: '2026-10-01',
          estado: 'PENDIENTE',
        },
      ],
    };

    setMatriculas([nuevaMat, ...matriculas]);
    setShowModalNueva(false);
    setDni('');
    setNombres('');
    setApellidos('');
    setCelular('');
  };

  const matriculasFiltradas = matriculas.filter((m) => {
    const nombreCompleto = `${m.alumno?.nombres} ${m.alumno?.apellidos}`.toLowerCase();
    return (
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      m.alumno?.dni.includes(busqueda) ||
      m.codigo_matricula.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
            Control de Alumnos & Matrículas
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Registro de estudiantes de barbería en Ica, seguimiento de mensualidades y kits.
          </p>
        </div>
        <button
          onClick={() => setShowModalNueva(true)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-zinc-800 shadow-sm transition-colors"
        >
          Nueva Matrícula
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Buscar por DNI, nombres o código de matrícula..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-xs focus:border-black outline-none shadow-sm"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
              <tr>
                <th className="px-5 py-3 font-medium">Alumno / Código</th>
                <th className="px-5 py-3 font-medium">DNI & Celular</th>
                <th className="px-5 py-3 font-medium">Curso</th>
                <th className="px-5 py-3 font-medium">Kit</th>
                <th className="px-5 py-3 font-medium text-right">Saldo Deuda</th>
                <th className="px-5 py-3 font-medium text-center">Estado Cuotas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {matriculasFiltradas.map((m) => {
                const tieneVencida = m.cuotas.some((c) => c.estado === 'VENCIDA');
                return (
                  <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-zinc-900">
                        {m.alumno?.nombres} {m.alumno?.apellidos}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {m.codigo_matricula}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-zinc-600 font-mono space-y-0.5">
                      <p>DNI: {m.alumno?.dni}</p>
                      <p className="text-zinc-500">{m.alumno?.celular}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-zinc-800 font-medium">
                        {m.curso?.titulo}
                      </p>
                      <p suppressHydrationWarning className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Inició: {formatDate(m.fecha_matricula)}
                      </p>
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-500">
                      {m.kit_entregado ? 'Entregado' : 'Pendiente'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-950">
                      {formatCurrency(m.saldo_pendiente)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        tieneVencida ? 'border-zinc-300 bg-zinc-100 text-zinc-950 font-bold' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                      }`}>
                        {tieneVencida ? 'Cuota Vencida' : 'Al Día'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Matrícula */}
      {showModalNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
              Registrar Matrícula
            </h3>

            <form onSubmit={handleCrearMatricula} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    DNI
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="74829103"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    Celular
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="956000000"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombres..."
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Apellidos..."
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                  Curso
                </label>
                <select
                  value={cursoId}
                  onChange={(e) => setCursoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 outline-none focus:border-black"
                >
                  {MOCK_CURSOS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({c.duracion_semanas} semanas — Matrícula S/ {c.costo_matricula})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 uppercase tracking-wider mb-1">
                  Monto Matrícula Pagado Hoy (S/)
                </label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={montoMatricula}
                  onChange={(e) => setMontoMatricula(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 font-mono font-bold outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModalNueva(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-600 hover:text-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-semibold bg-black text-white hover:bg-zinc-800 transition-colors"
                >
                  Confirmar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
