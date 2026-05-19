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

// --- DATA TEMPLATE POPULER STARJAR (LANGSUNG DITANAM AMAN) ---
const MISSION_TEMPLATES = [
  { id: 'm1', title: 'Sikat Gigi Tanpa Drama (Pagi & Malam)', points: 1, category: '🏠 Kemandirian' },
  { id: 'm2', title: 'Taruh Baju Kotor ke Keranjang', points: 1, category: '🏠 Kemandirian' },
  { id: 'm3', title: 'Merapikan Mainan Sendiri', points: 2, category: '🏠 Kemandirian' },
  { id: 'm4', title: 'Habisin Makanan di Piring', points: 1, category: '🏠 Kemandirian' },
  { id: 'm5', title: 'Pakai Baju / Sepatu Sendiri', points: 1, category: '🏠 Kemandirian' },
  { id: 'm6', title: 'Matikan HP Tepat Waktu (No Ngamuk)', points: 2, category: '📚 Belajar & Gadget' },
  { id: 'm7', title: 'Kerjakan PR / Tugas Tepat Waktu', points: 2, category: '📚 Belajar & Gadget' },
  { id: 'm8', title: 'Siapkan Buku Pelajaran Besok Malam', points: 1, category: '📚 Belajar & Gadget' },
  { id: 'm9', title: 'Membaca Buku Non-Pelajaran (15 Menit)', points: 2, category: '📚 Belajar & Gadget' },
  { id: 'm10', title: 'Bicara Tenang saat Kesal (Anti-Tantrum)', points: 3, category: '❤️ Karakter & Bantuan' },
  { id: 'm11', title: 'Berbagi Mainan/Makanan ke Kakak/Adik', points: 2, category: '❤️ Karakter & Bantuan' },
  { id: 'm12', title: 'Bantu Ibu Buang Sampah / Lap Meja', points: 1, category: '❤️ Karakter & Bantuan' },
  { id: 'm13', title: 'Ucapkan Tolong, Maaf, & Terima Kasih', points: 2, category: '❤️ Karakter & Bantuan' },
  { id: 'm14', title: 'Shalat / Beribadah Tepat Waktu', points: 3, category: '🕌 Ibadah & Spiritual' },
  { id: 'm15', title: 'Membaca Kitab Suci / Mengaji (1 Lembar)', points: 2, category: '🕌 Ibadah & Spiritual' },
  { id: 'm16', title: 'Hafalan Doa Pendek / Surat Pendek', points: 3, category: '🕌 Ibadah & Spiritual' },
  { id: 'm17', title: 'Berdoa Sebelum Makan & Tidur', points: 1, category: '🕌 Ibadah & Spiritual' },
  { id: 'm18', title: 'Masukin Koin ke Kotak Amal / Celengan', points: 2, category: '🕌 Ibadah & Spiritual' },
  { id: 'm19', title: 'Mencoba 3 Suap Sayur / Buah Baru', points: 2, category: '🍏 Kesehatan & Makan' },
  { id: 'm20', title: 'Minum Air Putih 4 Gelas Sehari', points: 1, category: '🍏 Kesehatan & Makan' },
  { id: 'm21', title: 'Tidur Siang Tepat Waktu (No Drama)', points: 2, category: '🍏 Kesehatan & Makan' },
  { id: 'm22', title: 'Cuci Tangan Pakai Sabun Sebelum Makan', points: 1, category: '🍏 Kesehatan & Makan' }
];

