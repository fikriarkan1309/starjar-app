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

// --- CONFIG FIREBASE STARJAR MILIK FIKRI (SERVER REGIONAL ASIA FIX) ---
const firebaseConfig = {
  apiKey: "AIzaSyCyK1iq0pRBcRCUOElmHxhfOOyRek_Graw",
  authDomain: "starjar-f3461.firebaseapp.com",
  projectId: "starjar-f3461",
  storageBucket: "starjar-f3461.firebasestorage.app",
  messagingSenderId: "834288744757",
  appId: "1:834288744757:web:8babfcb387284efc54347c",
  databaseURL: "https://starjar-f3461-default-rtdb.asia-southeast1.firebasedatabase.app/" // Menyesuaikan URL RTDB bawaan Google
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
  // --- STATE AUTHENTICATION, EYE TOGGLE, & STATUS PREMIUM LYNK.ID ---
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

  // --- STATE CORE APP SYSTEM DARI FILE UTAMA ---
  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<'stats' | 'approval' | 'manage'>('manage'); 
  const [celebration, setCelebration] = useState<'task' | 'reward' | null>(null);

  // --- STATE ACCORDION MODE ORANG TUA ---
  const [showChildForm, setShowChildForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);

  // --- STATE ACCORDION MODE ANAK ---
  const [childRoutineOpen, setChildRoutineOpen] = useState<{ [key: string]: boolean }>({});
  const [childAchieveOpen, setChildAchieveOpen] = useState<{ [key: string]: boolean }>({});

  const playSound = (type: 'success' | 'tada') => {
    try {
      const url = type === 'success' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' 
        : 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'; 
      const audio = new Audio(url);
      audio.play();
    } catch (e) { console.log(e); }
  };

  const triggerCelebration = (type: 'task' | 'reward') => {
    playSound(type === 'reward' ? 'tada' : 'success');
    setCelebration(type);
    setTimeout(() => setCelebration(null), 2500);
  };

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // --- STATE EDITING SYSTEM (INLINE EDIT) UTANPA DIKUNCI ---
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<Profile>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<Task>>({});
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardForm, setEditRewardForm] = useState<Partial<Reward>>({});

  // --- MONITOR SAKTI SESSIN LOGIN USER ---
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

  // --- MENDENGARKAN REALTIME DATABASE BERDASARKAN UID KAMAR KELUARGA ---
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

    // Ambil Status Berlangganan Premium
    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      setIsPremium(!!snapshot.val());
      setLoadingPremium(false);
    });

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

      // --- LOGIKA OTOMATISASI RESET HARIAN/MINGGUAN/BULANAN KELUARGA ---
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

    return () => { unsubProfiles(); unsubTasks(); unsubRewards(); };
  }, [user]);

  // --- STATE INPUT CORE ---
  const [profileForm, setProfileForm] = useState({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: 'all' });
  const [rewardForm, setRewardForm] = useState({ title: '', cost: 10, assignedTo: 'all' });

  // --- HANDLER PROSES OPERASIONAL CORE DAN CRUD ---
  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    triggerCelebration('task');
    await update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isDone: true });
  };

  const handleClaimReward = async (rewardId: string, childId: string, cost: number) => {
    if (!user) return;
    const child = profiles.find(p => p.id === childId);
    if (!child) return;
    if (child.stars < cost) return alert("Bintangmu belum cukup! 💪🌟");
    
    triggerCelebration('reward');
    await update(ref(db, `users/${user.uid}/profiles/${childId}`), { stars: child.stars - cost });
    await update(ref(db, `users/${user.uid}/rewards/${rewardId}`), { isClaimed: true });
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !user) return;
    await push(ref(db, `users/${user.uid}/profiles`), { 
      name: profileForm.name, role: profileForm.role || 'Anak', 
      stars: 0, maxStars: Number(profileForm.maxStars), 
      avatar: profileForm.avatar, theme: profileForm.theme 
    });
    setProfileForm({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
    setShowChildForm(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || profiles.length === 0 || !user) return;
    const baseTask = {
      title: taskForm.title, type: taskForm.type,
      recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none',
      reward: Number(taskForm.reward), isDone: false, isApproved: false,
    };
    if (taskForm.assignedTo === 'all') {
      profiles.forEach(async (p) => {
        await push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: p.id });
      });
    } else {
      await push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: taskForm.assignedTo });
    }
    setTaskForm({ ...taskForm, title: '' }); 
    setShowTaskForm(false);
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title || profiles.length === 0 || !user) return;
    const baseReward = {
      title: rewardForm.title, cost: Number(rewardForm.cost),
      isClaimed: false, isApproved: false,
    };
    if (rewardForm.assignedTo === 'all') {
      profiles.forEach(async (p) => {
        await push(ref(db, `users/${user.uid}/rewards`), { ...baseReward, assignedTo: p.id });
      });
    } else {
      await push(ref(db, `users/${user.uid}/rewards`), { ...baseReward, assignedTo: rewardForm.assignedTo });
    }
    setRewardForm({ ...rewardForm, title: '' });
    setShowRewardForm(false);
  };

  const handleApproveTask = async (taskId: string, childId: string | undefined, reward: number) => {
    if (!childId || !user) return;
    const child = profiles.find(p => p.id === childId);
    if (!child) return;
    await update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isApproved: true });
    await update(ref(db, `users/${user.uid}/profiles/${childId}`), { stars: Math.min(child.stars + reward, child.maxStars) });
  };

  const handleApproveReward = async (rewardId: string) => {
    if (!user) return;
    await update(ref(db, `users/${user.uid}/rewards/${rewardId}`), { isApproved: true });
  };

  const startEditProfile = (profile: Profile) => { setEditingProfileId(profile.id); setEditProfileForm({ ...profile }); };
  
  const saveEditProfile = async () => {
    if (!editingProfileId || !user) return;
    await update(ref(db, `users/${user.uid}/profiles/${editingProfileId}`), { 
      name: editProfileForm.name || '',
      role: editProfileForm.role || '',
      maxStars: Number(editProfileForm.maxStars || 50),
      avatar: editProfileForm.avatar || '👶',
      theme: editProfileForm.theme || 'from-pink-500 to-rose-400'
    });
    setEditingProfileId(null);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!user) return;
    if (window.confirm('Yakin menghapus akun ini beserta Misi dan Hadiahnya?')) {
      await remove(ref(db, `users/${user.uid}/profiles/${id}`));
      tasks.filter(t => t.assignedTo === id).forEach(t => remove(ref(db, `users/${user.uid}/tasks/${t.id}`)));
      rewards.filter(r => r.assignedTo === id).forEach(r => remove(ref(db, `users/${user.uid}/rewards/${r.id}`)));
    }
  };

  const startEditTask = (task: Task) => { setEditingTaskId(task.id); setEditTaskForm({ ...task }); };
  
  const saveEditTask = async () => {
    if (!editingTaskId || !user) return;
    const taskType = editTaskForm.type || 'Daily';
    const taskRecurrence = taskType === 'Daily' ? (editTaskForm.recurrence || 'daily') : 'none';
    await update(ref(db, `users/${user.uid}/tasks/${editingTaskId}`), { 
      title: editTaskForm.title || '',
      reward: Number(editTaskForm.reward || 0), 
      type: taskType,
      recurrence: taskRecurrence,
      assignedTo: editTaskForm.assignedTo || ''
    });
    setEditingTaskId(null);
  };
  
  const handleDeleteTask = async (id: string) => { user && await remove(ref(db, `users/${user.uid}/tasks/${id}`)); };

  const startEditReward = (reward: Reward) => { setEditingRewardId(reward.id); setEditRewardForm({ ...reward }); };
  
  const saveEditReward = async () => {
    if (!editingRewardId || !user) return;
    await update(ref(db, `users/${user.uid}/rewards/${editingRewardId}`), { 
      title: editRewardForm.title || '',
      cost: Number(editRewardForm.cost || 0),
      assignedTo: editRewardForm.assignedTo || ''
    });
    setEditingRewardId(null);
  };
  
  const handleDeleteReward = async (id: string) => { user && await remove(ref(db, `users/${user.uid}/rewards/${id}`)); };

  const getTaskLabel = (item: any) => {
    if (!item) return '🔄 Rutinitas';
    if (item.type === 'Achievement') return '🏆 Pencapaian';
    if (item.recurrence === 'daily') return '🔄 Harian';
    if (item.recurrence === 'weekly') return '🔄 Mingguan';
    if (item.recurrence === 'monthly') return '🔄 Bulanan';
    return '🔄 Rutinitas';
  };

  const toggleChildRoutine = (childId: string) => {
    setChildRoutineOpen(prev => ({ ...prev, [childId]: !prev[childId] }));
  };

  const toggleChildAchieve = (childId: string) => {
    setChildAchieveOpen(prev => ({ ...prev, [childId]: !prev[childId] }));
  };

  // =========================================================================
  // VIEW RENDERERS UTAMA (SINKRON 100% SESUAI FILE VALID DAN VIDEO)
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

  // 🔒 A. TAMPILAN HALAMAN LOGIN AWAL MINIMALIS 🌟
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

  // ⏳ B. TAMPILAN AKTIVASI PASIF LYNK.ID (PREMIUM = FALSE)
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
            Sistem kami sedang mencocokkan data pendaftaran Anda dengan data invoice pembelian dari Lynk.id. Mohon tunggu 5-10 menit ya, halaman ini akan terbuka otomatis secara realtime begitu aktivasi selesai oleh admin di database.
          </p>
          <div className="pt-2">
            <div className="text-[11px] text-slate-500 animate-pulse font-medium">🛡️ Sinkronisasi aman dengan database Lynk.id...</div>
            <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors underline block mx-auto mt-6">🚪 Keluar / Ganti Akun</button>
          </div>
        </div>
      </div>
    );
  }

  // 👦 C. RENDER VIEW ANAK (DENGAN HIGH FIDELITY VISUAL TOPLES KACA ASLI)
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
            <p className="text-slate-400">Ayah/Ibu perlu menambahkan profil anak di panel orang tua terlebih dahulu.</p>
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
                <div className="flex flex-row items-center justify-between gap-4 mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`text-5xl bg-gradient-to-br ${profile.theme} p-4 rounded-[2rem] shadow-lg transform -rotate-3`}>{profile.avatar}</div>
                    <div>
                      <h2 className="text-3xl font-black text-white">{profile.name}</h2>
                      <p className="text-slate-400 font-medium text-lg mt-1">{profile.role}</p>
                    </div>
                  </div>
                  
                  {/* Desain Silinder Toples Mengkilap Premium */}
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

                <div className="space-y-3 relative z-10 mb-6">
                  {/* Accordion Misi Harian */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => toggleChildRoutine(profile.id)} className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left">
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
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`w-full sm:w-auto px-4 py-2 rounded-lg font-black text-xs transition-all ${item.isDone ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md'}`}>
                              {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion Misi Pencapaian */}
                  <div className="bg-slate-900/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button type="button" onClick={() => toggleChildAchieve(profile.id)} className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left">
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
                            <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`w-full sm:w-auto px-4 py-2 rounded-lg font-black text-xs transition-all ${item.isDone ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md'}`}>
                              {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Katalog Penukaran Hadiah Sisi Bawah */}
              <div className="relative z-10 mt-4 border-t border-slate-700/60 pt-4">
                <button onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className="w-full py-3 rounded-xl font-black text-sm bg-slate-700 text-white">🎁 Katalog Tukar Hadiah</button>
                {activeCatalogId === profile.id && (
                  <div className="mt-3 bg-slate-900/60 border border-slate-700 rounded-2xl p-4 space-y-2">
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).map(reward => (
                      <div key={reward.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-800 text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{reward.title}</p>
                          <p className="text-yellow-400 font-bold">💰 Harga: {reward.cost} ⭐</p>
                        </div>
                        <button onClick={() => handleClaimReward(reward.id, profile.id, reward.cost)} disabled={reward.isClaimed} className={`px-3 py-1 rounded-lg font-bold ${reward.isClaimed ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-500 text-white'}`}>{reward.isClaimed ? '⏳' : 'Tukar'}</button>
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

  // 👨 D. RENDER VIEW ORANG TUA (MANAJEMEN COMPONENT EDIT & MULTI-DISTRIBUSI ALL)
  const renderParentView = () => {
    const pendingTasks = tasks.filter(t => t.isDone && !t.isApproved);
    const pendingRewards = rewards.filter(r => r.isClaimed && !r.isApproved);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.isApproved).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <header className="border-b border-slate-700 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">Halo, Ayah & Ibu! 👋</h1>
            <p className="text-slate-400 mt-2 text-sm">Pusat Kendali Aplikasi Keluarga.</p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 overflow-x-auto w-full md:w-auto">
            <button type="button" onClick={() => setParentTab('stats')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'stats' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📊 Statistik</button>
            <button type="button" onClick={() => setParentTab('approval')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'approval' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🔔 Persetujuan {(pendingTasks.length > 0 || pendingRewards.length > 0) && (<span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingTasks.length + pendingRewards.length}</span>)}</button>
            <button type="button" onClick={() => setParentTab('manage')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'manage' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>⚙️ Kelola</button>
            <button type="button" onClick={handleLogout} className="px-4 py-2 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all ml-2">🚪 Keluar</button>
          </div>
        </header>

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
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'approval' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg text-sm">🎯</span> Misi Selesai ({pendingTasks.length})</h2>
              {pendingTasks.length === 0 && <p className="text-slate-500 text-sm">Belum ada tugas menunggu.</p>}
              <div className="space-y-3">
                {pendingTasks.map(task => {
                  const child = profiles.find(p => String(p.id) === String(task.assignedTo));
                  return (
                    <div key={task.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-slate-700">
                      <div><p className="text-slate-400 text-xs">{child?.name || 'Anak'} menyelesaikan:</p><p className="text-base font-bold text-white">{task.title}</p></div>
                      <button type="button" onClick={() => handleApproveTask(task.id, child?.id, task.reward)} className="bg-green-500 hover:bg-green-400 text-slate-900 font-black px-4 py-2 rounded-xl text-sm transition-all shadow-md">Setujui +{task.reward}⭐</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="bg-orange-500/20 text-orange-400 p-1.5 rounded-lg text-sm">🎁</span> Klaim Hadiah ({pendingRewards.length})</h2>
              {pendingRewards.length === 0 && <p className="text-slate-500 text-sm">Belum ada klaim hadiah menunggu.</p>}
              <div className="space-y-3">
                {pendingRewards.map(reward => {
                  const child = profiles.find(p => String(p.id) === String(reward.assignedTo));
                  return (
                    <div key={reward.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-slate-700">
                      <div><p className="text-slate-400 text-xs">{child?.name || 'Anak'} menukarkan:</p><p className="text-base font-bold text-white">{reward.title}</p><p className="text-yellow-400 text-xs font-bold">Biaya: {reward.cost} ⭐</p></div>
                      <button type="button" onClick={() => handleApproveReward(reward.id)} className="bg-orange-500 hover:bg-orange-400 text-white font-black px-4 py-2 rounded-xl text-sm transition-all shadow-md">Berikan Hadiah ✓</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'manage' && (
          <div className="space-y-6 animate-fade-in">
            {/* --- ACCORDION 1: TAMBAH PROFIL --- */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">👶 Tambah Profil Anak Baru</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showChildForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showChildForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 animate-fade-in">
                  <form onSubmit={handleAddProfile} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Nama Panggilan</label><input type="text" placeholder="Nama anak" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" /></div>
                      <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Status / Peran</label><input type="text" placeholder="Contoh: Kakak / Adik" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Target Maks</label><input type="number" required value={profileForm.maxStars} onChange={e => setProfileForm({...profileForm, maxStars: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" /></div>
                      <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Avatar</label><select value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-xl cursor-pointer"><option value="👶">👶 Bayi</option><option value="👧">👧 Anak Perempuan</option><option value="👦">👦 Anak Laki-laki</option><option value="👸">👸 Putri</option><option value="🤴">🤴 Pangeran</option><option value="🦸‍♀️">🦸‍♀️ Heroine</option><option value="🦸‍♂️">🦸‍♂️ Hero</option><option value="🥷">🥷 Ninja</option><option value="🦁">🦁 Singa</option><option value="🐼">🐼 Panda</option><option value="🦊">🦊 Rubah</option><option value="🐸">🐸 Katak</option></select></div>
                      <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Tema Warna Background</label><select value={profileForm.theme} onChange={e => setProfileForm({...profileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="from-pink-500 to-rose-400">🩷 Pink Ceria</option><option value="from-cyan-500 to-blue-400">🩵 Biru Samudra</option><option value="from-purple-500 to-indigo-400">💜 Ungu Galaksi</option><option value="from-emerald-400 to-teal-400">💚 Hijau Zamrud</option><option value="from-orange-400 to-red-400">❤️ Merah Jingga</option><option value="from-yellow-400 to-amber-500">💛 Kuning Emas</option></select></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-md">+ Tambah Profil</button>
                  </form>
                </div>
              )}
            </div>

            {/* --- ACCORDION 2: TAMBAH MISI DENGAN LOGIKA ALL SAKTI --- */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">🎯 Tambah Misi Baru</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showTaskForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showTaskForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 animate-fade-in">
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                      <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-bold">
                        <option value="all">🌟 Semua Anak</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Judul Misi</label><input type="text" placeholder="Contoh: Merapikan Tempat Tidur" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" /></div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Kategori</label><select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="Daily">🔄 Rutinitas Berulang</option><option value="Achievement">🏆 Tantangan Pencapaian</option></select></div>
                      {taskForm.type === 'Daily' && (<div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Frekuensi</label><select value={taskForm.recurrence} onChange={e => setTaskForm({...taskForm, recurrence: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option></select></div>)}
                      <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Upah Bintang</label><input type="number" value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" /></div>
                    </div>
                    <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold px-4 py-3 rounded-xl transition-all">+ Tambah Misi</button>
                  </form>
                </div>
              )}
            </div>

            {/* --- ACCORDION 3: TAMBAH HADIAH REWARD DENGAN LOGIKA ALL SAKTI --- */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowRewardForm(!showRewardForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">🎁 Tambah Hadiah Baru</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showRewardForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showRewardForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 animate-fade-in">
                  <form onSubmit={handleAddReward} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                      <select value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 cursor-pointer font-bold">
                        <option value="all">🌟 Semua Anak</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Nama Hadiah</label><input type="text" placeholder="Contoh: Es Krim Rasa Cokelat" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 font-medium" /></div>
                    <div><label className="text-xs text-slate-400 mb-1 block">Harga Bintang</label><input type="number" value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 text-center font-bold text-yellow-400" /></div>
                    <button type="submit" className="w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black px-4 py-3 rounded-xl transition-all shadow-md">+ Tambah Hadiah</button>
                  </form>
                </div>
              )}
            </div>

            {/* --- PUSAT INLINE EDITING MANAGEMENT (EDIT/HAPUS HARMONIS) --- */}
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl space-y-6">
              <h2 className="text-lg font-black text-white border-b border-slate-700 pb-3 flex items-center gap-2">🛠️ Pusat Kelola & Edit Komponen</h2>
              
              {/* List & Inline Edit Profil */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">● Profil Akun Anak</p>
                {profiles.map(p => (
                  <div key={p.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                    {editingProfileId === p.id ? (
                      <div className="space-y-3 text-xs animate-fade-in">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white w-full font-bold" value={editProfileForm.name || ''} onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})} placeholder="Nama" />
                          <input type="text" className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white w-full" value={editProfileForm.role || ''} onChange={e => setEditProfileForm({...editProfileForm, role: e.target.value})} placeholder="Peran" />
                        </div>
                        <div className="flex flex-row gap-2">
                          <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Target</label><input type="number" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editProfileForm.maxStars || 50} onChange={e => setEditProfileForm({...editProfileForm, maxStars: Number(e.target.value)})} /></div>
                          <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Avatar</label><select value={editProfileForm.avatar || '👶'} onChange={e => setEditProfileForm({...editProfileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="👶">👶</option><option value="👧">👧</option><option value="👦">👦</option><option value="👸">👸</option><option value="🤴">🤴</option><option value="🦸‍♀️">🦸‍♀️</option><option value="🦸‍♂️">🦸‍♂️</option><option value="🥷">🥷</option><option value="🦁">🦁</option><option value="🐼">🐼</option><option value="🦊">🦊</option><option value="🐸">🐸</option></select></div>
                          <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Tema</label><select value={editProfileForm.theme || 'from-pink-500 to-rose-400'} onChange={e => setEditProfileForm({...editProfileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="from-pink-500 to-rose-400">🩷 Pink</option><option value="from-cyan-500 to-blue-400">🩵 Biru</option><option value="from-purple-500 to-indigo-400">💜 Ungu</option><option value="from-emerald-400 to-teal-400">💚 Hijau</option><option value="from-orange-400 to-red-400">❤️ Merah</option><option value="from-yellow-400 to-amber-500">💛 Kuning</option></select></div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50"><button type="button" onClick={() => setEditingProfileId(null)} className="text-slate-400 font-bold px-3 py-1.5 text-xs">Batal</button><button type="button" onClick={saveEditProfile} className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black text-xs shadow-md">Simpan</button></div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2"><span className="text-xl">{p.avatar}</span><span className="text-white font-bold">{p.name}</span><span className="text-slate-500 text-xs">({p.role})</span></div>
                        <div className="flex gap-3 text-xs font-bold"><button type="button" onClick={() => startEditProfile(p)} className="text-blue-400 hover:underline">Edit</button><button type="button" onClick={() => handleDeleteProfile(p.id)} className="text-red-400 hover:underline">Hapus</button></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* List & Inline Edit Misi */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">● Daftar Semua Misi</p>
                {tasks.map(t => {
                  const targetedChild = profiles.find(p => p.id === t.assignedTo);
                  return (
                    <div key={t.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                      {editingTaskId === t.id ? (
                        <div className="space-y-3 text-xs animate-fade-in">
                          <input type="text" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold" value={editTaskForm.title || ''} onChange={e => setEditTaskForm({...editTaskForm, title: e.target.value})} placeholder="Judul Misi" />
                          <div className="flex gap-2">
                            <input type="number" className="w-24 bg-slate-800 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editTaskForm.reward || 0} onChange={e => setEditTaskForm({...editTaskForm, reward: Number(e.target.value)})} placeholder="Reward" />
                            <select value={editTaskForm.type || 'Daily'} onChange={e => setEditTaskForm({...editTaskForm, type: e.target.value})} className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white w-full"><option value="Daily">🔄 Rutinitas</option><option value="Achievement">🏆 Pencapaian</option></select>
                            <select value={editTaskForm.assignedTo || ''} onChange={e => setEditTaskForm({...editTaskForm, assignedTo: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-300 text-xs w-full">{profiles.map(p => <option key={p.id} value={p.id}>Untuk: {p.name}</option>)}</select>
                          </div>
                          <div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => setEditingTaskId(null)} className="text-slate-400 hover:text-white px-3 py-1.5 text-sm font-bold">Batal</button><button type="button" onClick={saveEditTask} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold">Simpan</button></div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm">
                          <div><p className="font-bold text-white">{t.title}</p><p className="text-slate-500 text-xs">Anak: <b className="text-slate-300">{targetedChild?.name || 'Semua'}</b> | Upah: <b className="text-yellow-400">{t.reward} ⭐</b> | Jenis: <b className="text-slate-400">{getTaskLabel(t)}</b></p></div>
                          <div className="flex gap-3 text-xs font-bold"><button type="button" onClick={() => startEditTask(t)} className="text-blue-400 hover:underline">Edit</button><button type="button" onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:underline">Hapus</button></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* List & Inline Edit Hadiah */}
              <div className="space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">● Daftar Semua Hadiah</p>
                {rewards.map(r => {
                  const targetedChild = profiles.find(p => p.id === r.assignedTo);
                  return (
                    <div key={r.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-700">
                      {editingRewardId === r.id ? (
                        <div className="space-y-3 text-xs animate-fade-in">
                          <input type="text" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold" value={editRewardForm.title || ''} onChange={e => setEditRewardForm({...editRewardForm, title: e.target.value})} placeholder="Nama Hadiah" />
                          <div className="flex gap-2">
                            <input type="number" className="w-24 bg-slate-800 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editRewardForm.cost || 0} onChange={e => setEditRewardForm({...editRewardForm, cost: Number(e.target.value)})} placeholder="Harga" />
                            <select value={editRewardForm.assignedTo || ''} onChange={e => setEditRewardForm({...editRewardForm, assignedTo: e.target.value})} className="bg-slate-800 border border-slate-600 p-2 rounded-lg text-white w-full">{profiles.map(p => <option key={p.id} value={p.id}>Untuk: {p.name}</option>)}</select>
                          </div>
                          <div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => setEditingRewardId(null)} className="text-slate-400 hover:text-white px-3 py-1.5 text-sm font-bold">Batal</button><button type="button" onClick={saveEditReward} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold">Simpan</button></div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center text-sm">
                          <div><p className="font-bold text-white">{r.title}</p><p className="text-slate-500 text-xs">Anak: <b className="text-slate-300">{targetedChild?.name || 'Semua'}</b> | Harga: <b className="text-yellow-400">{r.cost} ⭐</b></p></div>
                          <div className="flex gap-3 text-xs font-bold"><button type="button" onClick={() => startEditReward(r)} className="text-blue-400 hover:underline">Edit</button><button type="button" onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:underline">Hapus</button></div>
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500">
          <div className="text-9xl animate-bounce drop-shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            {celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}
          </div>
        </div>
      )}

      {currentRole === 'child' ? renderChildView() : renderParentView()}

      {/* FOOTER SWITCHER NAVIGASI MODE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>👦👧 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}