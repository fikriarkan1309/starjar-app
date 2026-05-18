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

// --- CONFIG FIREBASE STARJAR (KUNCI SERVER ASIA) ---
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
  // --- STATE AUTHENTICATION, EYE TOGGLE, & PREMIUM ---
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingPremium, setLoadingPremium] = useState<boolean>(true);
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false); // Opsi mata password
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

  // --- MENDENGARKAN DATABASE REALTIME BERDASARKAN USER UID ---
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

  // --- AUDIO SFE & AUDIO CELEBRATION ---
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
      if (err.code === 'auth/weak-password') setAuthError('Password minimal 6 karakter, Bro.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('Email ini sudah kedaftar.');
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
      setAuthSuccess('Sip! Tautan ganti password sudah dikirim ke email kamu. Cek kotak masuk/spam ya!');
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
    if (window.confirm('Hapus akun anak ini beserta seluruh datanya?')) {
      remove(ref(db, `users/${user.uid}/profiles/${id}`));
    }
  };

  const handleDeleteTask = (id: string) => { if (user) remove(ref(db, `users/${user.uid}/tasks/${id}`)); };
  const handleDeleteReward = (id: string) => { if (user) remove(ref(db, `users/${user.uid}/rewards/${id}`)); };

  const getTaskLabel = (item: any) => {
    if (!item) return '🔄 Harian';
    if (item.type === 'Achievement') return '🏆 Pencapaian';
    if (item.recurrence === 'weekly') return '🔄 Mingguan';
    return '🔄 Harian';
  };

  // =========================================================================
  // VIEW RENDERERS UTAMA (800+ BARIS)
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

  // 🔒 1. HALAMAN LOGIN UTAMA (🌟 STARJAR BERSIH DENGAN FITUR MATA & RESET PASSWORD)
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
            
            {/* INPUT PASSWORD DENGAN TOMBOL MATA UNTUK INTIP */}
            <div className="relative">
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

  // ⏳ 2. HALAMAN LAYAR TUNGGU LYNK.ID (PREMIUM = FALSE)
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

  // 3. MAIN APPLICATION INTERFACE
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-12 font-sans pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-none">
          <div className="text-9xl animate-bounce">
            {celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}
          </div>
        </div>
      )}

      {currentRole === 'child' ? (
        // ==========================================
        // 👦 RENDER VIEW ANAK (DENGAN REWARDS KATALOG)
        // ==========================================
        <div className="space-y-12 max-w-6xl mx-auto">
          <header className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-cyan-400 tracking-tight">
              Misi Bintang Hari Ini! 🚀
            </h1>
            <p className="text-slate-400 font-medium">Yuk kumpulkan bintang untuk ditukar hadiah impian!</p>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {profiles.map(profile => {
              const fillPercentage = Math.min((profile.stars / profile.maxStars) * 100, 100);
              const childRoutines = tasks.filter(t => String(t.assignedTo) === String(profile.id) && t.type === 'Daily' && !t.isApproved);
              const childAchievements = tasks.filter(t => String(t.assignedTo) === String(profile.id) && t.type === 'Achievement' && !t.isApproved);
              const isRoutineOpen = !!childRoutineOpen[profile.id];
              const isAchieveOpen = !!childAchieveOpen[profile.id];

              return (
                <div key={profile.id} className="bg-slate-800/60 backdrop-blur-sm rounded-[2.5rem] border-2 border-slate-700/50 p-8 shadow-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex flex-row items-center justify-between gap-4 mb-8">
                      <div className="flex items-center gap-5">
                        <div className={`text-5xl bg-gradient-to-br ${profile.theme} p-4 rounded-[2rem] transform -rotate-3`}>{profile.avatar}</div>
                        <div>
                          <h2 className="text-3xl font-black text-white">{profile.name}</h2>
                          <p className="text-slate-400 font-medium text-sm mt-0.5">{profile.role}</p>
                        </div>
                      </div>
                      <div className="relative w-20 h-28 rounded-[1.5rem] border-4 border-slate-600/60 bg-slate-900/50 overflow-hidden flex flex-col justify-end">
                        <div className="w-full bg-gradient-to-t from-amber-500 to-yellow-300 transition-all duration-1000" style={{ height: `${fillPercentage}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-center flex-col z-30 font-black text-white text-2xl">
                           {profile.stars}<span className="text-[10px] font-bold text-slate-400">/ {profile.maxStars}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Accordion Rutinitas */}
                      <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                        <button type="button" onClick={() => setChildRoutineOpen(p => ({...p, [profile.id]: !isRoutineOpen}))} className="w-full px-4 py-3 flex justify-between items-center text-sm font-bold text-slate-200">
                          <span>🔄 Rutinitas Harian ({childRoutines.length})</span>
                          <span>{isRoutineOpen ? '▲' : '▼'}</span>
                        </button>
                        {isRoutineOpen && (
                          <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20">
                            {childRoutines.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs">
                                <div><p className="font-bold text-slate-100">{item.title}</p></div>
                                <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-1.5 rounded-lg font-black ${item.isDone ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900'}`}>{item.isDone ? '⏳' : `+${item.reward} ⭐`}</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Accordion Pencapaian */}
                      <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                        <button type="button" onClick={() => setChildAchieveOpen(p => ({...p, [profile.id]: !isAchieveOpen}))} className="w-full px-4 py-3 flex justify-between items-center text-sm font-bold text-slate-200">
                          <span>🏆 Misi Pencapaian ({childAchievements.length})</span>
                          <span>{isAchieveOpen ? '▲' : '▼'}</span>
                        </button>
                        {isAchieveOpen && (
                          <div className="p-3 border-t border-slate-700/40 space-y-2 bg-slate-900/20">
                            {childAchievements.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-700/60 bg-slate-900/60 text-xs">
                                <div><p className="font-bold text-slate-100">{item.title}</p></div>
                                <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-1.5 rounded-lg font-black ${item.isDone ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900'}`}>{item.isDone ? '⏳' : `+${item.reward} ⭐`}</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🎁 KATALOG HADIAH ANAK */}
                  <div className="mt-6 border-t border-slate-700/60 pt-4">
                    <button onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className="w-full py-2.5 rounded-xl font-black text-xs bg-slate-700 text-white">🎁 Katalog Tukar Hadiah</button>
                    {activeCatalogId === profile.id && (
                      <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-2xl p-3 space-y-2">
                        {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).map(reward => (
                          <div key={reward.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800 text-xs">
                            <div><p className="font-bold text-slate-200">{reward.title}</p><p className="text-yellow-400 font-bold">💰 Harga: {reward.cost} ⭐</p></div>
                            <button onClick={() => handleClaimReward(reward.id, profile.id, reward.cost)} disabled={reward.isClaimed} className={`px-3 py-1 rounded-lg font-bold ${reward.isClaimed ? 'bg-slate-700 text-slate-500' : 'bg-orange-500 text-white'}`}>{reward.isClaimed ? '⏳' : 'Tukar'}</button>
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
      ) : (
        // ==========================================
        // 👨 RENDER VIEW ORANG TUA (LENGKAP SEMUA TAB)
        // ==========================================
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-4 gap-4">
            <div><h1 className="text-2xl font-black text-white">Panel Kontrol Utama 👋</h1><p className="text-slate-500 text-xs font-medium">{user.email}</p></div>
            <div className="flex gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <button onClick={() => setParentTab('stats')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'stats' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>📊 Stats</button>
              <button onClick={() => setParentTab('approval')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'approval' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>🔔 Review ({tasks.filter(t => t.isDone && !t.isApproved).length + rewards.filter(r => r.isClaimed && !r.isApproved).length})</button>
              <button onClick={() => setParentTab('manage')} className={`px-4 py-1.5 rounded-lg text-xs font-black ${parentTab === 'manage' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>⚙️ Kelola</button>
              <button onClick={handleLogout} className="px-4 py-1.5 rounded-lg text-xs font-black text-red-400">🚪 Keluar</button>
            </div>
          </header>

          {parentTab === 'stats' && (
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
              <h2 className="text-sm font-black text-white">🏺 Progres Akumulasi Bintang</h2>
              {profiles.map(p => (
                <div key={p.id} className="text-xs font-bold text-white space-y-1">
                   <div className="flex justify-between"><span>{p.avatar} {p.name}</span><span className="text-yellow-400">{p.stars}/{p.maxStars} ⭐</span></div>
                   <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden"><div className={`h-full bg-gradient-to-r ${p.theme}`} style={{ width: `${(p.stars/p.maxStars)*100}%` }}></div></div>
                </div>
              ))}
            </div>
          )}

          {parentTab === 'approval' && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
                <h3 className="text-xs font-black text-slate-300">🎯 Persetujuan Misi Selesai</h3>
                {tasks.filter(t => t.isDone && !t.isApproved).map(t => {
                  const c = profiles.find(p => p.id === t.assignedTo);
                  return (
                    <div key={t.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs">
                      <div><p className="text-white font-bold">{t.title}</p><p className="text-slate-500">Oleh: {c?.name} ({getTaskLabel(t)})</p></div>
                      <button onClick={() => handleApproveTask(t.id, c?.id, t.reward)} className="bg-green-500 text-slate-900 font-black px-4 py-1.5 rounded-lg">Setujui (+{t.reward}⭐)</button>
                    </div>
                  );
                })}
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-2">
                <h3 className="text-xs font-black text-slate-300">🎁 Persetujuan Klaim Hadiah</h3>
                {rewards.filter(r => r.isClaimed && !r.isApproved).map(r => {
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

          {parentTab === 'manage' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>👶 TAMBAH PROFIL ANAK</span><span>{showChildForm?'▲':'▼'}</span></button>
                {showChildForm && (
                  <form onSubmit={handleAddProfile} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                    <input type="text" placeholder="Nama Lengkap/Panggilan" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <input type="text" placeholder="Status (Contoh: Kakak / Adik)" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <button type="submit" className="w-full bg-blue-500 text-white font-black py-2 rounded-lg">Simpan Akun Anak</button>
                  </form>
                )}
              </div>

              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>🎯 BUAT MISI BARU</span><span>{showTaskForm?'▲':'▼'}</span></button>
                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                    <select required value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"><option value="">Tugaskan Kepada...</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <input type="text" placeholder="Judul Misi (Misal: Sholat Tepat Waktu)" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <div className="grid grid-cols-2 gap-2">
                       <select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"><option value="Daily">Rutinitas</option><option value="Achievement">Pencapaian</option></select>
                       <input type="number" placeholder="Hadiah Bintang" value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <button type="submit" className="w-full bg-slate-700 text-white font-black py-2 rounded-lg">Tambah Misi</button>
                  </form>
                )}
              </div>

              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button type="button" onClick={() => setShowRewardForm(!showRewardForm)} className="w-full px-4 py-3 flex justify-between text-xs font-black text-white bg-slate-800/50"><span>🎁 BUAT DAFTAR HADIAH</span><span>{showRewardForm?'▲':'▼'}</span></button>
                {showRewardForm && (
                  <form onSubmit={handleAddReward} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                    <select required value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"><option value="">Pilih Anak...</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <input type="text" placeholder="Nama Hadiah (Misal: Es Krim / Mainan Lego)" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <input type="number" placeholder="Harga Bintang" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                    <button type="submit" className="w-full bg-orange-500 text-slate-950 font-black py-2 rounded-lg">Tambah Hadiah</button>
                  </form>
                )}
              </div>

              {/* Data Lists for deletion management */}
              <div className="bg-slate-900/40 p-4 border border-slate-700 rounded-xl space-y-4 text-xs">
                 <h3 className="font-black text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">Manajemen Penghapusan Data</h3>
                 <div className="space-y-1.5">
                    {profiles.map(p => ( <div key={p.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700"><span>👶 Akun: <b>{p.name}</b></span><button onClick={() => handleDeleteProfile(p.id)} className="text-red-400 font-bold">Hapus</button></div> ))}
                    {tasks.map(t => ( <div key={t.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/60"><span>🎯 Misi: {t.title}</span><button onClick={() => handleDeleteTask(t.id)} className="text-red-400 text-[10px]">Hapus</button></div> ))}
                    {rewards.map(r => ( <div key={r.id} className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/60"><span>🎁 Hadiah: {r.title}</span><button onClick={() => handleDeleteReward(r.id)} className="text-red-400 text-[10px]">Hapus</button></div> ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER SWITCHER MODE TAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-6 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>👦👧 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-6 py-2.5 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}