const REWARD_TEMPLATES = [
  { id: 'r1', title: 'Ekstra Screen Time 30 Menit', points: 5, category: '🔓 Hak Istimewa (Gratis)' },
  { id: 'r2', title: 'Bebas Pilih Menu Makan Malam Keluarga', points: 10, category: '🔓 Hak Istimewa (Gratis)' },
  { id: 'r3', title: 'Tidur Lebih Lambat 30 Menit di Malam Minggu', points: 7, category: '🔓 Hak Istimewa (Gratis)' },
  { id: 'r4', title: 'Boleh Undang Teman Main ke Rumah', points: 15, category: '🔓 Hak Istimewa (Gratis)' },
  { id: 'r5', title: 'Beli Es Krim / Camilan Favorit', points: 8, category: '🎁 Materiil & Jajanan' },
  { id: 'r6', title: 'Pergi Jalan-Jalan ke Taman / Playground', points: 25, category: '🎁 Materiil & Jajanan' },
  { id: 'r7', title: 'Beli Mainan Impian / Wishlist Utama', points: 50, category: '🎁 Materiil & Jajanan' },
  { id: 'r8', title: 'Dibacain 2 Cerita Dongeng Sebelum Tidur', points: 6, category: '👪 Quality Time (Gratis)' },
  { id: 'r9', title: 'Main Board Game / Puzzle Bareng Ayah', points: 12, category: '👪 Quality Time (Gratis)' },
  { id: 'r10', title: 'Sesi Pelukan 10 Menit Sebelum Tidur', points: 5, category: '👪 Quality Time (Gratis)' },
  { id: 'r11', title: 'Bikin Bioskop Mini di Kamar (Nonton Bareng)', points: 15, category: '👪 Quality Time (Gratis)' },
  { id: 'r12', title: 'Tukar "Kupon Hadiah Misteri" (Gacha)', points: 10, category: '❓ Kupon Misteri' }
];

