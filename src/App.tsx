import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail 
} from 'firebase/auth';

// --- CONFIG FIREBASE STARJAR ---
const firebaseConfig = {
  apiKey: "AIzaSyCyK1iq0pRBcRCUOElmHxhfOOyRek_Graw",
  authDomain: "starjar-f3461.firebaseapp.com",
  projectId: "starjar-f3461",
  storageBucket: "starjar-f3461.firebasestorage.app",
  messagingSenderId: "834288744757",
  appId: "1:834288744757:web:8babfcb387284efc54347c",
  databaseURL: "https://starjar-f3461-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- DEFINISI INTERFACE ---
interface Profile {
  id: string;
  name: string;
  role: string;
  stars: number;
  maxStars: number;
  avatar: string;
  theme: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  recurrence: string;
  reward: number;
  isDone: boolean;
  isApproved: boolean;
  assignedTo: string;
}

const getWeekNumber = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + '-' + weekNo;
};

export default function App() {
  // --- AUTH & PREMIUM STATE ---
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // --- CORE APP STATE ---
  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [parentTab, setParentTab] = useState<'stats' | 'approval' | 'manage'>('manage'); 
  const [celebration, setCelebration] = useState<'task' | 'reward' | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // --- FORM STATE ---
  const [showChildForm, setShowChildForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: '' });

  // --- MONITOR LOGIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- MONITOR DATABASE (PREMIUM & DATA) ---
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setTasks([]);
      setIsPremium(false);
      setLoadingPremium(false);
      return;
    }

    setLoadingPremium(true);
    const userBasePath = `users/${user.uid}`;

    // Listen Premium Status
    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      setIsPremium(!!snapshot.val());
      setLoadingPremium(false);
    });

    // Listen Profiles
    const unsubProfiles = onValue(ref(db, `${userBasePath}/profiles`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setProfiles([]); return; }
      setProfiles(Object.keys(data).map(key => ({ id: key, ...data[key] })));
    });

    // Listen Tasks
    const unsubTasks = onValue(ref(db, `${userBasePath}/tasks`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setTasks([]); return; }
      const tData = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      setTasks(tData);

      // Reset Logics
      const today = new Date().toDateString();
      const currentWeek = getWeekNumber(new Date());
      if (localStorage.getItem(`resetDaily_${user.uid}`) !== today) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'daily' && (t.isDone || t.isApproved)) {
            update(ref(db, `${userBasePath}/tasks/${t.id}`), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem(`resetDaily_${user.uid}`, today);
      }
    });

    return () => { unsubPremium(); unsubProfiles(); unsubTasks(); };
  }, [user]);

  // --- HANDLERS ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await update(ref(db, `users/${res.user.uid}`), { isPremium: false, email: res.user.email });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      setAuthError(err.message.includes('invalid-credential') ? 'Email atau Password salah.' : err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) return setAuthError('Masukkan email kamu dulu di kotak email.');
    setAuthError('');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthSuccess('Link reset password sudah dikirim ke email kamu! Cek inbox/spam ya.');
    } catch (err: any) {
      setAuthError('Gagal mengirim email reset: ' + err.message);
    }
  };

  const handleLogout = () => window.confirm('Keluar aplikasi?') && signOut(auth);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskForm.assignedTo) return alert('Pilih anak dulu!');
    push(ref(db, `users/${user.uid}/tasks`), { ...taskForm, isDone: false, isApproved: false });
    setTaskForm({ ...taskForm, title: '' });
    setShowTaskForm(false);
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    push(ref(db, `users/${user.uid}/profiles`), { ...profileForm, stars: 0 });
    setProfileForm({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
    setShowChildForm(false);
  };

  const handleCompleteTask = (taskId: string) => {
    if (!user) return;
    setCelebration('task');
    update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isDone: true });
    setTimeout(() => setCelebration(null), 2000);
  };

  const handleApprove = (taskId: string, profileId: string, reward: number) => {
    if (!user) return;
    const p = profiles.find(x => x.id === profileId);
    if (!p) return;
    update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isApproved: true });
    update(ref(db, `users/${user.uid}/profiles/${profileId}`), { stars: Math.min(p.stars + reward, p.maxStars) });
  };

  // --- UI RENDERERS ---
  if (loadingAuth || loadingPremium) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-spin">🌟</div>
          <p className="text-slate-400 font-bold tracking-widest animate-pulse">MEMUAT STARJAR...</p>
        </div>
      </div>
    );
  }

  // 1. LOGIN VIEW
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 p-10 shadow-2xl space-y-8">
          <div className="text-center space-y-3">
            <span className="text-7xl block animate-bounce">🌟</span>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-orange-500 tracking-tighter">StarJar</h1>
            <p className="text-slate-400 text-sm font-medium">Digital Reward System for Smart Kids</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black ml-4">Email Address</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all" placeholder="bundapintar@email.com" />
            </div>
            
            <div className="space-y-1 relative">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black ml-4">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-yellow-400 transition-colors">
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {authError && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">{authError}</p>}
            {authSuccess && <p className="text-green-400 text-xs font-bold text-center bg-green-500/10 p-3 rounded-xl border border-green-500/20">{authSuccess}</p>}

            <button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 font-black py-4 rounded-2xl shadow-lg shadow-yellow-500/20 transform active:scale-95 transition-all">
              {isRegistering ? '🔥 DAFTAR SEKARANG' : '🚀 MASUK APLIKASI'}
            </button>
          </form>

          <div className="space-y-3 pt-4 border-t border-slate-700/50 text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
              {isRegistering ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Buat Baru'}
            </button>
            <br />
            <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-yellow-500/70 hover:text-yellow-400 tracking-wider uppercase">
              Lupa Password? Reset via Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. PAYWALL VIEW
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800/80 rounded-[3rem] border border-yellow-500/20 p-10 text-center space-y-8">
          <div className="relative">
            <span className="text-8xl block animate-pulse">⏳</span>
            <div className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-black px-2 py-1 rounded-full">PENDING</div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white">Sedang Diproses</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Halo <span className="text-yellow-400 font-bold">{user.email}</span>, pembayaranmu sedang divalidasi oleh sistem. Mohon tunggu 5-10 menit ya.
            </p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 text-left space-y-3">
             <p className="text-xs text-slate-300 flex items-center gap-2">✅ Akun berhasil didaftarkan</p>
             <p className="text-xs text-slate-500 flex items-center gap-2">⏳ Sinkronisasi database Lynk.id...</p>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-slate-500 underline uppercase tracking-widest">Logout Akun</button>
        </div>
      </div>
    );
  }

  // 3. MAIN APP VIEW
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-12 pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
          <div className="text-center animate-tada">
            <div className="text-9xl mb-4">⭐</div>
            <h2 className="text-4xl font-black text-yellow-400">MISI SELESAI!</h2>
          </div>
        </div>
      )}

      {currentRole === 'child' ? (
        // --- VIEW ANAK ---
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in">
          <header className="text-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500">Misi Bintang 🚀</h1>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {profiles.map(p => (
              <div key={p.id} className="bg-slate-800/40 border-2 border-slate-700/50 rounded-[3rem] p-8 space-y-8 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div className={`text-6xl bg-gradient-to-br ${p.theme} p-5 rounded-[2rem] shadow-lg`}>{p.avatar}</div>
                    <div><h2 className="text-3xl font-black text-white">{p.name}</h2><p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{p.role}</p></div>
                  </div>
                  <div className="text-right"><p className="text-4xl font-black text-yellow-400">{p.stars}</p><p className="text-[10px] text-slate-500 font-black">/ {p.maxStars} ⭐</p></div>
                </div>
                <div className="space-y-3">
                  {tasks.filter(t => t.assignedTo === p.id && !t.isApproved).map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-slate-900/80 p-5 rounded-2xl border border-slate-700/50">
                      <span className="font-bold text-slate-100">{t.title}</span>
                      <button onClick={() => handleCompleteTask(t.id)} disabled={t.isDone} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${t.isDone ? 'bg-slate-800 text-slate-600' : 'bg-yellow-400 text-slate-900 shadow-lg active:scale-90'}`}>
                        {t.isDone ? '⏳ REVIEW' : `+${t.reward} ⭐`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // --- VIEW PARENT ---
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-700/50 pb-8">
            <div><h1 className="text-3xl font-black text-white">Panel Orang Tua 👋</h1><p className="text-slate-500 text-xs mt-1 font-medium">{user.email}</p></div>
            <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button onClick={() => setParentTab('stats')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'stats' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>📊 STATS</button>
              <button onClick={() => setParentTab('approval')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'approval' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-400'}`}>🔔 REVIEW</button>
              <button onClick={() => setParentTab('manage')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'manage' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400'}`}>⚙️ KELOLA</button>
              <button onClick={handleLogout} className="px-5 py-2 text-xs font-black text-red-400 ml-2">🚪 OUT</button>
            </div>
          </header>

          {parentTab === 'stats' && (
            <div className="space-y-6">
              {profiles.map(p => (
                <div key={p.id} className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700/50 space-y-4">
                  <div className="flex justify-between text-sm font-black">
                    <span className="text-white">{p.avatar} {p.name}</span>
                    <span className="text-yellow-400">{p.stars} / {p.maxStars} ⭐</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-700">
                    <div className={`h-full bg-gradient-to-r ${p.theme} transition-all duration-1000`} style={{ width: `${(p.stars/p.maxStars)*100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {parentTab === 'approval' && (
            <div className="space-y-4">
              {tasks.filter(t => t.isDone && !t.isApproved).map(t => {
                const child = profiles.find(p => p.id === t.assignedTo);
                return (
                  <div key={t.id} className="flex justify-between items-center bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                    <div><p className="text-[10px] font-black text-slate-500 uppercase">{child?.name} SELESAIKAN:</p><p className="text-lg font-bold text-white">{t.title}</p></div>
                    <button onClick={() => handleApprove(t.id, t.assignedTo, t.reward)} className="bg-green-500 text-white font-black px-6 py-2 rounded-2xl shadow-lg active:scale-95 transition-all text-xs">SETUJUI +{t.reward}⭐</button>
                  </div>
                );
              })}
              {tasks.filter(t => t.isDone && !t.isApproved).length === 0 && <div className="text-center p-12 text-slate-500 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-slate-800 rounded-[3rem]">Belum ada misi yang perlu direview</div>}
            </div>
          )}

          {parentTab === 'manage' && (
            <div className="space-y-6">
              {/* Form Tambah Anak */}
              <div className="bg-slate-800/50 rounded-[2rem] border border-slate-700 overflow-hidden">
                <button onClick={() => setShowChildForm(!showChildForm)} className="w-full p-6 flex justify-between items-center text-sm font-black text-white"><span>👶 TAMBAH AKUN ANAK</span><span>{showChildForm ? '▲' : '▼'}</span></button>
                {showChildForm && (
                  <form onSubmit={handleAddProfile} className="p-8 border-t border-slate-700 space-y-4 bg-slate-900/20">
                    <input type="text" placeholder="Nama Panggilan" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 text-sm text-white" />
                    <button type="submit" className="w-full bg-blue-500 text-white font-black py-3 rounded-2xl text-xs">SIMPAN AKUN</button>
                  </form>
                )}
              </div>

              {/* Form Tambah Misi */}
              <div className="bg-slate-800/50 rounded-[2rem] border border-slate-700 overflow-hidden">
                <button onClick={() => setShowTaskForm(!showTaskForm)} className="w-full p-6 flex justify-between items-center text-sm font-black text-white"><span>🎯 TAMBAH MISI BARU</span><span>{showTaskForm ? '▲' : '▼'}</span></button>
                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="p-8 border-t border-slate-700 space-y-4 bg-slate-900/20">
                    <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 text-sm text-white">
                      <option value="">Pilih Anak...</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="text" placeholder="Nama Misi (Contoh: Sikat Gigi)" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 text-sm text-white" />
                    <button type="submit" className="w-full bg-slate-700 text-white font-black py-3 rounded-2xl text-xs">TAMBAH MISI</button>
                  </form>
                )}
              </div>

              {/* List Hapus */}
              <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-700 space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-4">Manajemen Data</h3>
                {profiles.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl border border-slate-700/50">
                    <span className="text-xs font-bold">{p.avatar} {p.name}</span>
                    <button onClick={() => handleDeleteProfile(p.id)} className="text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-lg">HAPUS</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER SWITCHER */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-xl p-2 rounded-full border border-slate-700 shadow-2xl flex items-center gap-2">
        <button onClick={() => setCurrentRole('child')} className={`px-8 py-3 rounded-full text-xs font-black transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>MODE ANAK</button>
        <button onClick={() => setCurrentRole('parent')} className={`px-8 py-3 rounded-full text-xs font-black transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>MODE ORANG TUA</button>
      </div>
    </div>
  );
}