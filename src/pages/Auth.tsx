import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Phone, User as UserIcon, Ticket, ArrowRight, Gamepad2, Chrome, AlertCircle, CheckCircle2 } from 'lucide-react';
import SafeImage from '../components/SafeImage';
import { auth, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthProps {
  onLogin: () => void;
}

const DEFAULT_USER_DATA = {
  walletBalance: 100,
  bonus: 100,
  winnings: 0,
  isKycVerified: false,
  stats: {
    matchesPlayed: 0,
    totalKills: 0,
    totalWinnings: 0,
  }
};

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  
  // Error State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validatePhone = (p: string) => {
    return p.length === 10 && /^\d+$/.test(p);
  };

  // Helper for performance timeout
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
    return Promise.race([promise, timeout]);
  };

  const getReferrerFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  };

  const mapAuthError = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already registered';
      case 'auth/weak-password': return 'Password must be at least 6 characters';
      case 'auth/network-request-failed': return 'Check your internet connection';
      case 'auth/invalid-email': return 'Enter valid email';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': return 'Invalid email or password';
      default: return 'An unexpected error occurred. Try again.';
    }
  };

  const handleForgotPassword = async () => {
    setErrors({});
    setSuccessMsg('');

    if (!email) {
      setErrors({ email: 'Enter your email' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await withTimeout(sendPasswordResetEmail(auth, email), 5000, 'Request timed out. Please try again.');
      setSuccessMsg('Password reset link sent to your email');
    } catch (error: any) {
      console.error(error);
      setErrors({ email: mapAuthError(error.code) });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate requests
    
    setErrors({});
    setSuccessMsg('');
    
    // Basic Validation
    const newErrors: { [key: string]: string } = {};
    if (!email) newErrors.email = 'Email required';
    if (!password) newErrors.password = 'Password required';
    if (password && password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (!isLogin) {
      if (!username) newErrors.username = 'Username required';
      if (!phone) {
        newErrors.phone = '10 digit phone required';
      } else if (!validatePhone(phone)) {
        newErrors.phone = 'Enter valid 10 digit number';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Handle Login
        try {
          await withTimeout(signInWithEmailAndPassword(auth, email, password), 5000, 'Login taking too long. Check connection.');
          onLogin();
        } catch (error: any) {
          setErrors({ general: mapAuthError(error.code || error.message) });
        }
      } else {
        // Handle Registration
        try {
          const userCredential = await withTimeout(
            createUserWithEmailAndPassword(auth, email, password),
            5000,
            'Signup taking too long. Check connection.'
          );
          const firebaseUser = userCredential.user;

          // Simple device ID tracking
          let deviceId = localStorage.getItem('khel_galli_device_id');
          if (!deviceId) {
            deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('khel_galli_device_id', deviceId);
          }

          const referredBy = getReferrerFromUrl();

          // Create Firestore Document with graceful failure
          try {
            await withTimeout(
              setDoc(doc(db, 'users', firebaseUser.uid), {
                username,
                email,
                phone,
                ...DEFAULT_USER_DATA,
                referredBy: referredBy || null,
                deviceId,
                referralClaimed: false,
                createdAt: serverTimestamp(),
              }),
              3000,
              'Profile creation delayed.'
            );
          } catch (fsError) {
            console.warn('Firestore profile creation failed or timed out:', fsError);
            // Profile will be checked/re-created in App.tsx on initialization if missing
            setErrors({ general: 'Profile created with warnings. Please update phone in settings later.' });
          }

          setSuccessMsg('Registration successful! Redirecting...');
          onLogin();
          // UI will redirect via onAuthStateChanged in App.tsx but onLogin provides immediate state feedback
        } catch (error: any) {
          setErrors({ general: mapAuthError(error.code || error.message) });
        }
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Something went wrong' });
    } finally {
      // Auto stop loader
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrors({});
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (error) {
      console.error('Login failed:', error);
      setErrors({ general: 'Google login failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 pt-12 pb-8 max-w-lg mx-auto">
      <div className="flex-1 flex flex-col pt-8">
        <div className="mb-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4"
          >
            <SafeImage 
              src="https://i.ibb.co/n8jPYbMP/image.png" 
              alt="Logo" 
              className="w-24 h-auto"
            />
          </motion.div>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Start winning real rewards</p>
        </div>

        <div className="bg-neutral-900 rounded-[2.5rem] border-[6px] border-neutral-800 p-8 shadow-2xl relative overflow-hidden mb-8">
          <div className="flex gap-4 mb-8 bg-black/30 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => { setIsLogin(true); setErrors({}); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                isLogin ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-neutral-500'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setErrors({}); setSuccessMsg(''); }}
              className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                !isLogin ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-neutral-500'
              }`}
            >
              Register
            </button>
          </div>

          {errors.general && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-wider"
            >
              <AlertCircle size={14} />
              {errors.general}
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-wider"
            >
              <CheckCircle2 size={14} />
              {successMsg}
            </motion.div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.email ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.email && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.email}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.password ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.password && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.password}</span>}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotPasswordLoading || loading}
                      className="text-[9px] font-bold uppercase tracking-widest text-purple-500 hover:text-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {forgotPasswordLoading && <div className="w-2.5 h-2.5 border border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />}
                      Forgot Password?
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.username ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.username && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.username}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.email ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.email && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.email}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10 digit number"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.phone ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.phone && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.phone}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full h-11 bg-neutral-800 rounded-lg px-4 text-xs text-white border transition-colors focus:outline-hidden ${
                        errors.password ? 'border-red-500/50' : 'border-neutral-700 focus:border-purple-500/50'
                      }`}
                    />
                    {errors.password && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest ml-1">{errors.password}</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white font-black h-12 rounded-xl mt-4 shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Login' : 'Register'
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-[10px] uppercase font-black tracking-widest text-neutral-600">OR</span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black font-black h-12 rounded-xl shadow-lg shadow-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            <Chrome size={18} />
            {loading ? 'Processing...' : 'Continue with Google'}
          </button>
          
          <div className="text-[10px] text-center mt-6 text-neutral-500">
            {isLogin ? 'New player?' : 'Existing player?'}{' '}
            <button 
              type="button"
              disabled={loading}
              onClick={() => { setIsLogin(!isLogin); setErrors({}); setSuccessMsg(''); }} 
              className="text-purple-500 font-bold hover:underline disabled:no-underline"
            >
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </div>
        </div>
      </div>
      
      <p className="text-center text-zinc-600 text-[10px] uppercase font-bold tracking-widest px-8">
        By continuing, you agree to our <span className="text-zinc-400">Terms of Service</span> and <span className="text-zinc-400">Privacy Policy</span>
      </p>
    </div>
  );
}