// --- CONFIG FIREBASE STARJAR MILIK FIKRI ---
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
  const avatarOptions = ['👶', '👧', '👦', '👸', '🤴', '🦸‍♀️', '🦸‍♂️', '🥷', '🦁', '🐼', '🦊', '🐸'];
  const themeOptions = [
    { value: 'from-pink-500 to-rose-400', label: '🩷 Pink Ceria' },
    { value: 'from-cyan-500 to-blue-400', label: '🩵 Biru Samudra' },
    { value: 'from-purple-500 to-indigo-400', label: '💜 Ungu Galaksi' },
    { value: 'from-emerald-400 to-teal-400', label: '💚 Hijau Zamrud' },
    { value: 'from-orange-400 to-red-400', label: '❤️ Merah Jingga' },
    { value: 'from-yellow-400 to-amber-500', label: '💛 Kuning Emas' }
  ];

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

  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<'stats' | 'approval' | 'manage'>('manage');
  const [celebration, setCelebration] = useState<'task' | 'reward' | null>(null);

  const [showChildForm, setShowChildForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);

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

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<Profile>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<Task>>({});
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardForm, setEditRewardForm] = useState<Partial<Reward>>({});

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
        assignedTo: String(data[key].assignedTo || '')
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
        assignedTo: String(data[key].assignedTo || '')
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
    setTaskForm({ ...taskForm, title: '', reward: 2 }); 
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
      await push(ref(db, `users/${user.uid}/rewards`), { ...rewardForm, assignedTo: rewardForm.assignedTo });
    }
    setRewardForm({ ...rewardForm, title: '', cost: 10 });
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
      tasks.filter(t => String(t.assignedTo) === String(id)).forEach(t => remove(ref(db, `users/${user.uid}/tasks/${t.id}`)));
      rewards.filter(r => String(r.assignedTo) === String(id)).forEach(r => remove(ref(db, `users/${user.uid}/rewards/${r.id}`)));
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthSuccess('');
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await update(ref(db, `users/${res.user.uid}`), { isPremium: false, email: res.user.email || '' });
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
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {authError && <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{authError}</p>}
            {authSuccess && <p className="text-xs text-green-400 font-bold text-center bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">{authSuccess}</p>}

            <button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-90 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wider">
              {isRegistering ? 'Buat Akun Keluarga' : 'Masuk Dashboard'}
            </button>
          </form>

          <div className="flex flex-col items-center justify-center gap-3 pt-4 border-t border-slate-700/50 text-xs">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-slate-300 hover:text-yellow-400 font-bold underline transition-colors">
              {isRegistering ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar Baru'}
            </button>
            {!isRegistering && (
              <button type="button" onClick={handleForgotPassword} className="text-slate-500 hover:text-slate-300 transition-colors">
                Lupa Password? Reset via Email
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
          <span className="text-7xl block animate-bounce">🔒</span>
          <h2 className="text-2xl font-black text-white">Akun Anda Belum Aktif</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Halo Ayah & Ibu! Terima kasih sudah mendaftar. Saat ini kami sedang mencocokkan data pendaftaran Anda dengan data invoice pembelian dari Lynk.id.
            Mohon tunggu 5-10 menit ya, halaman ini akan terbuka otomatis secara realtime begitu aktivasi selesai oleh admin di database.
          </p>
          <div className="pt-2">
            <div className="text-[11px] text-slate-500 animate-pulse font-medium">🛡️ Sinkronisasi aman dengan database Lynk.id...</div>
            <button type="button" onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors underline block mx-auto mt-6">🚪 Keluar / Ganti Akun</button>
          </div>
        </div>
      </div>
    );
  }

  const renderChildView = () => (
    <div className="space-y-12 w-full mx-auto animate-fade-in px-2 md:px-4">
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 tracking-tight drop-shadow-sm">
          Misi Bintang Hari Ini! 🚀
        </h1>
        <p className="text-slate-400 text-lg font-medium">Isi toplesmu dengan bintang kebaikan!</p>
      </header>

      {profiles.length === 0 && (
        <div className="text-center p-12 bg-slate-800/50 rounded-3xl border border-slate-700 max-w-6xl mx-auto">
          <span className="text-6xl mb-4 block">👋</span>
          <h2 className="text-2xl font-bold text-white mb-2">Belum ada profil Anak</h2>
          <p className="text-slate-400">Ayah/Ibu perlu menambahkan profil anak di panel Ortu terlebih dahulu.</p>
        </div>
      )}

      {/* MODIFIKASI LAYOUT: SCROLL KE SAMPING PADA IPAD & PC, VERTikal di HP */}
      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-8 items-start md:pb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent w-full justify-center md:justify-start">
        {profiles.map(profile => {
          const fillPercentage = Math.min((profile.stars / profile.maxStars) * 100, 100);
          const childTasks = tasks.filter(t => String(t.assignedTo) === String(profile.id));
          const childRoutines = childTasks.filter(t => t.type === 'Daily');
          const childAchievements = childTasks.filter(t => t.type === 'Achievement');
          const childRewards = rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved);

          const isRoutineOpen = !!childRoutineOpen[profile.id];
          const isAchieveOpen = !!childAchieveOpen[profile.id];

          return (
            // BALIKIN UI GAMBAR 3: BACKGROUND GRADASI PENUH MENGIKUTI TEMA PROFIL
            <div key={profile.id} className={`w-full md:w-[450px] md:flex-shrink-0 bg-gradient-to-br ${profile.theme} rounded-[3rem] p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden text-slate-900 border border-white/10`}>
              
              {/* HEADER KARTU ANAK DENGAN TEKS BAYANGAN PUTIH AGAR JELAS */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div>
                  <span className="text-6xl md:text-7xl block filter drop-shadow-md">{profile.avatar}</span>
                  <h2 className="text-2xl font-black mt-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">{profile.name}</h2>
                  <span className="text-[10px] bg-black/30 text-white font-black px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">{profile.role}</span>
                </div>

                {/* VISUAL TOPLES KACA DIGITAL */}
                <div className="relative w-44 h-60 bg-white/15 rounded-[2.5rem] border-4 border-white/30 shadow-[inset_0_4px_20px_rgba(255,255,255,0.2)] flex flex-col justify-end p-4 overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/20 to-transparent z-10 flex items-center justify-center">
                    <div className="w-16 h-2.5 bg-amber-950/40 border border-black/20 rounded-b-md shadow-sm"></div>
                  </div>
                  
                  {/* PENGISIAN CAIRAN KUNING EMAS BINTANG TETAP KUNING SESUAI GAMBAR 3 */}
                  <div className="w-full rounded-b-[1.8rem] bg-gradient-to-t from-yellow-400 to-amber-500 transition-all duration-1000 relative shadow-[inset_0_2px_10px_rgba(255,255,255,0.4)]" style={{ height: `${fillPercentage}%` }}>
                    {fillPercentage > 5 && (
                      <div className="absolute inset-0 flex flex-wrap gap-1.5 p-3 items-end justify-center overflow-hidden animate-pulse">
                        {Array.from({ length: Math.min(profile.stars, 12) }).map((_, i) => (
                          <span key={i} className="text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transform rotate-12">⭐</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <span className="text-4xl font-black text-white filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]">{profile.stars}</span>
                    <span className="text-[9px] font-black text-white/90 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] uppercase tracking-widest mt-0.5">/ {profile.maxStars} Bintang</span>
                  </div>
                </div>
              </div>

              {/* LIST MISI & HADIAH MEMANJANG KE BAWAH DI DALAM KARTU */}
              <div className="w-full flex flex-col gap-4">
                
                {/* AKORDION RUTINITAS */}
                <div className="bg-black/15 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                  <button onClick={() => toggleChildRoutine(profile.id)} className="w-full px-4 py-3 flex justify-between items-center hover:bg-black/10 transition-all text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white drop-shadow-sm">🔄 Rutinitas Harian</span>
                      <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{childRoutines.length}</span>
                    </div>
                    <span className={`text-white text-xs font-black transform transition-transform duration-300 ${isRoutineOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                  </button>
                  {isRoutineOpen && (
                    <div className="p-2.5 border-t border-white/10 space-y-2 bg-black/5 animate-fade-in">
                      {childRoutines.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-white/20 bg-white/90 text-slate-900 shadow-sm gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{item.title}</p>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 mt-1 inline-block">{getTaskLabel(item)}</span>
                          </div>
                          <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all whitespace-nowrap shadow-sm ${item.isDone ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 active:scale-95'}`}>
                            {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                          </button>
                        </div>
                      ))}
                      {childRoutines.length === 0 && <p className="text-center text-white/70 text-xs py-2 italic font-medium">Belum ada tugas rutin.</p>}
                    </div>
                  )}
                </div>

                {/* AKORDION PENCAPAIAN */}
                <div className="bg-black/15 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                  <button onClick={() => toggleChildAchieve(profile.id)} className="w-full px-4 py-3 flex justify-between items-center hover:bg-black/10 transition-all text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white drop-shadow-sm">🏆 Misi Pencapaian</span>
                      <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black">{childAchievements.length}</span>
                    </div>
                    <span className={`text-white text-xs font-black transform transition-transform duration-300 ${isAchieveOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                  </button>
                  {isAchieveOpen && (
                    <div className="p-2.5 border-t border-white/10 space-y-2 bg-black/5 animate-fade-in">
                      {childAchievements.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-white/20 bg-white/90 text-slate-900 shadow-sm gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{item.title}</p>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 border border-pink-200 mt-1 inline-block">{getTaskLabel(item)}</span>
                          </div>
                          <button onClick={() => handleCompleteTask(item.id)} disabled={item.isDone} className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all whitespace-nowrap shadow-sm ${item.isDone ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white active:scale-95'}`}>
                            {item.isDone ? 'Ditinjau ⏳' : `+${item.reward} ⭐`}
                          </button>
                        </div>
                      ))}
                      {childAchievements.length === 0 && <p className="text-center text-white/70 text-xs py-2 italic font-medium">Belum ada misi khusus.</p>}
                    </div>
                  )}
                </div>

                {/* KATALOG TOKO HADIAH KATALOG */}
                <div className="bg-black/10 border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-xs">
                  <div className="flex justify-between items-center border-b border-white/20 pb-2">
                    <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 drop-shadow-xs">🎁 Tukar Hadiah Impian</span>
                    <button type="button" onClick={() => setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)} className="text-[11px] text-white font-black underline bg-black/20 px-2 py-0.5 rounded-md hover:bg-black/30 transition-all">
                      {activeCatalogId === profile.id ? 'Tutup ✖️' : 'Buka Toko 🛒'}
                    </button>
                  </div>
                  
                  {activeCatalogId === profile.id && (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1 animate-fade-in scrollbar-none">
                      {childRewards.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-2.5 rounded-xl bg-white/95 border border-white/20 shadow-sm text-xs gap-2">
                          <span className="text-slate-900 font-black truncate">{r.title}</span>
                          <button onClick={() => handleClaimReward(r.id, profile.id, r.cost)} disabled={r.isClaimed || profile.stars < r.cost} className={`px-3 py-1.5 rounded-md font-black text-[10px] transition-all whitespace-nowrap ${r.isClaimed ? 'bg-green-100 text-green-700' : profile.stars < r.cost ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md active:scale-95'}`}>
                            {r.isClaimed ? 'Diklaim ⏳' : `${r.cost} ⭐`}
                          </button>
                        </div>
                      ))}
                      {childRewards.length === 0 && <p className="text-center text-white/70 text-xs py-2 italic font-medium">Belum ada daftar hadiah.</p>}
                    </div>
                  )}
                </div>

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
            <button type="button" onClick={() => setParentTab('approval')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'approval' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
              🔔 Persetujuan {(pendingTasks.length > 0 || pendingRewards.length > 0) && <span className="ml-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{pendingTasks.length + pendingRewards.length}</span>}
            </button>
            <button type="button" onClick={() => setParentTab('manage')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'manage' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🛠️ Kelola Sistem</button>
          </div>
        </header>

        {parentTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Seluruh Misi</p><h3 className="text-3xl font-black text-white mt-1">{totalTasks}</h3></div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">📋</span>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Misi Sukses Disetujui</p><h3 className="text-3xl font-black text-green-400 mt-1">{completedTasks}</h3></div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">⭐</span>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Rasio Konsistensi Anak</p><h3 className="text-3xl font-black text-indigo-400 mt-1">{completionRate}%</h3></div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">📈</span>
            </div>

            <div className="bg-slate-800 md:col-span-3 rounded-3xl p-6 border border-slate-700 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-200">📊 Tabungan Bintang Anak Realtime</h3>
              {profiles.length === 0 && <p className="text-xs text-slate-500 italic text-center py-4">Belum ada riwayat tabungan anak.</p>}
              <div className="space-y-4">
                {profiles.map(p => {
                  const percent = Math.min((p.stars / p.maxStars) * 100, 100);
                  return (
                    <div key={p.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-1.5"><span className="text-base">{p.avatar}</span><span className="text-white">{p.name}</span></div>
                        <div className="text-right"><span className="text-yellow-400 font-black text-base">{p.stars}</span><span className="text-slate-500 text-xs ml-1">/ {p.maxStars} ⭐</span></div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden relative">
                        <div className={`h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
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
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="bg-orange-500/20 text-orange-400 p-1.5 rounded-lg text-sm">🎁</span> Hadiah Diklaim ({pendingRewards.length})</h2>
              {pendingRewards.length === 0 && <p className="text-slate-500 text-sm">Belum ada klaim hadiah menunggu.</p>}
              <div className="space-y-3">
                {pendingRewards.map(rew => {
                  const child = profiles.find(p => String(p.id) === String(rew.assignedTo));
                  return (
                    <div key={rew.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-slate-700">
                      <div><p className="text-slate-400 text-xs">{child?.name || 'Anak'} menukarkan hadiah:</p><p className="text-base font-bold text-white">{rew.title}</p></div>
                      <button type="button" onClick={() => handleApproveReward(rew.id)} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-sm transition-all shadow-md">Serahkan Hadiah ✔️</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'manage' && (
          <div className="space-y-6 animate-fade-in">
            {/* ACCORDION 1: KELOLA PROFIL ANAK */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowChildForm(!showChildForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">👶 Tambah / Urus Akun Profil Anak</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showChildForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showChildForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form onSubmit={handleAddProfile} className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Form Tambah Anak Baru:</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Nama Anak</label><input type="text" placeholder="Nama Panggilan" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" /></div>
                      <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Role / Panggilan (Anak/Kakak/Adik)</label><input type="text" placeholder="Contoh: Anak Pertama" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Target Maks</label><input type="number" required value={profileForm.maxStars} onChange={e => setProfileForm({...profileForm, maxStars: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" /></div>
                      <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Avatar</label><select value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-xl cursor-pointer">{avatarOptions.map(av => <option key={av} value={av}>{av}</option>)}</select></div>
                      <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Tema Warna Background</label><select value={profileForm.theme} onChange={e => setProfileForm({...profileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium">{themeOptions.map(th => <option key={th.value} value={th.value}>{th.label}</option>)}</select></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-md">+ Tambah Profil</button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Daftar Anak Terdaftar:</h3>
                    {profiles.map(p => (
                      <div key={p.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60">
                        {editingProfileId === p.id ? (
                          <div className="space-y-3 text-xs animate-fade-in">
                            <div className="flex gap-2">
                              <input type="text" className="flex-1 bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold" value={editProfileForm.name || ''} onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})} placeholder="Nama" />
                              <input type="text" className="flex-1 bg-slate-800 border border-slate-600 p-2 rounded-lg text-white" value={editProfileForm.role || ''} onChange={e => setEditProfileForm({...editProfileForm, role: e.target.value})} placeholder="Role" />
                            </div>
                            <div className="flex gap-2">
                              <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Target Maks</label><input type="number" className="w-full bg-slate-900 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editProfileForm.maxStars || 50} onChange={e => setEditProfileForm({...editProfileForm, maxStars: Number(e.target.value)})} /></div>
                              <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Avatar</label><select value={editProfileForm.avatar || '👶'} onChange={e => setEditProfileForm({...editProfileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm">{avatarOptions.map(av => <option key={av} value={av}>{av}</option>)}</select></div>
                              <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Tema</label><select value={editProfileForm.theme || 'from-pink-500 to-rose-400'} onChange={e => setEditProfileForm({...editProfileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm">{themeOptions.map(th => <option key={th.value} value={th.value}>{th.label}</option>)}</select></div>
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
                    {profiles.length === 0 && <p className="text-center text-slate-500 text-xs py-2 italic">Belum ada akun anak.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 2: TAMBAH MISI DENGAN TEMPLATE OTOMATIS */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowTaskForm(!showTaskForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">📋 Kelola & Tambah Misi Baru</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showTaskForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showTaskForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form onSubmit={handleAddTask} className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider">Form Input Tugas / Misi:</h3>
                    
                    <div>
                      <label className="text-xs text-amber-400 font-bold mb-1 block">💡 Gunakan Ide Misi Populer (Opsional):</label>
                      <select 
                        onChange={(e) => {
                          const selected = MISSION_TEMPLATES.find(m => m.id === e.target.value);
                          if (selected) {
                            setTaskForm({ ...taskForm, title: selected.title, reward: selected.points });
                          }
                        }}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-xs font-medium text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="">-- Ketuk cepat untuk pilih template otomatis --</option>
                        {Array.from(new Set(MISSION_TEMPLATES.map(m => m.category))).map(cat => (
                          <optgroup key={cat} label={cat} className="bg-slate-900 text-amber-500 font-bold">
                            {MISSION_TEMPLATES.filter(m => m.category === cat).map(m => (
                              <option key={m.id} value={m.id} className="text-slate-200 font-sans">
                                {m.title} (+{m.points} ⭐)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Tugaskan Untuk Anak:</label>
                        <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-bold">
                          <option value="all">🌟 Semua Anak</option>
                          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Misi / Tugas</label>
                        <input type="text" placeholder="Contoh: Merapikan Tempat Tidur" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-medium" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className="text-xs text-slate-400 mb-1 block">Jenis Misi</label><select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="Daily">🔄 Rutinitas Berulang</option><option value="Achievement">🏆 Tantangan Spesifik</option></select></div>
                      {taskForm.type === 'Daily' && (
                        <div><label className="text-xs text-slate-400 mb-1 block">Siklus Reset</label><select value={taskForm.recurrence} onChange={e => setTaskForm({...taskForm, recurrence: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="daily">🔄 Harian (Reset Tiap Malam)</option><option value="weekly">🔄 Mingguan (Reset Tiap Senin)</option><option value="monthly">🔄 Bulanan (Reset Ganti Bulan)</option></select></div>
                      )}
                      <div><label className="text-xs text-slate-400 mb-1 block">Upah Hadiah Bintang</label><input type="number" required value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" /></div>
                    </div>
                    <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold px-4 py-3 rounded-xl transition-all">+ Tambah Misi</button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Daftar Misi Aktif Sekarang:</h3>
                    {tasks.map(t => {
                      const child = profiles.find(p => String(p.id) === String(t.assignedTo));
                      return (
                        <div key={t.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60">
                          {editingTaskId === t.id ? (
                            <div className="space-y-3 text-xs animate-fade-in">
                              <input type="text" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold" value={editTaskForm.title || ''} onChange={e => setEditTaskForm({...editTaskForm, title: e.target.value})} placeholder="Judul Misi" />
                              <div className="flex gap-2">
                                <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Upah</label><input type="number" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editTaskForm.reward || 0} onChange={e => setEditTaskForm({...editTaskForm, reward: Number(e.target.value)})} /></div>
                                <div className="w-2/3"><label className="text-[10px] text-slate-400 uppercase">Penerima</label><select value={editTaskForm.assignedTo || ''} onChange={e => setEditTaskForm({...editTaskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs">{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50"><button type="button" onClick={() => setEditingTaskId(null)} className="text-slate-400 font-bold px-3 py-1.5 text-xs">Batal</button><button type="button" onClick={saveEditTask} className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black text-xs shadow-md">Simpan</button></div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-sm gap-3">
                              <div><p className="font-bold text-white">{t.title} <span className="text-yellow-400 text-xs ml-1">(+{t.reward}⭐)</span></p><p className="text-[11px] text-slate-500 mt-0.5">Pemilik: <span className="text-slate-300 font-medium">{child?.name || 'Umum'}</span> | Tipe: <span className="text-slate-400">{getTaskLabel(t)}</span></p></div>
                              <div className="flex gap-3 text-xs font-bold whitespace-nowrap"><button type="button" onClick={() => startEditTask(t)} className="text-blue-400 hover:underline">Edit</button><button type="button" onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:underline">Hapus</button></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {tasks.length === 0 && <p className="text-center text-slate-500 text-xs py-2 italic">Belum ada daftar tugas harian.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: TAMBAH HADIAH REWARD DENGAN TEMPLATE OTOMATIS */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button type="button" onClick={() => setShowRewardForm(!showRewardForm)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left">
                <span className="text-lg font-bold text-white flex items-center gap-2">🎁 Tambah Hadiah Baru</span>
                <span className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${showRewardForm ? 'rotate-180' : 'rotate-0'}`}>▼</span>
              </button>
              {showRewardForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form onSubmit={handleAddReward} className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">Form Input Reward Katalog:</h3>
                    
                    <div>
                      <label className="text-xs text-rose-400 font-bold mb-1 block">💡 Gunakan Ide Hadiah Populer (Opsional):</label>
                      <select 
                        onChange={(e) => {
                          const selected = REWARD_TEMPLATES.find(r => r.id === e.target.value);
                          if (selected) {
                            setRewardForm({ ...rewardForm, title: selected.title, cost: selected.points });
                          }
                        }}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-4 py-2.5 text-xs font-medium text-rose-300 focus:outline-none focus:border-rose-400 cursor-pointer"
                      >
                        <option value="">-- Ketuk cepat untuk pilih template otomatis --</option>
                        {Array.from(new Set(REWARD_TEMPLATES.map(r => r.category))).map(cat => (
                          <optgroup key={cat} label={cat} className="bg-slate-900 text-rose-500 font-bold">
                            {REWARD_TEMPLATES.filter(r => r.category === cat).map(r => (
                              <option key={r.id} value={r.id} className="text-slate-200 font-sans">
                                {r.title} (Biaya: {r.points} ⭐)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                        <select value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 cursor-pointer font-bold">
                          <option value="all">🌟 Semua Anak</option>
                          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Hadiah</label>
                        <input type="text" placeholder="Contoh: Es Krim Rasa Cokelat" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 font-medium" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Harga / Biaya Penukaran Bintang</label>
                      <input type="number" required value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-md">+ Tambah Katalog Hadiah</button>
                  </form>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Katalog Hadiah Aktif Sekarang:</h3>
                    {rewards.map(r => {
                      const child = profiles.find(p => String(p.id) === String(r.assignedTo));
                      return (
                        <div key={r.id} className="p-4 rounded-2xl border border-slate-700">
                          {editingRewardId === r.id ? (
                            <div className="space-y-3 text-xs animate-fade-in">
                              <input type="text" className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold" value={editRewardForm.title || ''} onChange={e => setEditRewardForm({...editRewardForm, title: e.target.value})} placeholder="Nama Hadiah" />
                              <div className="flex gap-2">
                                <input type="number" className="w-24 bg-slate-800 border border-slate-600 p-2 rounded-lg text-yellow-400 font-bold text-center" value={editRewardForm.cost || 0} onChange={e => setEditRewardForm({...editRewardForm, cost: Number(e.target.value)})} />
                                <select value={editRewardForm.assignedTo || ''} onChange={e => setEditRewardForm({...editRewardForm, assignedTo: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2 text-white text-xs">{profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50"><button type="button" onClick={() => setEditingRewardId(null)} className="text-slate-400 font-bold px-3 py-1.5 text-xs">Batal</button><button type="button" onClick={saveEditReward} className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black text-xs shadow-md">Simpan</button></div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-sm gap-3">
                              <div><p className="font-bold text-slate-200">{r.title} <span className="text-amber-400 text-xs ml-1">({r.cost} ⭐)</span></p><p className="text-[11px] text-slate-600 mt-0.5">Khusus: <span className="text-slate-400 font-medium">{child?.name || 'Semua Anak'}</span> {r.isApproved && <span className="text-green-500 font-bold ml-2">✓ Sudah Diserahkan</span>}</p></div>
                              <div className="flex gap-3 text-xs font-bold whitespace-nowrap"><button type="button" onClick={() => startEditReward(r)} className="text-blue-400 hover:underline">Edit</button><button type="button" onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:underline">Hapus</button></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {rewards.length === 0 && <p className="text-center text-slate-500 text-xs py-2 italic">Belum ada daftar katalog hadiah.</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-700/40 flex justify-center">
              <button type="button" onClick={handleLogout} className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all">
                🚪 Keluar Akun StarJar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-12 font-sans pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500">
          <div className="text-9xl animate-bounce drop-shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            {celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}
          </div>
        </div>
      )}

      {currentRole === 'child' ? renderChildView() : renderParentView()}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button type="button" onClick={() => setCurrentRole('child')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-md scale-105' : 'text-slate-400 hover:text-white'}`}>👶 Mode Anak</button>
        <button type="button" onClick={() => setCurrentRole('parent')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-md scale-105' : 'text-slate-400 hover:text-white'}`}>👨‍👩‍👧‍👦 Mode Ortu</button>
      </div>
    </div>
  );
}