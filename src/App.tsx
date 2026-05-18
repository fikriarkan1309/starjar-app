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

// --- CONFIG FIREBASE STARJAR (SERVER ASIA FIX) ---
const firebaseConfig = {
  apiKey: "AIzaSyCyK1iq0pRBcRCUOElmHxhfOOyRek_Graw",
  authDomain: "starjar-f3461.firebaseapp.com",
  projectId: "starjar-f3461",
  storageBucket: "starjar-f3461.firebasestorage.app",
  messagingSenderId: "834288744757",
  appId: "1:834288744757:web:8babfcb387284efc54347c",
  databaseURL: "https://starjar-f3461-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- DEFINISI INTERFACE TYPESCRIPT ---
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

interface Reward {
  id: string;
  title: string;
  cost: number;
  isClaimed: boolean;
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
  // --- STATE AUTH, EYE TOGGLE, & STATUS PREMIUM ---
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingPremium, setLoadingPremium] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false); 
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- STATE CORE CORE APP SYSTEM ---
  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<'stats' | 'approval' | 'manage'>('manage'); 
  const [celebration, setCelebration] = useState<'task' | 'reward' | null>(null);

  const [showChildForm, setShowChildForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);

  const [childRoutineOpen, setChildRoutineOpen] = useState<{ [key: string]: boolean }>({});
  const [childAchieveOpen, setChildAchieveOpen] = useState<{ [key: string]: boolean }>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // --- STATE SYSTEM EDIT DATA (INLINE EDITING) ---
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<Profile>>({});

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<Task>>({});

  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardForm, setEditRewardForm] = useState<Partial<Reward>>({});

  // --- ARRAYS PILIHAN AVATAR & TEMA WARNA ASLI ---
  const avatarOptions = ['👶', '👧', '👦', '🧒', '🥷', '🧑‍🚀', '🦸', '🐱', '🐶', '🐼'];
  const themeOptions = [
    { value: 'from-pink-500 to-rose-400', label: '🩷 Pink Cerah' },
    { value: 'from-cyan-500 to-blue-400', label: '🩵 Biru Laut' },
    { value: 'from-purple-500 to-indigo-400', label: '💜 Ungu Galaxy' },
    { value: 'from-emerald-500 to-teal-400', label: '💚 Hijau Mint' },
    { value: 'from-amber-500 to-orange-400', label: '🧡 Orange Sunset' },
    { value: 'from-fuchsia-500 to-purple-600', label: '🔮 Fuchsia Nebula' }
  ];

  // --- MONITOR STATUS LOGIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (!currentUser) setLoadingPremium(false);
    });
    return () => unsubscribe();
  }, []);

  // --- MENDENGARKAN DATABASE REALTIME BERDASARKAN UID KAMAR ---
  useEffect(() => {
    if (!user) {
      setProfiles([]); setTasks([]); setRewards([]); setIsPremium(false);
      return;
    }

    const userBasePath = `users/${user.uid}`;
    setLoadingPremium(true);

    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      setIsPremium(!!snapshot.val());
      setLoadingPremium(false);
    });

    const unsubProfiles = onValue(ref(db, `${userBasePath}/profiles`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setProfiles([]); return; }
      setProfiles(Object.keys(data).map(key => ({ id: key, ...data[key] } as Profile)));
    });

    const unsubRewards = onValue(ref(db, `${userBasePath}/rewards`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setRewards([]); return; }
      setRewards(Object.keys(data).map(key => ({ id: key, ...data[key] } as Reward)));
    });

    const unsubTasks = onValue(ref(db, `${userBasePath}/tasks`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setTasks([]); return; }
      const tData = Object.keys(data).map(key => ({ id: key, ...data[key] } as Task));
      setTasks(tData);

      // Otomatisasi Reset Harian/Mingguan
      const todayStr = new Date().toDateString();
      const currentWeek = getWeekNumber(new Date());

      if (localStorage.getItem(`lastDailyReset_${user.uid}`) !== todayStr) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'daily' && (t.isDone || t.isApproved)) {
            update(ref(db, `${userBasePath}/tasks/${t.id}`), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem(`lastDailyReset_${user.uid}`, todayStr);
      }

      if (localStorage.getItem(`lastWeeklyReset_${user.uid}`) !== currentWeek) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'weekly' && (t.isDone || t.isApproved)) {
            update(ref(db, `${userBasePath}/tasks/${t.id}`), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem(`lastWeeklyReset_${user.uid}`, currentWeek);
      }
    });

    return () => { unsubPremium(); unsubProfiles(); unsubTasks(); unsubRewards(); };
  }, [user]);

  // --- AUDIO & SELEBRASI EFFECTS ---
  const triggerCelebration = (type: 'task' | 'reward') => {
    try {
      const url = type === 'reward' 
        ? 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' 
        : 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'; 
      new Audio(url).play();
    } catch (e) {}
    setCelebration(type);
    setTimeout(() => setCelebration(null), 2500);
  };

  // --- HANDLER AUTENTIKASI ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthSuccess('');
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await update(ref(db, `users/${res.user.uid}`), { isPremium: false, email: res.user.email });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail(''); setAuthPassword('');
    } catch (err: any) {
      if (err.code === 'auth/weak-password') setAuthError('Password minimal 6 karakter, Bro.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('Email ini sudah kedaftar.');
      else if (err.code === 'auth/invalid-credential') setAuthError('Email atau Password salah.');
      else setAuthError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) return setAuthError('Ketik dulu email kamu di atas, baru klik tombol ini, Bro!');
    setAuthError(''); setAuthSuccess('');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthSuccess('Tautan ganti password sudah dikirim ke email kamu! Cek inbox/spam ya.');
    } catch (err: any) {
      setAuthError('Gagal kirim email reset: ' + err.message);
    }
  };

  const handleLogout = () => window.confirm('Keluar dari StarJar?') && signOut(auth);

  // --- FORM DATA HANDLERS ---
  const [profileForm, setProfileForm] = useState({ name: '', role: 'Anak', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: '' });
  const [rewardForm, setRewardForm] = useState({ title: '', cost: 10, assignedTo: '' });

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !user) return;
    push(ref(db, `users/${user.uid}/profiles`), { ...profileForm, stars: 0 });
    setProfileForm({ name: '', role: 'Anak', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
    setShowChildForm(false);
  };

  // 🚀 LOGIKA PILIHAN "SEMUA ANAK" UNTUK TUGAS MISI
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedTo || !user) return alert('Pilih nama sasaran dulu!');
    
    const baseTask = { title: taskForm.title, type: taskForm.type, recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none', reward: Number(taskForm.reward), isDone: false, isApproved: false };
    
    if (taskForm.assignedTo === 'all') {
      profiles.forEach(p => {
        push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: p.id });
      });
    } else {
      push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: taskForm.assignedTo });
    }
    setTaskForm({ ...taskForm, title: '' }); setShowTaskForm(false);
  };

  // 🚀 LOGIKA PILIHAN "SEMUA ANAK" UNTUK HADIAH REWARD
  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title || !rewardForm.assignedTo || !user) return alert('Pilih nama sasaran dulu!');
    
    const baseReward = { title: rewardForm.title, cost: Number(rewardForm.cost), isClaimed: false, isApproved: false };
    
    if (rewardForm.assignedTo === 'all') {
      profiles.forEach(p => {
        push(ref(db, `users/${user.uid}/rewards`), { ...baseReward, assignedTo: p.id });
      });
    } else {
      push(ref(db, `users/${user.uid}/rewards`), { ...baseReward, assignedTo: rewardForm.assignedTo });
    }
    setRewardForm({ ...rewardForm, title: '' }); setShowRewardForm(false);
  };

  // --- LOGIKA PROGRESS OPERASIONAL ---
  const handleCompleteTask = (taskId: string) => {
    if (!user) return;
    triggerCelebration('task');
    update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isDone: true });
  };

  const handleClaimReward = (rewardId: string, childId: string, cost: number) => {
    if (!user) return;
    const child = profiles.find(p => p.id === childId);
    if (!child || child.stars < cost) return alert("Bintangmu belum cukup! 💪🌟");
    triggerCelebration('reward');
    update(ref(db, `users/${user.uid}/profiles/${childId}`), { stars: child.stars - cost });
    update(ref(db, `users/${user.uid}/rewards/${rewardId}`), { isClaimed: true });
  };

  const handleApproveTask = (taskId: string, childId: string | undefined, reward: number) => {
    if (!childId || !user) return;
    const child = profiles.find(p => p.id === childId);
    if (!child) return;
    update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isApproved: true });
    update(ref(db, `users/${user.uid}/profiles/${childId}`), { stars: Math.min(child.stars + reward, child.maxStars) });
  };

  const handleApproveReward = (rewardId: string) => {
    if (!user) return;
    update(ref(db, `users/${user.uid}/rewards/${rewardId}`), { isApproved: true });
  };

  // --- LOGIKA UPDATE DATA (EDIT MENU SIMPAN) ---
  const handleUpdateProfile = (id: string) => {
    if (user) {
      update(ref(db, `users/${user.uid}/profiles/${id}`), editProfileForm);
      setEditingProfileId(null);
    }
  };

  const handleUpdateTask = (id: string) => {
    if (user) {
      update(ref(db, `users/${user.uid}/tasks/${id}`), editTaskForm);
      setEditingTaskId(null);
    }
  };

  const handleUpdateReward = (id: string) => {
    if (user) {
      update(ref(db, `users/${user.uid}/rewards/${id}`), editRewardForm);
      setEditingRewardId(null);
    }
  };

  // --- LOGIKA HAPUS DATA COMPONENT ---
  const handleDeleteProfile = (id: string) => {
    if (!user) return;
    if (window.confirm('Hapus akun anak beserta riwayat datanya?')) {
      remove(ref(db, `users/${user.uid}/profiles/${id}`));
      tasks.filter(t => String(t.assignedTo) === id).forEach(t => remove(ref(db, `users/${user.uid}/tasks/${t.id}`)));
      rewards.filter(r => String(r.assignedTo) === id).forEach(r => remove(ref(db, `users/${user.uid}/rewards/${r.id}`)));
    }
  };
  const handleDeleteTask = (id: string) => { user && window.confirm('Hapus misi ini?') && remove(ref(db, `users/${user.uid}/tasks/${id}`)); };
  const handleDeleteReward = (id: string) => { user && window.confirm('Hapus hadiah ini?') && remove(ref(db, `users/${user.uid}/rewards/${id}`)); };

  const getTaskLabel = (item: any) => {
    if (!item) return '🔄 Harian';
    if (item.type === 'Achievement') return '🏆 Pencapaian';
    if (item.recurrence === 'weekly') return '🔄 Mingguan';
    if (item.recurrence === 'monthly') return '🔄 Bulanan';
    return '🔄 Harian';
  };

  // =========================================================================
  // VIEW RENDERERS SYSTEM
  // =========================================================================
  if (loadingAuth || loadingPremium) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 font-bold tracking-widest">
         <div className="text-center space-y-3">
           <div className="text-6xl animate-spin">🌟</div>
           <p className="animate-pulse">MEMUAT STARJAR...</p>
         </div>
      </div>
    );
  }

  // 🔒 1. VIEW LOGIN AWAL MINIMALIS 🌟
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-6xl block transform hover:scale-110 transition-transform">🌟</span>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400 tracking-tight">StarJar</h1>
            <p className="text-slate-400 text-sm">Aplikasi Toples Disiplin Anak Digital</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block ml-2">Email Orang Tua</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400" placeholder="nama@email.com" />
            </div>
            
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block ml-2">Password Akun</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400 pr-12" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-sm">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {authError && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{authError}</p>}
            {authSuccess && <p className="text-green-400 text-xs font-bold text-center bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">{authSuccess}</p>}

            <button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black py-3.5 rounded-xl text-sm shadow-lg shadow-yellow-500/10 transform active:scale-95 transition-all">
              {isRegistering ? '🔥 Daftar Akun Baru' : '🔑 Masuk Aplikasi'}
            </button>
          </form>

          <div className="text-center border-t border-slate-700/60 pt-4 space-y-2">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setAuthSuccess(''); }} className="text-xs font-bold text-cyan-400 hover:underline block mx-auto">
              {isRegistering ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Ketuk untuk Daftar Baru'}
            </button>
            <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-yellow-500/70 hover:text-yellow-400 tracking-wider uppercase block mx-auto pt-1">
              Lupa Password? Reset via Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ⏳ 2. VIEW PENDING AKTIVASI LYNK.ID (PREMIUM = FALSE)
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] border-2 border-yellow-500/20 p-8 text-center space-y-6">
          <span className="text-7xl block animate-pulse">⏳</span>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Akun Sedang Diproses!</h1>
          <p className="text-slate-400 text-sm">
            Sip, akun <span className="text-white font-bold">{user.email}</span> berhasil didaftarkan!
          </p>
          <p className="text-slate-400 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-700 leading-relaxed">
            Sistem kami sedang mencocokkan data pendaftaran Anda dengan data invoice pembelian dari Lynk.id. Mohon tunggu 5-10 menit ya, halaman ini akan terbuka otomatis secara realtime begitu aktivasi selesai.
          </p>
          <div className="pt-2">
            <div className="text-[11px] text-slate-500 animate-pulse font-medium">🛡️ Sinkronisasi aman dengan database Lynk.id...</div>
            <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors underline block mx-auto mt-6">🚪 Keluar / Ganti Akun</button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 👦 3. VIEW MODE ANAK (HIGH-FIDELITY VISUAL SEPERTI DI VIDEO)
  // =========================================================================
  const renderChildView = () => (
    <div className="space-y-12 max-w-6xl mx-auto animate-fade-in">
      <header className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 tracking-tight">
          Misi Bintang Hari Ini! 🚀
        </h1>
        <p className="text-slate-400 text-lg font-medium">Isi toplesmu dengan bintang kebaikan!</p>
      </header>

      {profiles.length === 0 && (
         <div className="text-center p-12 bg-slate-800/50 rounded-3xl border border-slate-700">
            <span className="text-6xl mb-4 block">👋</span>
            <h2 className="text-2xl font-bold text-white mb-2">Belum ada akun anak</h2>
            <p className="text-slate-400">Ayah atau Ibu perlu membuat profil anak di Mode Orang Tua terlebih dahulu.</p>
         </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {profiles.map(profile => {
          const fillPercentage = Math.min((profile.stars / profile.maxStars) * 100, 100);
          const childRoutines = tasks.filter(t => String(t.assignedTo) === String(profile.id) && t.type === 'Daily' && !t.isApproved);
          const childAchievements = tasks.filter(t => String(t.assignedTo) === String(profile.id) && t.type === 'Achievement' && !t.isApproved);
          const isRoutineOpen = !!childRoutineOpen[profile.id];
          const isAchieveOpen = !!childAchieveOpen[profile.id];

          return (
            <div key={profile.id} className="bg-slate-800/60 backdrop-blur-sm rounded-[2.5rem] border-2 border-slate-700/50 p-8 shadow-2xl relative flex flex-col justify-between">
              <div>
                {/* Visual Toples Kaca Mengkilap Khas Asli */}
                <div className="flex flex-row items-center justify-between gap-4 mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`text-5xl bg-gradient-to-br ${profile.theme} p-4 rounded-[2rem] shadow-lg transform -rotate-3`}>{profile.avatar}</div>
                    <div>
                      <h2 className="text-3xl font-black text-white">{profile.name}</h2>
                      <p className="text-slate-400 font-medium text-lg mt-1">{profile.role}</p>
                    </div>
                  </div>
                  
                  {/* Desain Toples Mengkilap */}
                  <div className="relative w-24 h-32 rounded-[2rem] border-4 border-slate-600/60 bg-slate-900/50 shadow-inner overflow-hidden flex flex-col justify-end isolate">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-500/50 rounded-b-xl z-20"></div>
                    <div className="absolute inset-y-2 left-2 w-3 rounded-full bg-white/10 z-20"></div>
                    <div className="w-full bg-gradient-to-t from-amber-500 via-yellow-400 to-yellow-300 relative transition-all duration-1000 ease-out z-10" style={{ height: `${fillPercentage}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-30 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                       <span className="text-3xl text-white">{profile.stars}</span>
                       <span className="text-[10px] text-slate-300 mt-0.5">/ {profile.maxStars}</span>
                    </div>
                  </div>
                </div>

                {/* Accordion Tugas Misi */}
                <div className="space-y-3 relative z-10 mb-6">
                  {/* Accordion Rutinitas */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setChildRoutineOpen(p => ({ ...p, [profile.id]: !isRoutineOpen }))} className="w-full px-4 py-3 flex justify-between items-center text-sm font-bold text-slate-200">
                      <span>🔄 Rutinitas Harian ({childRoutines.length})</span>
                      <span>{isRoutineOpen ? '▲' : '▼'}</span>
                    </button>
                    {isRoutineOpen && (
                      <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20">
                        {childRoutines.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs">
                            <div><p className="font-bold text-slate-100">{item.title}</p></div>
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-1.5 rounded-lg font-black ${item.isDone ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900'}`}>{item.isDone ? '⏳ REVIEW' : `+${item.reward} ⭐`}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion Pencapaian */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setChildAchieveOpen(p => ({ ...p, [profile.id]: !isAchieveOpen }))} className="w-full px-4 py-3 flex justify-between items-center text-sm font-bold text-slate-200">
                      <span>🏆 Misi Pencapaian ({childAchievements.length})</span>
                      <span>{isAchieveOpen ? '▲' : '▼'}</span>
                    </button>
                    {isAchieveOpen && (
                      <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20">
                        {childAchievements.map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs">
                            <div><p className="font-bold text-slate-100">{item.title}</p></div>
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-1.5 rounded-lg font-black ${item.isDone ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900'}`}>{item.isDone ? '⏳ REVIEW' : `+${item.reward} ⭐`}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎁 RENDER KATALOG HADIAH BAWAAN ASLI */}
              <div className="mt-4 border-t border-slate-700/60 pt-4">
                <button onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className="w-full py-3 rounded-xl font-black text-sm bg-slate-700 text-white">🎁 Katalog Tukar Hadiah</button>
                {activeCatalogId === profile.id && (
                  <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-2">
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).map(reward => (
                      <div key={reward.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800 text-xs">
                        <div><p className="font-bold text-slate-200">{reward.title}</p><p className="text-yellow-400 font-bold">💰 Harga: {reward.cost} ⭐</p></div>
                        <button onClick={() => handleClaimReward(reward.id, profile.id, reward.cost)} disabled={reward.isClaimed} className={`px-3 py-1 rounded-lg font-bold ${reward.isClaimed ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-500 text-white'}`}>{reward.isClaimed ? '⏳ Ditinjau' : 'Tukar'}</button>
                      </div>
                    ))}
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).length === 0 && <p className="text-center text-slate-500 text-xs py-2 italic">Belum ada daftar hadiah.</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================
  // 👨 4. VIEW MODE ORANG TUA (DENGAN REVOLUSI MENU EDIT KOMPLIT + PILIHAN ALL)
  // =========================================================================
  const renderParentView = () => {
    const pendingTasks = tasks.filter(t => t.isDone && !t.isApproved);
    const pendingRewards = rewards.filter(r => r.isClaimed && !r.isApproved);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-4 gap-4">
          <div><h1 className="text-2xl font-black text-white">Panel Orang Tua 👋</h1><p className="text-slate-500 text-xs mt-0.5">{user?.email}</p></div>
          <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
            <button onClick={() => setParentTab('stats')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'stats' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>📊 Stats</button>
            <button onClick={() => setParentTab('approval')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'approval' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>🔔 Review ({pendingTasks.length + pendingRewards.length})</button>
            <button onClick={() => setParentTab('manage')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'manage' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>⚙️ Kelola</button>
            <button onClick={handleLogout} className="px-4 py-1.5 rounded-lg text-xs font-black text-red-400">🚪 Keluar</button>
          </div>
        </header>

        {/* TAB STATISTIK BAR CHART */}
        {parentTab === 'stats' && (
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h2 className="text-sm font-black text-white">🏺 Progres Akumulasi Bintang Anak</h2>
            {profiles.map(p => (
              <div key={p.id} className="text-xs font-bold text-white space-y-1">
                 <div className="flex justify-between"><span>{p.avatar} {p.name}</span><span className="text-yellow-400">{p.stars}/{p.maxStars} ⭐</span></div>
                 <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden"><div className={`h-full bg-gradient-to-r ${p.theme}`} style={{ width: `${(p.stars/p.maxStars)*100}%` }}></div></div>
              </div>
            ))}
          </div>
        )}

        {/* TAB PERSETUJUAN OPERASIONAL */}
        {parentTab === 'approval' && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
              <h3 className="text-xs font-black text-slate-300">🎯 Konfirmasi Misi Selesai ({pendingTasks.length})</h3>
              {pendingTasks.map(t => {
                const c = profiles.find(p => p.id === t.assignedTo);
                return (
                  <div key={t.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs">
                    <div><p className="text-white font-bold">{t.title}</p><p className="text-slate-500">Pelaku: {c?.name} ({getTaskLabel(t)})</p></div>
                    <button onClick={() => handleApproveTask(t.id, c?.id, t.reward)} className="bg-green-500 text-slate-900 font-black px-4 py-1.5 rounded-lg">Setujui (+{t.reward}⭐)</button>
                  </div>
                );
              })}
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
              <h3 className="text-xs font-black text-slate-300">🎁 Konfirmasi Penukaran Hadiah ({pendingRewards.length})</h3>
              {pendingRewards.map(r => {
                const c = profiles.find(p => p.id === r.assignedTo);
                return (
                  <div key={r.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs">
                    <div><p className="text-white font-bold">{r.title}</p><p className="text-orange-400">Untuk: {c?.name}</p></div>
                    <button onClick={() => handleApproveReward(r.id)} className="bg-orange-500 text-white font-black px-4 py-1.5 rounded-lg">Berikan Hadiah ✓</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB MANAGEMENT KELOLA FORM & CRUD EDIT/HAPUS COMPONENT */}
        {parentTab === 'manage' && (
          <div className="space-y-4">
            
            {/* Form Tambah Profil Anak */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>👶 TAMBAH PROFIL ANAK</span><span>{showChildForm?'▲':'▼'}</span></button>
              {showChildForm && (
                <form onSubmit={handleAddProfile} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Panggilan" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <input type="text" placeholder="Status (Contoh: Kakak / Adik)" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" placeholder="Target Maks Bintang" required value={profileForm.maxStars} onChange={e => setProfileForm({...profileForm, maxStars: Number(e.target.value)})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <select value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">{avatarOptions.map(av => <option key={av} value={av}>{av}</option>)}</select>
                    <select value={profileForm.theme} onChange={e => setProfileForm({...profileForm, theme: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">{themeOptions.map(th => <option key={th.value} value={th.value}>{th.label}</option>)}</select>
                  </div>
                  <button type="submit" className="w-full bg-blue-500 text-white font-black py-2 rounded-lg">Simpan Akun Anak</button>
                </form>
              )}
            </div>

            {/* Form Tambah Misi (DENGAN FITUR ALL) */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>🎯 BUAT DAFTAR MISI BARU</span><span>{showTaskForm?'▲':'▼'}</span></button>
              {showTaskForm && (
                <form onSubmit={handleAddTask} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                  <select required value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="">Pilih Penerima Misi...</option>
                    <option value="all">🌟 SEMUA ANAK (Bagikan Rata)</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="text" placeholder="Nama Misi (Contoh: Mengaji 15 Menit)" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <div className="grid grid-cols-2 gap-2">
                     <select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"><option value="Daily">🔄 Rutinitas Berulang</option><option value="Achievement">🏆 Tantangan Pencapaian</option></select>
                     <input type="number" placeholder="Upah Bintang" value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <button type="submit" className="w-full bg-slate-700 text-white font-black py-2 rounded-lg">Tambah Misi</button>
                </form>
              )}
            </div>

            {/* Form Tambah Pilihan Hadiah (DENGAN FITUR ALL) */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setShowRewardForm(!showRewardForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>🎁 BUAT DAFTAR HADIAH BARU</span><span>{showRewardForm?'▲':'▼'}</span></button>
              {showRewardForm && (
                <form onSubmit={handleAddReward} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                  <select required value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"><option value="">Katalog Khusus Untuk...</option><option value="all">🌟 SEMUA ANAK (Tersedia untuk semua)</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <input type="text" placeholder="Nama Hadiah (Contoh: Beli Es Krim)" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <input type="number" placeholder="Harga Bintang" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <button type="submit" className="w-full bg-orange-500 text-slate-950 font-black py-2 rounded-lg">Tambah Hadiah</button>
                </form>
              )}
            </div>

            {/* =======================================================
                🛠️ PUSAT EDIT DAN MANAJEMEN PENGHAPUSAN (INLINE EDIT)
               ======================================================= */}
            <div className="bg-slate-900/40 p-5 border border-slate-700 rounded-3xl space-y-4 text-xs">
               <h3 className="font-black text-slate-400 border-b border-slate-800 pb-2 uppercase tracking-wider">🛠️ Modul Manajemen & Edit Komponen</h3>
               
               {/* List & Edit Akun Anak */}
               <div className="space-y-2">
                 <p className="text-slate-500 font-bold ml-1">● Manajemen Akun Anak:</p>
                 {profiles.map(p => (
                   <div key={p.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-2">
                     {editingProfileId === p.id ? (
                       <div className="space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                           <input type="text" className="bg-slate-900 p-1 rounded text-white" value={editProfileForm.name || p.name} onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})} />
                           <input type="text" className="bg-slate-900 p-1 rounded text-white" value={editProfileForm.role || p.role} onChange={e => setEditProfileForm({...editProfileForm, role: e.target.value})} />
                         </div>
                         <div className="flex gap-2">
                           <button type="button" onClick={() => handleUpdateProfile(p.id)} className="bg-green-600 px-3 py-1 rounded text-white font-bold">Simpan</button>
                           <button type="button" onClick={() => setEditingProfileId(null)} className="bg-slate-600 px-3 py-1 rounded text-white">Batal</button>
                         </div>
                       </div>
                     ) : (
                       <div className="flex justify-between items-center">
                         <span className="text-white font-bold">{p.avatar} {p.name} ({p.role}) - Max: {p.maxStars}⭐</span>
                         <div className="flex gap-2">
                           <button type="button" onClick={() => { setEditingProfileId(p.id); setEditProfileForm(p); }} className="text-blue-400 hover:underline">Edit</button>
                           <button type="button" onClick={() => handleDeleteProfile(p.id)} className="text-red-400 hover:underline">Hapus</button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>

               {/* List & Edit Tugas Misi */}
               <div className="space-y-2 pt-2">
                 <p className="text-slate-500 font-bold ml-1">● Manajemen Daftar Misi:</p>
                 {tasks.map(t => {
                   const targetedChild = profiles.find(p => p.id === t.assignedTo);
                   return (
                     <div key={t.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700/60 space-y-2">
                       {editingTaskId === t.id ? (
                         <div className="space-y-2">
                           <input type="text" className="w-full bg-slate-900 p-1 rounded text-white" value={editTaskForm.title || t.title} onChange={e => setEditTaskForm({...editTaskForm, title: e.target.value})} />
                           <input type="number" className="w-24 bg-slate-900 p-1 rounded text-white" value={editTaskForm.reward || t.reward} onChange={e => setEditTaskForm({...editTaskForm, reward: Number(e.target.value)})} />
                           <div className="flex gap-2">
                             <button type="button" onClick={() => handleUpdateTask(t.id)} className="bg-green-600 px-3 py-1 rounded text-white font-bold">Simpan</button>
                             <button type="button" onClick={() => setEditingTaskId(null)} className="bg-slate-600 px-3 py-1 rounded text-white">Batal</button>
                           </div>
                         </div>
                       ) : (
                         <div className="flex justify-between items-center">
                           <span className="text-slate-300">🎯 {t.title} &rarr; (<b className="text-blue-400">{targetedChild?.name || 'Anak Terhapus'}</b>) Upah: {t.reward}⭐</span>
                           <div className="flex gap-2">
                             <button type="button" onClick={() => { setEditingTaskId(t.id); setEditTaskForm(t); }} className="text-blue-400 hover:underline">Edit</button>
                             <button type="button" onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:underline">Hapus</button>
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>

               {/* List & Edit Pilihan Hadiah */}
               <div className="space-y-2 pt-2">
                 <p className="text-slate-500 font-bold ml-1">● Manajemen Daftar Hadiah:</p>
                 {rewards.map(r => {
                   const targetedChild = profiles.find(p => p.id === r.assignedTo);
                   return (
                     <div key={r.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700/60 space-y-2">
                       {editingRewardId === r.id ? (
                         <div className="space-y-2">
                           <input type="text" className="w-full bg-slate-900 p-1 rounded text-white" value={editRewardForm.title || r.title} onChange={e => setEditRewardForm({...editRewardForm, title: e.target.value})} />
                           <input type="number" className="w-24 bg-slate-900 p-1 rounded text-white" value={editRewardForm.cost || r.cost} onChange={e => setEditRewardForm({...editRewardForm, cost: Number(e.target.value)})} />
                           <div className="flex gap-2">
                             <button type="button" onClick={() => handleUpdateReward(r.id)} className="bg-green-600 px-3 py-1 rounded text-white font-bold">Simpan</button>
                             <button type="button" onClick={() => setEditingRewardId(null)} className="bg-slate-600 px-3 py-1 rounded text-white">Batal</button>
                           </div>
                         </div>
                       ) : (
                         <div className="flex justify-between items-center">
                           <span className="text-slate-300">🎁 {r.title} &rarr; (<b className="text-orange-400">{targetedChild?.name || 'Anak Terhapus'}</b>) Harga: {r.cost}⭐</span>
                           <div className="flex gap-2">
                             <button type="button" onClick={() => { setEditingRewardId(r.id); setEditRewardForm(r); }} className="text-blue-400 hover:underline">Edit</button>
                             <button type="button" onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:underline">Hapus</button>
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>

            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-12 font-sans pb-32 relative">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/60 backdrop-blur-sm">
          <div className="text-9xl animate-bounce drop-shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            {celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}
          </div>
        </div>
      )}

      {currentRole === 'child' ? renderChildView() : renderParentView()}

      {/* FOOTER BANNER PENGENDALI NAVIGASI MODE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-5 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>👦👧 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-5 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}