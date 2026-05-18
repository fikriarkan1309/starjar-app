import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
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
  // --- STATE AUTHENTICATION & PREMIUM STATUS ---
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingPremium, setLoadingPremium] = useState<boolean>(true);
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- STATE CORE APP ---
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

  // --- MENDENGARKAN DATABASE BERDASARKAN USER UID ---
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

    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      const val = snapshot.val();
      setIsPremium(!!val);
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        // Daftarkan email di DB untuk mempermudah pencarian owner saat aktivasi
        await update(ref(db, `users/${res.user.uid}`), { isPremium: false, email: res.user.email });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      if (err.code === 'auth/weak-password') setAuthError('Password minimal 6 karakter.');
      else if (err.code === 'auth/email-already-in-use') setAuthError('Email sudah terdaftar.');
      else if (err.code === 'auth/invalid-credential') setAuthError('Email atau Password salah.');
      else setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Yakin ingin keluar aplikasi?')) {
      await signOut(auth);
    }
  };

  const [profileForm, setProfileForm] = useState({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: 'all' });
  const [rewardForm, setRewardForm] = useState({ title: '', cost: 10, assignedTo: 'all' });

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    triggerCelebration('task');
    await update(ref(db, `users/${user.uid}/tasks/${taskId}`), { isDone: true });
  };

  const handleClaimReward = async (rewardId: string, childId: string, cost: number) => {
    if (!user) return;
    const child = profiles.find(p => p.id === childId);
    if (!child || child.stars < cost) return alert("Bintangmu belum cukup! 💪🌟");
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
    const baseTask = { title: taskForm.title, type: taskForm.type, recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none', reward: Number(taskForm.reward), isDone: false, isApproved: false };
    if (taskForm.assignedTo === 'all') {
      profiles.forEach(async (p) => { await push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: p.id }); });
    } else {
      await push(ref(db, `users/${user.uid}/tasks`), { ...baseTask, assignedTo: taskForm.assignedTo });
    }
    setTaskForm({ ...taskForm, title: '' }); 
    setShowTaskForm(false);
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title || profiles.length === 0 || !user) return;
    const baseReward = { title: rewardForm.title, cost: Number(rewardForm.cost), isClaimed: false, isApproved: false };
    if (rewardForm.assignedTo === 'all') {
      profiles.forEach(async (p) => { await push(ref(db, `users/${user.uid}/rewards`), { ...baseReward, assignedTo: p.id }); });
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

  const handleDeleteProfile = async (id: string) => {
    if (!user) return;
    if (window.confirm('Hapus akun ini?')) await remove(ref(db, `users/${user.uid}/profiles/${id}`));
  };

  // =========================================================================
  // VIEW RENDERERS
  // =========================================================================
  if (loadingAuth || loadingPremium) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Memuat... 🌟</div>;
  }

  // 🔒 HALAMAN LOGIN USER (LOGO BINTANG TUNGGAL & NAMA STARJAR BERSIH)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] border-2 border-slate-700/60 p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-6xl block">🌟</span>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">StarJar</h1>
            <p className="text-slate-400 text-sm">Aplikasi Toples Disiplin Anak Digital</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold mb-1 block">Email Orang Tua</label>
              <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white" placeholder="nama@email.com" />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold mb-1 block">Password</label>
              <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white" placeholder="••••••••" />
            </div>
            {authError && <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{authError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black py-3 rounded-xl text-sm">
              {isRegistering ? '🔥 Daftar Akun Baru' : '🔑 Masuk Aplikasi'}
            </button>
          </form>
          <div className="text-center border-t border-slate-700/60 pt-4">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-xs font-bold text-cyan-400 hover:underline">
              {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar Baru'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🛑 HALAMAN PROSES PREMIUM (ALUR JUALAN LYNK.ID)
  if (!isPremium) {
    const waMessage = encodeURIComponent(`Halo Admin StarJar, saya sudah membeli via Lynk.id dan baru saja mendaftar.\n\nMohon bantu aktivasi akun saya.\nEmail Terdaftar: ${user.email}`);
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-[2.5rem] border-2 border-yellow-500/20 p-8 text-center space-y-6">
          <span className="text-7xl block animate-pulse">⏳</span>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Akun Sedang Diproses!</h1>
          <p className="text-slate-400 text-sm">
            Sip, akun <span className="text-white font-bold">{user.email}</span> berhasil didaftarkan!
          </p>
          <p className="text-slate-400 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-700 leading-relaxed">
            Karena Anda sudah membayar di Lynk.id, mohon tunggu beberapa menit ya. Admin sedang memverifikasi data dan mengaktifkan toples bintang keluarga Anda (Biasanya cuma 5-10 menit).
          </p>
          <div className="space-y-3">
            <a href={`https://wa.me/628123456789?text=${waMessage}`} target="_blank" rel="noopener noreferrer" className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-3 rounded-xl text-sm">
              💬 Hubungi Admin (Jika Belum Aktif)
            </a>
            <button type="button" onClick={handleLogout} className="text-xs text-slate-500 underline block mx-auto">Keluar / Ganti Akun</button>
          </div>
        </div>
      </div>
    );
  }

  const renderChildView = () => (
    <div className="space-y-12 max-w-6xl mx-auto">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-cyan-400">Misi Bintang Hari Ini! 🚀</h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {profiles.map(profile => {
          const fillPercentage = Math.min((profile.stars / profile.maxStars) * 100, 100);
          const childRoutines = tasks.filter(t => String(t.assignedTo) === String(profile.id) && t.type === 'Daily' && !t.isApproved);
          return (
            <div key={profile.id} className="bg-slate-800/60 border border-slate-700 p-6 rounded-[2rem] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{profile.avatar}</span>
                    <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                  </div>
                  <div className="text-right font-black text-xl text-yellow-400">{profile.stars}/{profile.maxStars} ⭐</div>
                </div>
                <div className="space-y-2">
                  {childRoutines.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                      <span className="text-sm font-bold text-white">{t.title}</span>
                      <button onClick={() => handleCompleteTask(t.id)} disabled={t.isDone} className="bg-amber-400 text-slate-900 text-xs font-black px-3 py-1 rounded-lg">{t.isDone ? '⏳' : `+${t.reward} ⭐`}</button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className="w-full mt-4 py-2 bg-slate-700 rounded-xl text-xs font-bold">🎁 Katalog Hadiah</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderParentView = () => {
    const pendingTasks = tasks.filter(t => t.isDone && !t.isApproved);
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-700 pb-4">
          <div><h1 className="text-2xl font-black text-white">Panel Orang Tua</h1></div>
          <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setParentTab('stats')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${parentTab === 'stats' ? 'bg-indigo-500' : ''}`}>📊 Stats</button>
            <button onClick={() => setParentTab('approval')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${parentTab === 'approval' ? 'bg-slate-600' : ''}`}>🔔 Approval ({pendingTasks.length})</button>
            <button onClick={() => setParentTab('manage')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${parentTab === 'manage' ? 'bg-blue-500' : ''}`}>⚙️ Kelola</button>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400">🚪 Keluar</button>
          </div>
        </header>

        {parentTab === 'stats' && (
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-3">
            {profiles.map(p => (
              <div key={p.id} className="text-sm font-bold text-white flex justify-between"><span>{p.avatar} {p.name}</span><span>{p.stars} ⭐</span></div>
            ))}
          </div>
        )}

        {parentTab === 'approval' && (
          <div className="space-y-2">
            {pendingTasks.map(t => {
              const c = profiles.find(p => String(p.id) === String(t.assignedTo));
              return (
                <div key={t.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs">
                  <div><p className="text-white font-bold">{t.title}</p><p className="text-slate-400">Anak: {c?.name}</p></div>
                  <button onClick={() => handleApproveTask(t.id, c?.id, t.reward)} className="bg-green-500 text-slate-900 font-black px-3 py-1 rounded-lg">Setujui</button>
                </div>
              );
            })}
          </div>
        )}

        {parentTab === 'manage' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-4 py-3 flex justify-between text-xs font-bold text-white bg-slate-800/50"><span>👶 Tambah Akun Anak</span></button>
              {showChildForm && (
                <form onSubmit={handleAddProfile} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                  <input type="text" placeholder="Nama Panggilan" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <button type="submit" className="w-full bg-blue-500 text-white font-bold py-2 rounded-lg">Simpan</button>
                </form>
              )}
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-4 py-3 flex justify-between text-xs font-bold text-white bg-slate-800/50"><span>🎯 Tambah Misi Baru</span></button>
              {showTaskForm && (
                <form onSubmit={handleAddTask} className="p-4 border-t border-slate-700 bg-slate-900/10 space-y-3 text-xs">
                  <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <input type="text" placeholder="Nama Misi" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                  <button type="submit" className="w-full bg-slate-700 text-white font-bold py-2 rounded-lg">Simpan Misi</button>
                </form>
              )}
            </div>
            <div className="bg-slate-800/40 p-4 border border-slate-700 rounded-xl space-y-2 text-xs">
              {profiles.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-700"><span className="text-white font-bold">{p.avatar} {p.name}</span><button type="button" onClick={() => handleDeleteProfile(p.id)} className="text-red-400 font-bold">Hapus</button></div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="text-9xl animate-bounce">{celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}</div>
        </div>
      )}
      {currentRole === 'child' ? renderChildView() : renderParentView()}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>👦👧 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}