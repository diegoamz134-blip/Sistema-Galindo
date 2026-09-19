'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, signIn, userMeta } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [status, setStatus] = useState<'idle' | 'loading' | 'verified' | 'welcome'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Si el usuario ya cuenta con sesión y está en reposo, redirigir automáticamente
  useEffect(() => {
    if (user && !isAuthLoading && status === 'idle') {
      router.replace('/admin');
    }
  }, [user, isAuthLoading, router, status]);

  // Saludo dinámico según la hora del día (Mañana, Tarde, Noche)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '¡Buenos días';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  // Formatear nombre del usuario
  const rawName =
    userMeta.nombre && userMeta.nombre !== 'Administrador'
      ? userMeta.nombre
      : email
      ? email.split('@')[0]
      : 'Administrador';

  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Manejador del Login con validación personalizada animada
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'idle') return;

    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);

    let hasValidationError = false;
    const trimmedEmail = email.trim();

    // Validación de Correo Electrónico
    if (!trimmedEmail) {
      setEmailError('Ingresa tu correo electrónico');
      hasValidationError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Ingresa un correo electrónico válido (ej: usuario@galindobarber.pe)');
      hasValidationError = true;
    }

    // Validación de Contraseña
    if (!password) {
      setPasswordError('Ingresa tu contraseña de acceso');
      hasValidationError = true;
    }

    if (hasValidationError) {
      setShakeKey((prev) => prev + 1);
      return;
    }

    setStatus('loading');

    const result = await signIn(email, password);

    if (result.success) {
      // 1. El botón se pone en verde con "Acceso Verificado ✓" (~900ms)
      setStatus('verified');

      setTimeout(() => {
        // 2. Se muestra la pantalla completa de bienvenida (~1.5s)
        setStatus('welcome');

        setTimeout(() => {
          // 3. Ingreso fluido al panel administrativo
          router.push('/admin');
        }, 1500);
      }, 900);
    } else {
      setStatus('idle');
      setShakeKey((prev) => prev + 1);
      setErrorMessage(result.error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-white flex flex-col justify-between selection:bg-white selection:text-black">
      
      {/* Fondo Panorámico con textura sutil */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/banner.png')" }}
      />
      
      {/* Gradientes radiales de ambiente de lujo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 rounded-full bg-zinc-700/20 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Top Bar: Regresar a la Tienda Pública */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/10 bg-zinc-950/40 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-white transition-colors group"
        >
          <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            ←
          </span>
          <span className="font-medium hidden sm:inline">Volver a la Tienda & Cursos</span>
          <span className="font-medium sm:hidden">Volver</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Panel Administrativo Seguro</span>
        </div>
      </header>

      {/* Centro: Formulario de Login */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md space-y-4"
        >
          {/* Tarjeta Principal */}
          <div className="rounded-3xl bg-zinc-900/85 border border-white/10 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Cinta superior barber */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-700 via-white to-zinc-700 opacity-60" />

            {/* Cabecera del Formulario con Logo Oficial */}
            <div className="text-center space-y-3 pt-1">
              <div className="relative inline-block">
                <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-white/30 shadow-xl bg-white">
                  <img
                    src="/logo.jpg"
                    alt="Galindo Barber"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center text-[10px] text-white">
                  ✓
                </span>
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  Galindo Barber
                </h1>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                  Panel de Control Administrativo
                </p>
              </div>
            </div>

            {/* Alerta de Error General (Autenticación rechazada) */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  key="general-error"
                  initial={{ opacity: 0, height: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0, y: -10, scale: 0.95 }}
                  className="rounded-2xl p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 shadow-lg shadow-rose-950/40"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-rose-200 text-xs tracking-wide">Acceso Denegado</p>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario */}
            <form noValidate onSubmit={handleLogin} className="space-y-4">
              
              {/* Campo Usuario / Email */}
              <motion.div
                key={`email-${shakeKey}`}
                animate={emailError ? { x: [0, -7, 7, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="space-y-1.5"
              >
                <label className="text-xs font-semibold text-zinc-300 block">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                      emailError ? 'text-rose-400' : 'text-zinc-500'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="admin@galindobarber.pe"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950/60 border text-xs sm:text-sm text-white placeholder-zinc-500 transition-all font-mono focus:outline-hidden ${
                      emailError
                        ? 'border-rose-500/70 ring-2 ring-rose-500/20 bg-rose-500/5'
                        : 'border-white/10 focus:border-white'
                    }`}
                  />
                </div>

                {/* Mensaje de Error Animado debajo del campo */}
                <AnimatePresence>
                  {emailError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{emailError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Campo Contraseña */}
              <motion.div
                key={`password-${shakeKey}`}
                animate={passwordError ? { x: [0, -7, 7, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="space-y-1.5"
              >
                <label className="text-xs font-semibold text-zinc-300 block">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                      passwordError ? 'text-rose-400' : 'text-zinc-500'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-950/60 border text-xs sm:text-sm text-white placeholder-zinc-500 transition-all font-mono focus:outline-hidden ${
                      passwordError
                        ? 'border-rose-500/70 ring-2 ring-rose-500/20 bg-rose-500/5'
                        : 'border-white/10 focus:border-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                    aria-label="Alternar visibilidad de contraseña"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Mensaje de Error Animado debajo del campo */}
                <AnimatePresence>
                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -4, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Checkbox Recordar Sesión */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-black focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                  />
                  <span>Mantener sesión iniciada</span>
                </label>
              </div>

              {/* Botón de Ingreso con cambio de estado */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status !== 'idle'}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    status === 'verified'
                      ? 'bg-emerald-600 text-white shadow-emerald-950/60 scale-[1.01]'
                      : status === 'loading'
                      ? 'bg-zinc-700 text-zinc-300 cursor-wait'
                      : 'bg-white text-zinc-950 hover:bg-zinc-100 active:scale-[0.98]'
                  }`}
                >
                  {status === 'loading' && (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-white animate-spin" />
                      <span>Verificando credenciales...</span>
                    </>
                  )}

                  {status === 'verified' && (
                    <>
                      <Check className="w-4 h-4 text-white animate-bounce" />
                      <span>Acceso Verificado</span>
                    </>
                  )}

                  {status === 'idle' && (
                    <>
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>

        </motion.div>
      </main>

      {/* Footer del Login */}
      <footer className="relative z-10 w-full py-4 px-6 text-center text-[11px] text-zinc-600 border-t border-white/5 bg-zinc-950/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          © 2026 Galindo Barber Academy & Supply • Todos los derechos reservados.
        </span>
        <div className="flex items-center gap-4 text-zinc-500 font-mono">
          <span>Sistema Administrativo</span>
        </div>
      </footer>

      {/* Pantalla Completa de Bienvenida (Welcome Splash Overlay) */}
      <AnimatePresence>
        {status === 'welcome' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-2xl flex flex-col items-center justify-center px-6 text-white"
          >
            {/* Resplandor radial de fondo */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-600/15 blur-[140px] pointer-events-none" />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center space-y-6 max-w-sm w-full relative z-10"
            >
              {/* Logo con aureola animada */}
              <div className="relative inline-block">
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-white p-1">
                  <img
                    src="/logo.jpg"
                    alt="Galindo Barber"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute -inset-2 rounded-full border border-emerald-500/30 animate-ping pointer-events-none" />
                <span className="absolute bottom-0 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-xs text-white shadow-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Textos de Bienvenida con saludo según hora del día */}
              <div className="space-y-2">
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium tracking-wide uppercase"
                >
                  Acceso Concedido
                </motion.span>

                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white"
                >
                  {getGreeting()}, {displayName}!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-xs text-zinc-400 font-mono"
                >
                  Panel de Control Administrativo
                </motion.p>
              </div>

              {/* Barra de Progreso Fluida (1.5 segundos) */}
              <div className="space-y-2 pt-2">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/50"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono animate-pulse">
                  Cargando panel administrativo y módulos...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
