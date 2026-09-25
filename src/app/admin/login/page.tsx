'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldAlert,
  Clock,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Configuración de Seguridad y Límites OWASP
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60;
const ATTEMPT_STORAGE_KEY = 'galindo_sec_failed_attempts';
const LOCKOUT_STORAGE_KEY = 'galindo_sec_lockout_until';
const MAX_EMAIL_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 6;
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, signIn, userMeta } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [status, setStatus] = useState<'idle' | 'loading' | 'verified' | 'welcome'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'network' | 'rate-limit'>('auth');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Estados de control de fuerza bruta
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Sincronización de seguridad con sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLockoutStatus = () => {
      try {
        const storedLockout = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
        const storedAttempts = parseInt(sessionStorage.getItem(ATTEMPT_STORAGE_KEY) || '0', 10);
        setFailedAttempts(storedAttempts);

        if (storedLockout) {
          const lockoutTimestamp = parseInt(storedLockout, 10);
          const now = Date.now();
          if (lockoutTimestamp > now) {
            setLockoutRemaining(Math.ceil((lockoutTimestamp - now) / 1000));
          } else {
            sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
            sessionStorage.setItem(ATTEMPT_STORAGE_KEY, '0');
            setLockoutRemaining(0);
            setFailedAttempts(0);
          }
        }
      } catch {
        // Fallback seguro
      }
    };

    checkLockoutStatus();
    const interval = setInterval(checkLockoutStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const registerFailedAttempt = useCallback(() => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    try {
      sessionStorage.setItem(ATTEMPT_STORAGE_KEY, nextAttempts.toString());
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        sessionStorage.setItem(LOCKOUT_STORAGE_KEY, lockUntil.toString());
        setLockoutRemaining(LOCKOUT_DURATION_SECONDS);
        setErrorType('rate-limit');
        setErrorMessage(
          `Demasiados intentos fallidos. Por seguridad, el acceso se encuentra bloqueado durante ${LOCKOUT_DURATION_SECONDS} segundos.`
        );
      }
    } catch {}
  }, [failedAttempts]);

  const clearFailedAttempts = useCallback(() => {
    try {
      sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
      setFailedAttempts(0);
      setLockoutRemaining(0);
    } catch {}
  }, []);

  // Redirigir automáticamente si ya existe una sesión activa
  useEffect(() => {
    if (user && !isAuthLoading && status === 'idle') {
      router.replace('/admin');
    }
  }, [user, isAuthLoading, router, status]);

  // Saludo dinámico según la hora del día
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '¡Buenos días';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const rawName =
    userMeta.nombre && userMeta.nombre !== 'Administrador'
      ? userMeta.nombre
      : email
      ? email.split('@')[0]
      : 'Administrador';

  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  // Manejo del Login con los 4 pilares de seguridad
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status !== 'idle' || lockoutRemaining > 0) return;

    setEmailError(null);
    setPasswordError(null);
    setErrorMessage(null);

    let hasValidationError = false;

    // 1. VALIDE ENTRADAS (Sanitización y límites estrictos)
    const sanitizedEmail = email.trim().toLowerCase();

    if (!sanitizedEmail) {
      setEmailError('Ingresa tu correo electrónico');
      hasValidationError = true;
    } else if (sanitizedEmail.length > MAX_EMAIL_LENGTH) {
      setEmailError(`El correo no debe exceder los ${MAX_EMAIL_LENGTH} caracteres`);
      hasValidationError = true;
    } else if (!STRICT_EMAIL_REGEX.test(sanitizedEmail)) {
      setEmailError('Ingresa un formato de correo válido (ej: admin@galindobarber.pe)');
      hasValidationError = true;
    }

    if (!password) {
      setPasswordError('Ingresa tu contraseña de acceso');
      hasValidationError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      hasValidationError = true;
    } else if (password.length > MAX_PASSWORD_LENGTH) {
      setPasswordError(`La contraseña no debe superar los ${MAX_PASSWORD_LENGTH} caracteres`);
      hasValidationError = true;
    }

    if (hasValidationError) {
      setShakeKey((prev) => prev + 1);
      return;
    }

    setStatus('loading');

    try {
      // 2. MANEJE ERRORES Y CONTROL DE TIMEOUT (12s)
      const timeoutPromise = new Promise<{ success: boolean; error?: string }>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_ERROR')), 12000);
      });

      const authPromise = signIn(sanitizedEmail, password);
      const result = await Promise.race([authPromise, timeoutPromise]);

      if (result.success) {
        clearFailedAttempts();
        setStatus('verified');

        setTimeout(() => {
          setStatus('welcome');
          setTimeout(() => {
            router.push('/admin');
          }, 1500);
        }, 900);
      } else {
        // 3. NO EXPONGA INFORMACIÓN SENSIBLE:
        setPassword('');
        setStatus('idle');
        setShakeKey((prev) => prev + 1);
        registerFailedAttempt();

        setErrorType('auth');
        setErrorMessage(
          result.error ||
            'Credenciales de acceso incorrectas. Por motivos de seguridad, verifique su usuario y contraseña.'
        );
      }
    } catch (err: unknown) {
      // Manejo de errores de red o timeout
      setPassword('');
      setStatus('idle');
      setShakeKey((prev) => prev + 1);

      const isTimeout = err instanceof Error && err.message === 'TIMEOUT_ERROR';
      setErrorType('network');
      setErrorMessage(
        isTimeout
          ? 'El servidor tardó demasiado en responder. Verifique su conexión e intente nuevamente.'
          : 'No se pudo conectar con el servidor de autenticación. Verifique su red.'
      );
    }
  };

  const isFormLocked = lockoutRemaining > 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Fondo Panorámico de Alta Calidad (Banner oficial completo sin cortes) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-100 pointer-events-none"
        style={{ backgroundImage: "url('/banner.png')" }}
      />

      {/* Viñeta cinematográfica para enfocar la vista en el centro */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950 pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-transparent via-zinc-950/40 to-zinc-950/90 pointer-events-none" />

      {/* Luces sutiles de ambiente */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/5 blur-[140px] pointer-events-none" />

      {/* Barra Superior Minimalista */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-zinc-950/40 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group"
        >
          <span className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            ←
          </span>
          <span className="font-medium hidden sm:inline">Volver a la Tienda</span>
          <span className="font-medium sm:hidden">Volver</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Acceso Seguro TLS</span>
        </div>
      </header>

      {/* Centro: Tarjeta Central de Cristal Ahumado (Glassmorphism de Alta Gama) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[420px]"
        >
          {/* Tarjeta de Cristal Líquido Ahumado */}
          <div className="rounded-3xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_30px_70px_rgba(0,0,0,0.85)] space-y-6 relative overflow-hidden">
            {/* Línea superior reflectiva sutil */}
            <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Cabecera: Logo Galindo Barber con Halo de Luz */}
            <div className="text-center space-y-3 pt-1">
              <div className="relative inline-block">
                <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white p-1">
                  <img
                    src="/logo.jpg"
                    alt="Galindo Barber"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-[8px] text-white">
                  ✓
                </span>
              </div>

              <div>
                <h1 className="text-lg font-bold uppercase tracking-wider text-white">
                  Galindo Barber
                </h1>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Panel de Control Administrativo
                </p>
              </div>
            </div>

            {/* Banners de Error y Seguridad */}
            <AnimatePresence>
              {isFormLocked && (
                <motion.div
                  key="lockout-warning"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-amber-200">Acceso Pausado</p>
                    <p className="text-[11px] text-amber-300/90 leading-tight">
                      Reintente en {lockoutRemaining} segundos.
                    </p>
                  </div>
                </motion.div>
              )}

              {errorMessage && !isFormLocked && (
                <motion.div
                  key="general-error"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  className={`rounded-xl p-3 text-xs flex items-start gap-2.5 ${
                    errorType === 'network'
                      ? 'bg-sky-500/10 border border-sky-500/25 text-sky-200'
                      : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {errorType === 'network' ? (
                      <WifiOff className="w-4 h-4 text-sky-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold">
                      {errorType === 'network' ? 'Error de Conexión' : 'Acceso Denegado'}
                    </p>
                    <p className="text-[11px] leading-tight opacity-90">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulario */}
            <form noValidate onSubmit={handleLogin} className="space-y-4">
              {/* Campo Correo */}
              <motion.div
                key={`email-${shakeKey}`}
                animate={emailError ? { x: [0, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="space-y-1.5"
              >
                <label htmlFor="admin-email" className="text-xs font-medium text-zinc-300 block">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                      emailError ? 'text-rose-400' : 'text-zinc-500 group-focus-within:text-white'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    value={email}
                    disabled={status !== 'idle' || isFormLocked}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="admin@galindobarber.pe"
                    maxLength={MAX_EMAIL_LENGTH}
                    autoComplete="username email"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="none"
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/70 border text-xs sm:text-sm text-white placeholder-zinc-500 transition-all focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      emailError
                        ? 'border-rose-500/70 ring-1 ring-rose-500/20 bg-rose-500/5'
                        : 'border-white/10 hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/20'
                    }`}
                  />
                </div>

                <AnimatePresence>
                  {emailError && (
                    <motion.div
                      id="email-error"
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
                animate={passwordError ? { x: [0, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <label htmlFor="admin-password" className="text-xs font-medium text-zinc-300 block">
                    Contraseña
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Mínimo {MIN_PASSWORD_LENGTH} caracteres
                  </span>
                </div>

                <div className="relative group">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                      passwordError ? 'text-rose-400' : 'text-zinc-500 group-focus-within:text-white'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={status !== 'idle' || isFormLocked}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    maxLength={MAX_PASSWORD_LENGTH}
                    autoComplete="current-password"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="none"
                    required
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'password-error' : undefined}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-900/70 border text-xs sm:text-sm text-white placeholder-zinc-500 transition-all focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                      passwordError
                        ? 'border-rose-500/70 ring-1 ring-rose-500/20 bg-rose-500/5'
                        : 'border-white/10 hover:border-white/20 focus:border-white focus:ring-1 focus:ring-white/20'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={status !== 'idle' || isFormLocked}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {passwordError && (
                    <motion.div
                      id="password-error"
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

              {/* Recordar Sesión con Switch Estilizado */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={status !== 'idle' || isFormLocked}
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none transition-colors"
                >
                  <div
                    className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
                      rememberMe ? 'bg-white' : 'bg-zinc-800'
                    }`}
                  >
                    <motion.div
                      animate={{ x: rememberMe ? 12 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`w-3 h-3 rounded-full ${
                        rememberMe ? 'bg-zinc-950' : 'bg-zinc-500'
                      }`}
                    />
                  </div>
                  <span>Recordar sesión</span>
                </button>
              </div>

              {/* Botón de Ingreso Principal */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status !== 'idle' || isFormLocked}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    isFormLocked
                      ? 'bg-zinc-800 text-amber-400 border border-amber-500/25 cursor-not-allowed'
                      : status === 'verified'
                      ? 'bg-emerald-500 text-white shadow-emerald-950/60'
                      : status === 'loading'
                      ? 'bg-zinc-800 text-zinc-300 cursor-wait'
                      : 'bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] cursor-pointer group'
                  }`}
                >
                  {isFormLocked && (
                    <>
                      <Clock className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Bloqueado ({lockoutRemaining}s)</span>
                    </>
                  )}

                  {!isFormLocked && status === 'loading' && (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-white animate-spin" />
                      <span>Verificando...</span>
                    </>
                  )}

                  {!isFormLocked && status === 'verified' && (
                    <>
                      <Check className="w-4 h-4 text-white animate-bounce" />
                      <span>Acceso Verificado</span>
                    </>
                  )}

                  {!isFormLocked && status === 'idle' && (
                    <>
                      <span>Iniciar Sesión</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Footer del Login */}
      <footer className="relative z-20 w-full py-4 px-6 text-center text-[11px] text-zinc-500 border-t border-white/5 bg-zinc-950/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          © 2026 Galindo Barber Academy & Supply • Todos los derechos reservados.
        </span>
        <div className="flex items-center gap-4 font-mono text-zinc-400">
          <span>Sistema Administrativo Oficial</span>
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
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-white p-1">
                  <img
                    src="/logo.jpg"
                    alt="Galindo Barber"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -inset-2 rounded-2xl border border-emerald-500/30 animate-ping pointer-events-none" />
              </div>

              {/* Textos de Bienvenida con saludo dinámico */}
              <div className="space-y-2">
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium tracking-wide uppercase"
                >
                  Acceso Verificado
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
