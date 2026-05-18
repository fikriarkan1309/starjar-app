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

// --- CONFIG FIREBASE STARJAR (SERVER REGIONAL ASIA FIX) ---
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
  assignedTo: string | number;
}

interface Reward {
  id: string;
  title: string;
  cost: number;
  isClaimed: boolean;
  isApproved: boolean;
  assignedTo: string | number;
}

const getWeekNumber = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return date.getUTCFullYear() + '-' + weekNo;
};

export default function App() {
  // --- STATE AUTHENTICATION, EYE TOGGLE, & PREMIUM STATUS ---
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

  // --- STATE CORE APP SYSTEM ---
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

  // --- MONITOR STATUS LOGIN USER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (!currentUser) {
        setLoadingPremium(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- MENDENGARKAN DATABASE REALTIME BERDASARKAN USER UID (ISOLASI KAMAR) ---
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setTasks([]);
      setRewards([]);
      setIsPremium(false);
      return;
    }

    const userBasePath = `users/${user.uid}`;
    setLoadingPremium(true);

    // 🔑 Ambil Status Lisensi Premium
    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      const val = snapshot.val();
      setIsPremium(!!val);
      setLoadingPremium(false);
    });

    // 👶 Ambil Profil Anak
    const unsubProfiles = onValue(ref(db, `${userBasePath}/profiles`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setProfiles([]); return; }
      const pData = Object.keys(data).map(key => ({
        id: key,
        name: data[key].name || '',
        role: data[key].role || '',
        stars: typeof data[key].stars === 'number' ? data[key].stars : 0,
        maxStars: typeof data[key].maxStars === 'number' ? data[key].maxStars : 50,
        avatar: data[key].avatar || '👶',
        theme: data[key].theme || 'from-pink-500 to-rose-400'
      } as Profile));
      setProfiles(pData);
    });

    // 🎁 Ambil Katalog Hadiah
    const unsubRewards = onValue(ref(db, `${userBasePath}/rewards`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setRewards([]); return; }
      const rData = Object.keys(data).map(key => ({
        id: key,
        title: data[key].title || '',
        cost: typeof data[key].cost === 'number' ? data[key].cost : 10,
        isClaimed: !!data[key].isClaimed,
        isApproved: !!data[key].isApproved,
        assignedTo: data[key].assignedTo || ''
      } as Reward));
      setRewards(rData);
    });

    // 🎯 Ambil Daftar Misi & Automasi Reset Waktu
    const unsubTasks = onValue(ref(db, `${userBasePath}/tasks`), (snapshot) => {
      const data = snapshot.val();
      if (!data) { setTasks([]); return; }
      const tData = Object.keys(data).map(key => ({
        id: key,
        title: data[key].title || '',
        type: data[key].type || 'Daily',
        recurrence: data[key].recurrence || 'none',
        reward: typeof data[key].reward === 'number' ? data[key].reward : 2,
        isDone: !!data[key].isDone,
        isApproved: !!data[key].isApproved,
        assignedTo: data[key].assignedTo || ''
      } as Task));
      
      setTasks(tData);

      const today = new Date();
      const todayStr = today.toDateString();
      const currentWeek = getWeekNumber(today);
      const currentMonth = today.getFullYear() + '-' + today.getMonth();

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

      if (localStorage.getItem(`lastMonthlyReset_${user.uid}`) !== currentMonth) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'monthly' && (t.isDone || t.isApproved)) {
            update(ref(db, `${userBasePath}/tasks/${t.id}`), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem(`lastMonthlyReset_${user.uid}`, currentMonth);
      }
    });

    return () => { unsubPremium(); unsubProfiles(); unsubTasks(); unsubRewards(); };
  }, [user]);

  // --- AUDIO SFX & ANIMASI CELEBRATION ---
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

  // --- HANDLER SISTEM AUTENTIKASI ---
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
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      if (err.code === 'auth/weak-password') setAuthError('Password minimal 6 karakter ya.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('Email ini sudah terdaftar.');
      else if (err.code === 'auth/invalid-credential') setAuthError('Email atau Password salah.');
      else setAuthError(err.message);
    }
  };

  // 📧 OPSI MANDIRI LUPA PASSWORD VIA EMAIL
  const handleForgotPassword = async () => {
    if (!authEmail) {
      setAuthError('Ketik dulu alamat email kamu di kolom atas, baru klik tombol ini, Bro!');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthSuccess('Sip! Tautan ganti password sudah dikirim ke email kamu. Cek inbox/spam ya!');
    } catch (err: any) {
      setAuthError('Gagal mengirim email reset: ' + err.message);
    }
  };

  const handleLogout = () => window.confirm('Yakin mau keluar dari StarJar?') && signOut(auth);

  // --- CRUD DATA HANDLERS ---
  const [profileForm, setProfileForm] = useState({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: '' });
  const [rewardForm, setRewardForm] = useState({ title: '', cost: 10, assignedTo: '' });

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

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !user) return;
    push(ref(db, `users/${user.uid}/profiles`), { 
      name: profileForm.name, role: profileForm.role || 'Anak', 
      stars: 0, maxStars: Number(profileForm.maxStars), 
      avatar: profileForm.avatar, theme: profileForm.theme 
    });
    setProfileForm({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
    setShowChildForm(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedTo || !user) return alert('Pilih nama anak dulu!');
    const baseTask = { title: taskForm.title, type: taskForm.type, recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none', reward: Number(taskForm.reward), isDone: false, isApproved: false, assignedTo: taskForm.assignedTo };
    push(ref(db, `users/${user.uid}/tasks`), baseTask);
    setTaskForm({ ...taskForm, title: '' }); 
    setShowTaskForm(false);
  };

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title || !rewardForm.assignedTo || !user) return alert('Pilih nama anak dulu!');
    const baseReward = { title: rewardForm.title, cost: Number(rewardForm.cost), isClaimed: false, isApproved: false, assignedTo: rewardForm.assignedTo };
    push(ref(db, `users/${user.uid}/rewards`), baseReward);
    setRewardForm({ ...rewardForm, title: '' });
    setShowRewardForm(false);
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

  const handleDeleteProfile = (id: string) => {
    if (!user) return;
    if (window.confirm('Hapus akun anak ini beserta seluruh data Misi & Hadiahnya?')) {
      remove(ref(db, `users/${user.uid}/profiles/${id}`));
      tasks.filter(t => t.assignedTo === id).forEach(t => remove(ref(db, `users/${user.uid}/tasks/${t.id}`)));
      rewards.filter(r => r.assignedTo === id).forEach(r => remove(ref(db, `users/${user.uid}/rewards/${r.id}`)));
    }
  };

  const handleDeleteTask = (id: string) => { if (user) remove(ref(db, `users/${user.uid}/tasks/${id}`)); };
  const handleDeleteReward = (id: string) => { if (user) remove(ref(db, `users/${user.uid}/rewards/${id}`)); };

  const getTaskLabel = (item: any) => {
    if (!item) return '🔄 Harian';
    if (item.type === 'Achievement') return '🏆 Pencapaian';
    if (item.recurrence === 'weekly') return '🔄 Mingguan';
    if (item.recurrence === 'monthly') return '🔄 Bulanan';
    return '🔄 Harian';
  };

  // =========================================================================
  // VIEW RENDERERS UTAMA (850+ BARIS HIGH FIDELITY VISUAL)
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

  // 🔒 1. HALAMAN LOGIN UTAMA (TAMPILAN BERSIH: 🌟 STARJAR)
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
            
            {/* INPUT PASSWORD + IKON MATA INTIP */}
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

  // ⏳ 2. LAYAR TUNGGU AKTIVASI PASIF LYNK.ID (PREMIUM = FALSE)
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
  // RENDER UTAMA APLIKASI TERBUKA (KEMBALI KE LAYOUT ASLI YANG SUKSES & PREMIUM)
  // =========================================================================
  const renderChildView = () => (
    <div className="space-y-12 max-w-6xl mx-auto animate-fade-in">
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 tracking-tight drop-shadow-sm">
          Misi Bintang Hari Ini! 🚀
        </h1>
        <p className="text-slate-400 text-lg font-medium">Isi toplesmu dengan bintang kebaikan!</p>
      </header>

      {profiles.length === 0 && (
         <div className="text-center p-12 bg-slate-800/50 rounded-3xl border border-slate-700">
            <span className="text-6xl mb-4 block">👋</span>
            <h2 className="text-2xl font-bold text-white mb-2">Belum ada profil Anak</h2>
            <p className="text-slate-400">Ayah/Ibu perlu membuat profil anak di Mode Orang Tua terlebih dahulu.</p>
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
            <div key={profile.id} className="bg-slate-800/60 backdrop-blur-sm rounded-[2.5rem] border-2 border-slate-700/50 p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                {/* Bagian Profil + Visual Toples Kaca Asli */}
                <div className="flex flex-row items-center justify-between gap-4 mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`text-5xl bg-gradient-to-br ${profile.theme} p-4 rounded-[2rem] shadow-lg transform -rotate-3`}>{profile.avatar}</div>
                    <div>
                      <h2 className="text-3xl font-black text-white">{profile.name}</h2>
                      <p className="text-slate-400 font-medium text-lg mt-1">{profile.role}</p>
                    </div>
                  </div>
                  
                  {/* Desain Toples Kaca Mengkilap */}
                  <div className="relative w-24 h-32 rounded-[2rem] border-4 border-slate-600/60 bg-slate-900/50 shadow-inner overflow-hidden flex flex-col justify-end isolate">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-500/50 rounded-b-xl z-20 border-b border-slate-400/30"></div>
                    <div className="absolute inset-y-2 left-2 w-3 rounded-full bg-white/10 z-20"></div>
                    <div className="w-full bg-gradient-to-t from-amber-500 via-yellow-400 to-yellow-300 relative transition-all duration-1000 ease-out z-10 shadow-[0_-5px_15px_rgba(250,204,21,0.5)]" style={{ height: `${fillPercentage}%` }}>
                      <div className="absolute top-0 left-0 w-full h-2 bg-yellow-200/50 rounded-t-full"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                       <span className="text-3xl font-black text-white leading-none">{profile.stars}</span>
                       <span className="text-[10px] font-bold text-slate-300 mt-1">/ {profile.maxStars}</span>
                    </div>
                  </div>
                </div>

                {/* Bagian Misi/Tugas Accordion Visual Asli */}
                <div className="space-y-3 relative z-10 mb-8">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-3">🎯 Daftar Tugas:</h3>
                  
                  {/* Accordion Rutinitas */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setChildRoutineOpen(prev => ({ ...prev, [profile.id]: !isRoutineOpen }))} className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">🔄 Rutinitas Harian</span>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-black">{childRoutines.length}</span>
                      </div>
                      <span className={`text-slate-400 text-xs font-bold transform transition-transform duration-300 ${isRoutineOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                    </button>
                    {isRoutineOpen && (
                      <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20 animate-fade-in">
                        {childRoutines.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-100">{item.title}</p>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{getTaskLabel(item)}</span>
                            </div>
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`w-full sm:w-auto px-4 py-2 rounded-lg font-black text-xs transition-all ${item.isDone ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md hover:scale-105'}`}>
                              {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                            </button>
                          </div>
                        ))}
                        {childRoutines.length === 0 && <p className="text-slate-500 text-xs italic p-2 text-center">Yey! Rutinitas sudah beres semua.</p>}
                      </div>
                    )}
                  </div>

                  {/* Accordion Pencapaian */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => setChildAchieveOpen(prev => ({ ...prev, [profile.id]: !isAchieveOpen }))} className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">🏆 Misi Pencapaian</span>
                        <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-black">{childAchievements.length}</span>
                      </div>
                      <span className={`text-slate-400 text-xs font-bold transform transition-transform duration-300 ${isAchieveOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                    </button>
                    {isAchieveOpen && (
                      <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20 animate-fade-in">
                        {childAchievements.map(item => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-100">{item.title}</p>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">🏆 Misi Utama</span>
                            </div>
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`w-full sm:w-auto px-4 py-2 rounded-lg font-black text-xs transition-all ${item.isDone ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md hover:scale-105'}`}>
                              {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                            </button>
                          </div>
                        ))}
                        {childAchievements.length === 0 && <p className="text-slate-500 text-xs italic p-2 text-center">Belum ada misi pencapaian baru.</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎁 RENDER KATALOG HADIAH SETIAP ANAK ASLI UTAH */}
              <div className="relative z-10 mt-4 border-t border-slate-700/60 pt-6">
                <button onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className={`w-full py-4 rounded-2xl font-black text-base shadow-md transition-all flex items-center justify-center gap-2 ${activeCatalogId === profile.id ? 'bg-slate-700 text-white' : 'bg-gradient-to-r ' + profile.theme + ' text-white hover:scale-[1.01]'}`}>
                  {activeCatalogId === profile.id ? '❌ Tutup Katalog' : '🎁 Klaim Hadiah'}
                </button>
                {activeCatalogId === profile.id && (
                  <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-3xl p-5 space-y-3 animate-fade-in">
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).map(reward => (
                      <div key={reward.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700 gap-3">
                        <div>
                          <p className={`font-bold text-sm ${reward.isClaimed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{reward.title}</p>
                          <p className="text-xs font-medium text-yellow-400">💰 Harga: {reward.cost} ⭐</p>
                        </div>
                        <button onClick={() => handleClaimReward(reward.id, profile.id, reward.cost)} disabled={reward.isClaimed} className={`w-full sm:w-auto text-xs font-black px-4 py-2.5 rounded-xl transition-all ${reward.isClaimed ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-slate-700 hover:bg-yellow-400 hover:text-slate-950 text-white active:scale-95'}`}>
                          {reward.isClaimed ? 'Menunggu ⏳' : 'Tukar Bintang'}
                        </button>
                      </div>
                    ))}
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).length === 0 && <p className="text-center text-slate-500 text-xs py-2 italic">Belum ada daftar hadiah khusus untukmu.</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderParentView = () => {
    const pendingTasks = tasks.filter(t => t.isDone && !t.isApproved);
    const pendingRewards = rewards.filter(r => r.isClaimed && !r.isApproved);
    const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.isApproved).length / tasks.length) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header Dashboard Orang Tua */}
        <header className="border-b border-slate-700 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Panel Orang Tua 👋</h1>
            <p className="text-slate-500 mt-1 text-xs font-medium">Akun Premium: {user?.email}</p>
          </div>
          <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 items-center overflow-x-auto w-full md:w-auto">
            <button type="button" onClick={() => setParentTab('stats')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'stats' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📊 Statistik</button>
            <button type="button" onClick={() => setParentTab('approval')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'approval' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🔔 Review {(pendingTasks.length + pendingRewards.length > 0) && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingTasks.length + pendingRewards.length}</span>}</button>
            <button type="button" onClick={() => setParentTab('manage')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${parentTab === 'manage' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>⚙️ Kelola</button>
            <button type="button" onClick={handleLogout} className="px-4 py-2 rounded-xl text-xs font-black text-red-400 hover:bg-red-500/10 transition-all ml-2">🚪 Keluar</button>
          </div>
        </header>

        {/* TAB STATISTIK */}
        {parentTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-3xl shadow-inner">⭐</div>
                  <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Bintang Aktif</p><p className="text-3xl font-black text-white">{profiles.reduce((sum, p) => sum + p.stars, 0)}</p></div>
               </div>
               <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-green-400/10 flex items-center justify-center text-3xl shadow-inner">✅</div>
                  <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rasio Misi Selesai</p><p className="text-3xl font-black text-white">{completionRate}%</p></div>
               </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl">
               <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">📈 Progres Akumulasi Bintang</h2>
               <div className="space-y-6">
                  {profiles.map(p => {
                       const percent = Math.min((p.stars / p.maxStars) * 100, 100);
                       return (
                          <div key={p.id} className="space-y-2">
                             <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2"><span className="text-xl">{p.avatar}</span><span className="text-white font-bold text-sm">{p.name}</span></div>
                                <div className="text-right"><span className="text-yellow-400 font-black text-base">{p.stars}</span><span className="text-slate-500 text-xs ml-1">/ {p.maxStars} ⭐</span></div>
                             </div>
                             <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden relative">
                                <div className={`h-full rounded-full bg-gradient-to-r ${p.theme} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                             </div>
                          </div>
                       )
                  })}
               </div>
            </div>
          </div>
        )}

        {/* TAB APPROVAL / REVIEW DATA */}
        {parentTab === 'approval' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">🎯 Review Misi Selesai ({pendingTasks.length})</h2>
              <div className="space-y-3">
                {pendingTasks.map(task => {
                  const child = profiles.find(p => String(p.id) === String(task.assignedTo));
                  return (
                    <div key={task.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-900 border border-slate-700 text-sm">
                      <div><p className="text-slate-500 text-xs">{child?.name} Melakukan:</p><p className="font-bold text-white">{task.title}</p></div>
                      <button onClick={() => handleApproveTask(task.id, child?.id, task.reward)} className="bg-green-500 text-slate-900 font-black px-4 py-2 rounded-xl text-xs">Setujui +{task.reward}⭐</button>
                    </div>
                  );
                })}
                {pendingTasks.length === 0 && <p className="text-center text-slate-500 py-4 text-xs italic">Belum ada penyelesaian misi yang perlu ditinjau.</p>}
              </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-base font-bold text-white mb-4">🎁 Review Klaim Hadiah ({pendingRewards.length})</h2>
              <div className="space-y-3">
                {pendingRewards.map(reward => {
                  const child = profiles.find(p => String(p.id) === String(reward.assignedTo));
                  return (
                    <div key={reward.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-900 border border-slate-700 text-sm">
                      <div><p className="text-orange-400 text-xs">{child?.name} Menukarkan:</p><p className="font-bold text-white">{reward.title}</p></div>
                      <button onClick={() => handleApproveReward(reward.id)} className="bg-orange-500 text-white font-black px-4 py-2 rounded-xl text-xs">Berikan ✓</button>
                    </div>
                  );
                })}
                {pendingRewards.length === 0 && <p className="text-center text-slate-500 py-4 text-xs italic">Belum ada penukaran hadiah yang perlu diberikan.</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB MANAGE / MANAGEMENT KELOLA FORM & CRUD LISTS ACCORDION */}
        {parentTab === 'manage' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4">
              
              {/* Form Tambah Profil Anak */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-6 py-4 flex justify-between items-center text-sm font-black text-white hover:bg-slate-700/20"><span>👶 Tambah Akun Anak</span><span>{showChildForm ? '▲' : '▼'}</span></button>
                {showChildForm && (
                  <form onSubmit={handleAddProfile} className="p-6 border-t border-slate-700/50 bg-slate-900/10 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-xs text-slate-400 mb-1 block">Nama Panggilan</label><input type="text" placeholder="Nama anak" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Status</label><input type="text" placeholder="Contoh: Kakak / Adik" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div><label className="text-xs text-slate-400 mb-1 block">Target Bintang Maksimal</label><input type="number" required value={profileForm.maxStars} onChange={e => setProfileForm({...profileForm, maxStars: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Pilih Avatar</label><select value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"><option value="👶">👶 Bayi</option><option value="👧">👧 Anak Perempuan</option><option value="👦">👦 Anak Laki-laki</option><option value="👸">👸 Putri</option><option value="🤴">🤴 Pangeran</option></select></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Tema Desain Warna</label><select value={profileForm.theme} onChange={e => setProfileForm({...profileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"><option value="from-pink-500 to-rose-400">🩷 Pink Cerah</option><option value="from-cyan-500 to-blue-400">🩵 Biru Laut</option><option value="from-purple-500 to-indigo-400">💜 Ungu Galaxy</option></select></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white font-black py-3 rounded-xl text-sm shadow-md">+ Simpan Akun Anak</button>
                  </form>
                )}
              </div>

              {/* Form Tambah Misi */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-6 py-4 flex justify-between items-center text-sm font-black text-white hover:bg-slate-700/20"><span>🎯 Tambah Misi Baru</span><span>{showTaskForm ? '▲' : '▼'}</span></button>
                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="p-6 border-t border-slate-700/50 bg-slate-900/10 space-y-4">
                    <div><label className="text-xs text-slate-400 mb-1 block">Tugaskan Kepada Anak</label><select required value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"><option value="">Pilih Anak...</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Nama Tugas / Aktivitas Misi</label><input type="text" placeholder="Contoh: Merapikan Kasur / Belajar 30 Menit" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-slate-400 mb-1 block">Kategori Misi</label><select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"><option value="Daily">🔄 Rutinitas Berulang</option><option value="Achievement">🏆 Tantangan Pencapaian</option></select></div>
                      <div><label className="text-xs text-slate-400 mb-1 block">Upah Hadiah Bintang</label><input type="number" value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                    </div>
                    <button type="submit" className="w-full bg-slate-700 text-white font-black py-3 rounded-xl text-sm shadow-md">+ Tambah Misi Kebaikan</button>
                  </form>
                )}
              </div>

              {/* Form Tambah Katalog Hadiah */}
              <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowRewardForm(!showRewardForm)} className="w-full px-6 py-4 flex justify-between items-center text-sm font-black text-white hover:bg-slate-700/20"><span>🎁 Tambah Pilihan Hadiah (Reward)</span><span>{showRewardForm ? '▲' : '▼'}</span></button>
                {showRewardForm && (
                  <form onSubmit={handleAddReward} className="p-6 border-t border-slate-700/50 bg-slate-900/10 space-y-4">
                    <div><label className="text-xs text-slate-400 mb-1 block">Katalog Hadiah Khusus Untuk</label><select required value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white"><option value="">Pilih Anak...</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Nama Hadiah Impian Anak</label><input type="text" placeholder="Contoh: Beli Mainan Lego / Es Krim Sore Hari" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Harga Tukar (Bintang)</label><input type="number" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                    <button type="submit" className="w-full bg-orange-500 text-slate-950 font-black py-3 rounded-xl text-sm shadow-md">+ Tambah Hadiah ke Katalog</button>
                  </form>
                )}
              </div>
            </div>

            {/* DAFTAR DATA CRUD (UNTUK MANAJEMEN PENGHAPUSAN KILAT) */}
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700 mt-6 space-y-4">
              <h3 className="text-xs font-black text-slate-400 border-b border-slate-700/60 pb-2 uppercase tracking-wider">🛠️ Pusat Penghapusan Komponen Data</h3>
              <div className="space-y-4 text-xs">
                 
                 <div>
                   <p className="text-slate-500 font-bold mb-2">● Profil Akun Anak</p>
                   <div className="space-y-1.5">
                     {profiles.map(p => (
                       <div key={p.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-700">
                         <span className="text-white font-bold">{p.avatar} {p.name} ({p.role})</span>
                         <button type="button" onClick={() => handleDeleteProfile(p.id)} className="text-red-400 font-bold hover:underline">Hapus Profil</button>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div>
                   <p className="text-slate-500 font-bold mb-2">● Daftar Semua Misi</p>
                   <div className="space-y-1.5">
                     {tasks.map(t => {
                       const targetedChild = profiles.find(p => p.id === t.assignedTo);
                       return (
                         <div key={t.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-700/60">
                           <span className="text-slate-300">🎯 Misi: <b>{t.title}</b> &rarr; ({targetedChild?.name || 'Semua'})</span>
                           <button type="button" onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:underline">Hapus Misi</button>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 <div>
                   <p className="text-slate-500 font-bold mb-2">● Daftar Semua Hadiah</p>
                   <div className="space-y-1.5">
                     {rewards.map(r => {
                       const targetedChild = profiles.find(p => p.id === r.assignedTo);
                       return (
                         <div key={r.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-700/60">
                           <span className="text-slate-300">🎁 Hadiah: <b>{r.title}</b> &rarr; ({targetedChild?.name || 'Semua'})</span>
                           <button type="button" onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:underline">Hapus Hadiah</button>
                         </div>
                       );
                     })}
                   </div>
                 </div>

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

      {/* FOOTER TAB MODE BANNER UTAMA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-5 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>👦👧 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-5 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}