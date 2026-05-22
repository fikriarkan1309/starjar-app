import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  push,
  update,
  remove,
  get,
} from 'firebase/database';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';

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
  { id: 'm22', title: 'Cuci Tangan Pakai Sabun Sebelum Makan', points: 1, category: '🍏 Kesehatan & Makan' },
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
  { id: 'r12', title: 'Tukar "Kupon Hadiah Misteri" (Gacha)', points: 10, category: '❓ Kupon Misteri' },
];

const DEFAULT_WHEEL_PRIZES = [
  { label: 'Zonk! Coba Lagi', type: 'zonk', val: 0, color: '#ef4444', prob: 20 },
  { label: '+2 Bintang', type: 'star', val: 2, color: '#3b82f6', prob: 30 },
  { label: '+5 Bintang', type: 'star', val: 5, color: '#10b981', prob: 15 },
  { label: 'Es Krim!', type: 'reward', val: 'Es Krim', color: '#f59e0b', prob: 5 },
  { label: '+1 Bintang', type: 'star', val: 1, color: '#8b5cf6', prob: 20 },
  { label: 'Peluk Ayah/Ibu', type: 'zonk', val: 0, color: '#ec4899', prob: 10 },
];

const firebaseConfig = {
  apiKey: "AIzaSyCyK1iq0pRBcRCUOElmHxhfOOyRek_Graw",
  authDomain: "starjar-f3461.firebaseapp.com",
  projectId: "starjar-f3461",
  storageBucket: "starjar-f3461.firebasestorage.app",
  messagingSenderId: "834288744757",
  appId: "1:834288744757:web:8babfcb387284efc54347c",
  databaseURL: "https://starjar-f3461-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const ADMIN_EMAILS = ['admin@starjar.com', 'fikri@forless.com'];

interface Profile {
  id: string;
  name: string;
  role: string;
  stars: number;
  maxStars: number;
  avatar: string;
  theme: string;
  streak: number;
  lastStreakDate: string;
  tickets: number;
  lastTicketDate: string;
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

type Lang = 'id' | 'en';

const DICTIONARY = {
  id: {
    loading: "MEMUAT StarJar...",
    loginTitle: "Aplikasi Toples Disiplin Anak Digital",
    parentEmail: "Email Orang Tua",
    password: "Password Akun",
    loginBtn: "Masuk Dashboard",
    registerBtn: "Buat Akun Keluarga",
    haveAccount: "Sudah punya akun? Masuk di sini",
    noAccount: "Belum punya akun? Daftar Baru",
    forgotPass: "Lupa Password? Reset via Email",
    tourSkipBtn: "Lewati Tur",
    tourNext: "Lanjut",
    tourFinish: "Mulai Gunakan StarJar! 🚀",
    t1Title: "1. Buat Akun Anak",
    t1Desc: "Tambahkan profil anak dan atur target bintang mereka di tab Kelola Sistem.",
    t2Title: "2. Misi & Hadiah",
    t2Desc: "Pilih tugas dari template atau buat sendiri, dan siapkan katalog hadiahnya.",
    t3Title: "3. Persetujuan Misi",
    t3Desc: "Pantau dan setujui misi yang diselesaikan anak agar bintangnya bertambah.",
    t4Title: "4. Tiket & Gacha",
    t4Desc: "Anak dapat 1 tiket harian. Kumpulkan 3 tiket untuk main roda putar!",
    t5Title: "5. Bonus Streak",
    t5Desc: "Konsisten 4 hari berturut-turut akan membuka bonus bintang 1.5x lipat!",
    ttGacha: "Dapatkan 1 Tiket setelah menyelesaikan misi pertama setiap hari. Kumpulkan 3 Tiket untuk putar Roda Gacha!",
    ttStreak: "Konsisten itu hebat! Jika menyelesaikan misi 4 hari berturut-turut, di hari ke-5 dapat bonus 1.5x Bintang!",
    modeChild: "👶 Mode Anak",
    modeParent: "👨‍👩‍👧‍👦 Mode Ortu",
    tabStats: "📊 Statistik",
    tabHistory: "📜 Riwayat",
    tabApproval: "🔔 Persetujuan",
    tabManage: "🛠️ Kelola Sistem",
    helloParent: "Halo, Ayah & Ibu! 👋",
    parentSubtitle: "Pusat Kendali Aplikasi Keluarga.",
    statsTotalTasks: "Total Seluruh Misi",
    statsApproved: "Misi Sukses Disetujui",
    statsRate: "Rasio Konsistensi Anak",
    statsRealtime: "📊 Tabungan Bintang Anak Realtime",
    statsChart: "📈 Grafik Konsistensi Bintang (7 Hari Terakhir)",
    historyTitle: "📜 Riwayat Misi Besar (Pencapaian)",
    approvalTaskTitle: "🎯 Misi Selesai",
    approvalRewardTitle: "🎁 Hadiah Diklaim",
    btnReject: "Tolak ✖️",
    btnApprove: "Setujui",
    btnGiveReward: "Serahkan Hadiah ✔️",
    manageChildTitle: "👶 Tambah / Urus Akun Profil Anak",
    manageTaskTitle: "📋 Kelola & Tambah Misi Baru",
    manageRewardTitle: "🎁 Tambah Hadiah Baru",
    manageWheelTitle: "🎡 Pengaturan Roda Gacha (Lucky Spin)",
    btnExit: "🚪 Keluar Akun StarJar",
    childTitle: "Misi Bintang Hari Ini! 🚀",
    childSubtitle: "Isi toplesmu dengan bintang kebaikan!",
    spinBtn: "🎡 Putar Roda Gacha",
    routineTab: "🔄 Rutinitas Harian",
    achievementTab: "🏆 Misi Pencapaian",
    rewardStore: "🎁 Tukar Hadiah Impian",
    openStore: "Buka Toko 🛒",
    closeStore: "Tutup ✖️",
    btnDone: "Selesai ✔️",
    btnUnderReview: "Ditinjau ⏳",
    btnApproved: "Selesai 🌟",
    btnClaim: "Klaim",
    btnClaimed: "Diklaim ⏳",
  },
  en: {
    loading: "LOADING StarJar...",
    loginTitle: "Digital Kids Discipline Jar App",
    parentEmail: "Parent Email",
    password: "Password",
    loginBtn: "Login to Dashboard",
    registerBtn: "Create Family Account",
    haveAccount: "Already have an account? Login here",
    noAccount: "Don't have an account? Register",
    forgotPass: "Forgot Password? Reset via Email",
    tourSkipBtn: "Skip Tour",
    tourNext: "Next",
    tourFinish: "Start Using StarJar! 🚀",
    t1Title: "1. Create Child Account",
    t1Desc: "Add your child's profile and set their star targets in the Manage System tab.",
    t2Title: "2. Tasks & Rewards",
    t2Desc: "Choose tasks from templates or create your own, and set up the reward catalog.",
    t3Title: "3. Task Approval",
    t3Desc: "Monitor and approve completed tasks so your child earns stars.",
    t4Title: "4. Tickets & Gacha",
    t4Desc: "Kids get 1 daily ticket. Collect 3 tickets to spin the lucky wheel!",
    t5Title: "5. Streak Bonus",
    t5Desc: "Be consistent for 4 days in a row to unlock a 1.5x star multiplier!",
    ttGacha: "Earn 1 Ticket after completing the first task every day. Collect 3 Tickets to spin the Gacha Wheel!",
    ttStreak: "Consistency is key! Complete tasks 4 days in a row to get a 1.5x Star bonus on the 5th day!",
    modeChild: "👶 Child Mode",
    modeParent: "👨‍👩‍👧‍👦 Parent Mode",
    tabStats: "📊 Statistics",
    tabHistory: "📜 History",
    tabApproval: "🔔 Approval",
    tabManage: "🛠️ Manage System",
    helloParent: "Hello, Mom & Dad! 👋",
    parentSubtitle: "Family App Control Center.",
    statsTotalTasks: "Total Tasks",
    statsApproved: "Successfully Approved",
    statsRate: "Child Consistency Rate",
    statsRealtime: "📊 Realtime Star Savings",
    statsChart: "📈 Star Consistency Chart (Last 7 Days)",
    historyTitle: "📜 Major Mission History (Achievements)",
    approvalTaskTitle: "🎯 Completed Tasks",
    approvalRewardTitle: "🎁 Claimed Rewards",
    btnReject: "Reject ✖️",
    btnApprove: "Approve",
    btnGiveReward: "Give Reward ✔️",
    manageChildTitle: "👶 Add / Manage Child Profiles",
    manageTaskTitle: "📋 Manage & Add New Tasks",
    manageRewardTitle: "🎁 Add New Rewards",
    manageWheelTitle: "🎡 Gacha Wheel Settings (Lucky Spin)",
    btnExit: "🚪 Logout from StarJar",
    childTitle: "Today's Star Missions! 🚀",
    childSubtitle: "Fill your jar with stars of kindness!",
    spinBtn: "🎡 Spin Gacha Wheel",
    routineTab: "🔄 Daily Routines",
    achievementTab: "🏆 Achievement Missions",
    rewardStore: "🎁 Exchange Dream Rewards",
    openStore: "Open Store 🛒",
    closeStore: "Close ✖️",
    btnDone: "Done ✔️",
    btnUnderReview: "In Review ⏳",
    btnApproved: "Completed 🌟",
    btnClaim: "Claim",
    btnClaimed: "Claimed ⏳",
  },
};

const getLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const getWeekNumber = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return date.getUTCFullYear() + '-' + weekNo;
};

const getThemeHex = (theme: string) => {
  if (theme.includes('pink') || theme.includes('rose')) return '#ec4899';
  if (theme.includes('cyan') || theme.includes('blue')) return '#0ea5e9';
  if (theme.includes('purple') || theme.includes('indigo')) return '#8b5cf6';
  if (theme.includes('emerald') || theme.includes('teal')) return '#10b981';
  if (theme.includes('orange') || theme.includes('red')) return '#f97316';
  if (theme.includes('yellow') || theme.includes('amber')) return '#eab308';
  return '#cbd5e1';
};

const getActiveStreak = (profile: Profile) => {
  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  if (
    profile.lastStreakDate === todayStr ||
    profile.lastStreakDate === yesterdayStr
  ) {
    return profile.streak || 0;
  }
  return 0;
};

// KOMPONEN TOOLTIP (MINIMALIS & ELEGAN)
const TutorialTooltip = ({ title, content }: { title: string; content: string }) => (
  <div className="group relative inline-flex ml-2 align-middle z-40">
    <span className="bg-yellow-500 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center cursor-help border border-white/50 opacity-80 hover:opacity-100 shadow-sm transition-all hover:scale-110">
      ?
    </span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 bg-slate-800 border border-slate-600 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left">
      <h4 className="text-yellow-400 font-black text-xs mb-1">{title}</h4>
      <p className="text-slate-300 text-[10px] leading-relaxed">{content}</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-600"></div>
    </div>
  </div>
);

export default function App() {
  const avatarOptions = ['👶', '👧', '👦', '👸', '🤴', '🦸‍♀️', '🦸‍♂️', '🥷', '🦁', '🐼', '🦊', '🐸'];
  const themeOptions = [
    { value: 'from-pink-500 to-rose-400', label: '🩷 Pink Ceria' },
    { value: 'from-cyan-500 to-blue-400', label: '🩵 Biru Samudra' },
    { value: 'from-purple-500 to-indigo-400', label: '💜 Ungu Galaksi' },
    { value: 'from-emerald-400 to-teal-400', label: '💚 Hijau Zamrud' },
    { value: 'from-orange-400 to-red-400', label: '❤️ Merah Jingga' },
    { value: 'from-yellow-400 to-amber-500', label: '💛 Kuning Emas' },
  ];

  const [lang, setLang] = useState<Lang>('id');
  const t = DICTIONARY[lang];

  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loadingPremium, setLoadingPremium] = useState<boolean>(true);

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);
  const [allUsersData, setAllUsersData] = useState<any>({});

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<'stats' | 'history' | 'approval' | 'manage'>('manage');

  const [celebration, setCelebration] = useState<'task' | 'reward' | 'ticket' | 'spin_win' | null>(null);
  const [spinWinText, setSpinWinText] = useState<string>('');
  const [activeWheelChild, setActiveWheelChild] = useState<Profile | null>(null);
  const [spinDegree, setSpinDegree] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelPrizes, setWheelPrizes] = useState<any[]>(DEFAULT_WHEEL_PRIZES);

  // TOUR STATE
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const [showChildForm, setShowChildForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showWheelForm, setShowWheelForm] = useState(false);

  const [childRoutineOpen, setChildRoutineOpen] = useState<{ [key: string]: boolean }>({});
  const [childAchieveOpen, setChildAchieveOpen] = useState<{ [key: string]: boolean }>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState<any>({});

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<Profile>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<Task>>({});
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardForm, setEditRewardForm] = useState<Partial<Reward>>({});

  const playSound = (type: 'success' | 'tada' | 'ticket' | 'spin' | 'tick') => {
    try {
      let url = 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3';
      if (type === 'tada') url = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
      if (type === 'ticket') url = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
      if (type === 'spin') url = 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3';
      if (type === 'tick') url = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';

      const audio = new Audio(url);
      if (type === 'tick') audio.volume = 0.3;
      if (type === 'ticket') audio.volume = 1.0;

      audio.play().catch((e) => console.log('Browser nahan auto-play:', e));
    } catch (e) {}
  };

  const triggerCelebration = (type: 'task' | 'reward', gotTicket = false) => {
    playSound(type === 'reward' ? 'tada' : 'success');
    setCelebration(type);

    if (type === 'task' && gotTicket) {
      setTimeout(() => {
        playSound('ticket');
        setCelebration('ticket');
        setTimeout(() => setCelebration(null), 2500);
      }, 2000);
    } else {
      setTimeout(() => setCelebration(null), 2500);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (!currentUser) setLoadingPremium(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const unsubAll = onValue(ref(db, 'users'), (snap) => {
        setAllUsersData(snap.val() || {});
      });
      return () => unsubAll();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!user || isAdmin) {
      setProfiles([]);
      setTasks([]);
      setRewards([]);
      setStats({});
      setIsPremium(false);
      return;
    }

    const userBasePath = `users/${user.uid}`;
    setLoadingPremium(true);

    const unsubPremium = onValue(ref(db, `${userBasePath}/isPremium`), (snapshot) => {
      setIsPremium(!!snapshot.val());
      setLoadingPremium(false);
    });

    const unsubWheel = onValue(ref(db, `${userBasePath}/wheelPrizes`), (snapshot) => {
      if (snapshot.exists()) {
        setWheelPrizes(snapshot.val());
      } else {
        setWheelPrizes(DEFAULT_WHEEL_PRIZES);
      }
    });

    const unsubProfiles = onValue(ref(db, `${userBasePath}/profiles`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setProfiles([]);

      setProfiles(
        Object.keys(data).map(
          (key) =>
            ({
              id: key,
              name: data[key].name || '',
              role: data[key].role || '',
              stars: data[key].stars || 0,
              maxStars: data[key].maxStars || 50,
              avatar: data[key].avatar || '👶',
              theme: data[key].theme || 'from-pink-500 to-rose-400',
              streak: data[key].streak || 0,
              lastStreakDate: data[key].lastStreakDate || '',
              tickets: data[key].tickets || 0,
              lastTicketDate: data[key].lastTicketDate || '',
            } as Profile)
        )
      );
    });

    const unsubStats = onValue(ref(db, `${userBasePath}/stats`), (snapshot) => {
      setStats(snapshot.val() || {});
    });

    const unsubRewards = onValue(ref(db, `${userBasePath}/rewards`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setRewards([]);
      setRewards(
        Object.keys(data).map(
          (key) =>
            ({
              id: key,
              title: data[key].title || '',
              cost: data[key].cost || 10,
              isClaimed: !!data[key].isClaimed,
              isApproved: !!data[key].isApproved,
              assignedTo: String(data[key].assignedTo || ''),
            } as Reward)
        )
      );
    });

    const unsubTasks = onValue(ref(db, `${userBasePath}/tasks`), (snapshot) => {
      const data = snapshot.val();
      if (!data) return setTasks([]);
      const tData = Object.keys(data).map(
        (key) =>
          ({
            id: key,
            title: data[key].title || '',
            type: data[key].type || 'Daily',
            recurrence: data[key].recurrence || 'none',
            reward: data[key].reward || 2,
            isDone: !!data[key].isDone,
            isApproved: !!data[key].isApproved,
            assignedTo: String(data[key].assignedTo || ''),
          } as Task)
      );
      setTasks(tData);

      const todayStr = getLocalDateString(new Date());
      const currentWeek = getWeekNumber(new Date());
      const currentMonth = new Date().getFullYear() + '-' + new Date().getMonth();

      // PUSAT SINKRONISASI RESET VIA FIREBASE
      get(ref(db, `${userBasePath}/system`)).then((snap) => {
        const sys = snap.val() || {};
        let updates: any = {};
        let needUpdate = false;

        if (sys.lang) {
          setLang(sys.lang as Lang);
        }
        if (sys.isTourFinished !== true) {
          setShowTour(true);
        }

        if (sys.lastDaily !== todayStr) {
          tData.forEach((t) => {
            if (t.type === 'Daily' && t.recurrence === 'daily' && (t.isDone || t.isApproved)) {
              updates[`tasks/${t.id}/isDone`] = false;
              updates[`tasks/${t.id}/isApproved`] = false;
            }
          });
          updates['system/lastDaily'] = todayStr;
          needUpdate = true;
        }

        if (sys.lastWeekly !== currentWeek) {
          tData.forEach((t) => {
            if (t.type === 'Daily' && t.recurrence === 'weekly' && (t.isDone || t.isApproved)) {
              updates[`tasks/${t.id}/isDone`] = false;
              updates[`tasks/${t.id}/isApproved`] = false;
            }
          });
          updates['system/lastWeekly'] = currentWeek;
          needUpdate = true;
        }

        if (sys.lastMonthly !== currentMonth) {
          tData.forEach((t) => {
            if (t.type === 'Daily' && t.recurrence === 'monthly' && (t.isDone || t.isApproved)) {
              updates[`tasks/${t.id}/isDone`] = false;
              updates[`tasks/${t.id}/isApproved`] = false;
            }
          });
          updates['system/lastMonthly'] = currentMonth;
          needUpdate = true;
        }

        if (needUpdate) {
          update(ref(db, userBasePath), updates);
        }
      });
    });

    return () => {
      unsubPremium();
      unsubWheel();
      unsubProfiles();
      unsubTasks();
      unsubRewards();
      unsubStats();
    };
  }, [user, isAdmin]);

  const handleCompleteTask = async (taskId: string, childId: string) => {
    if (!user) return;
    const child = profiles.find((p) => p.id === childId);
    if (!child) return;

    const todayStr = getLocalDateString(new Date());
    let gotTicket = false;

    if (child.lastTicketDate !== todayStr) {
      gotTicket = true;
      await update(ref(db, `users/${user.uid}/profiles/${childId}`), {
        tickets: (child.tickets || 0) + 1,
        lastTicketDate: todayStr,
      });
    }

    await update(ref(db, `users/${user.uid}/tasks/${taskId}`), {
      isDone: true,
    });
    triggerCelebration('task', gotTicket);
  };

  const handleClaimReward = async (rewardId: string, childId: string, cost: number) => {
    if (!user) return;
    const child = profiles.find((p) => p.id === childId);
    if (!child || child.stars < cost) return alert('Bintangmu belum cukup! 💪🌟');

    await update(ref(db, `users/${user.uid}/profiles/${childId}`), {
      stars: child.stars - cost,
    });
    await update(ref(db, `users/${user.uid}/rewards/${rewardId}`), {
      isClaimed: true,
    });
    triggerCelebration('reward');
  };

  const handleRejectTask = async (taskId: string) => {
    if (user) {
      await update(ref(db, `users/${user.uid}/tasks/${taskId}`), {
        isDone: false,
        isApproved: false,
      });
    }
  };

  const handleApproveTask = async (taskId: string, childId: string | undefined, reward: number) => {
    if (!childId || !user) return;
    const child = profiles.find((p) => p.id === childId);
    if (!child) return;

    const todayStr = getLocalDateString(new Date());
    const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));

    let currentStreak = child.streak || 0;
    let lastStreakDate = child.lastStreakDate || '';

    if (lastStreakDate !== todayStr && lastStreakDate !== yesterdayStr) {
      currentStreak = 0;
    }

    const multiplier = currentStreak >= 4 ? 1.5 : 1;
    const finalReward = Math.ceil(reward * multiplier);

    await update(ref(db, `users/${user.uid}/tasks/${taskId}`), {
      isApproved: true,
    });

    const childTasks = tasks.filter((t) => String(t.assignedTo) === String(child.id) && t.type === 'Daily');
    const totalDaily = childTasks.length;
    let approvedDaily = childTasks.filter((t) => t.isApproved).length;
    const thisTask = tasks.find((t) => t.id === taskId);
    if (thisTask?.type === 'Daily') approvedDaily += 1;

    if (totalDaily > 0 && approvedDaily / totalDaily >= 0.5) {
      if (lastStreakDate !== todayStr) {
        currentStreak += 1;
        lastStreakDate = todayStr;
      }
    }

    await update(ref(db, `users/${user.uid}/profiles/${child.id}`), {
      stars: Math.min(child.stars + finalReward, child.maxStars),
      streak: currentStreak,
      lastStreakDate: lastStreakDate,
    });

    const currentDailyStars = stats[childId]?.[todayStr] || 0;
    await update(ref(db, `users/${user.uid}/stats/${childId}`), {
      [todayStr]: currentDailyStars + finalReward,
    });
  };

  const handleApproveReward = async (rewardId: string) => {
    if (user) {
      await update(ref(db, `users/${user.uid}/rewards/${rewardId}`), {
        isApproved: true,
      });
    }
  };

  const [profileForm, setProfileForm] = useState({
    name: '',
    role: '',
    maxStars: 50,
    avatar: '👶',
    theme: 'from-pink-500 to-rose-400',
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'Daily',
    recurrence: 'daily',
    reward: 2,
    assignedTo: 'all',
  });
  const [rewardForm, setRewardForm] = useState({
    title: '',
    cost: 10,
    assignedTo: 'all',
  });

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !user) return;
    await push(ref(db, `users/${user.uid}/profiles`), {
      name: profileForm.name,
      role: profileForm.role || 'Anak',
      stars: 0,
      maxStars: Number(profileForm.maxStars),
      avatar: profileForm.avatar,
      theme: profileForm.theme,
      streak: 0,
      lastStreakDate: '',
      tickets: 0,
      lastTicketDate: '',
    });
    setProfileForm({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
    setShowChildForm(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || profiles.length === 0 || !user) return;
    const baseTask = {
      title: taskForm.title,
      type: taskForm.type,
      recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none',
      reward: Number(taskForm.reward),
      isDone: false,
      isApproved: false,
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
      title: rewardForm.title,
      cost: Number(rewardForm.cost),
      isClaimed: false,
      isApproved: false,
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

  const startEditProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditProfileForm({ ...profile });
  };

  const saveEditProfile = async () => {
    if (!editingProfileId || !user) return;
    await update(ref(db, `users/${user.uid}/profiles/${editingProfileId}`), {
      name: editProfileForm.name || '',
      role: editProfileForm.role || '',
      maxStars: Number(editProfileForm.maxStars || 50),
      avatar: editProfileForm.avatar || '👶',
      theme: editProfileForm.theme || 'from-pink-500 to-rose-400',
    });
    setEditingProfileId(null);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!user) return;
    if (window.confirm('Yakin menghapus akun ini beserta Misi dan Hadiahnya?')) {
      await remove(ref(db, `users/${user.uid}/profiles/${id}`));
      tasks.filter((t) => String(t.assignedTo) === String(id)).forEach((t) => remove(ref(db, `users/${user.uid}/tasks/${t.id}`)));
      rewards.filter((r) => String(r.assignedTo) === String(id)).forEach((r) => remove(ref(db, `users/${user.uid}/rewards/${r.id}`)));
    }
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskForm({ ...task });
  };

  const saveEditTask = async () => {
    if (!editingTaskId || !user) return;
    await update(ref(db, `users/${user.uid}/tasks/${editingTaskId}`), {
      title: editTaskForm.title || '',
      reward: Number(editTaskForm.reward || 0),
      type: editTaskForm.type || 'Daily',
      recurrence: (editTaskForm.type || 'Daily') === 'Daily' ? editTaskForm.recurrence || 'daily' : 'none',
      assignedTo: editTaskForm.assignedTo || '',
    });
    setEditingTaskId(null);
  };

  const handleDeleteTask = async (id: string) => {
    if (user) {
      await remove(ref(db, `users/${user.uid}/tasks/${id}`));
    }
  };

  const startEditReward = (reward: Reward) => {
    setEditingRewardId(reward.id);
    setEditRewardForm({ ...reward });
  };

  const saveEditReward = async () => {
    if (!editingRewardId || !user) return;
    await update(ref(db, `users/${user.uid}/rewards/${editingRewardId}`), {
      title: editRewardForm.title || '',
      cost: Number(editRewardForm.cost || 0),
      assignedTo: editRewardForm.assignedTo || '',
    });
    setEditingRewardId(null);
  };

  const handleDeleteReward = async (id: string) => {
    if (user) {
      await remove(ref(db, `users/${user.uid}/rewards/${id}`));
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await update(ref(db, `users/${res.user.uid}`), {
          isPremium: false,
          email: res.user.email || '',
        });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) return setAuthError('Ketik email dulu!');
    setAuthError('');
    setAuthSuccess('');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthSuccess('Tautan reset terkirim!');
    } catch (err: any) {
      setAuthError('Gagal: ' + err.message);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Keluar dari StarJar?')) {
      signOut(auth);
    }
  };

  const getTaskLabel = (item: any) => {
    if (!item) return '🔄';
    if (item.type === 'Achievement') return '🏆';
    if (item.recurrence === 'daily') return '🔄';
    if (item.recurrence === 'weekly') return '🔄';
    if (item.recurrence === 'monthly') return '🔄';
    return '🔄';
  };

  const toggleChildRoutine = (childId: string) => {
    setChildRoutineOpen((prev) => ({ ...prev, [childId]: !prev[childId] }));
  };

  const toggleChildAchieve = (childId: string) => {
    setChildAchieveOpen((prev) => ({ ...prev, [childId]: !prev[childId] }));
  };

  const handleSpinWheel = async () => {
    if (!activeWheelChild || !user || isSpinning) return;
    if ((activeWheelChild.tickets || 0) < 3) return alert('Tiket belum cukup!');

    setIsSpinning(true);
    playSound('spin');

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playSound('tick');
      tickCount++;
      if (tickCount > 25) clearInterval(tickInterval);
    }, 150);

    await update(ref(db, `users/${user.uid}/profiles/${activeWheelChild.id}`), {
      tickets: activeWheelChild.tickets - 3,
    });

    const rand = Math.random() * 100;
    let sum = 0,
      winningIndex = 0;
    for (let i = 0; i < wheelPrizes.length; i++) {
      sum += Number(wheelPrizes[i].prob);
      if (rand <= sum) {
        winningIndex = i;
        break;
      }
    }

    const sliceDeg = 360 / wheelPrizes.length;
    const centerDeg = winningIndex * sliceDeg + sliceDeg / 2;
    const newDegree = spinDegree + 1800 + (360 - centerDeg) - (spinDegree % 360);
    setSpinDegree(newDegree);

    setTimeout(async () => {
      setIsSpinning(false);
      const prize = wheelPrizes[winningIndex];
      setSpinWinText(prize.label);

      if (prize.type === 'star') {
        const todayStr = getLocalDateString(new Date());
        const addedVal = Number(prize.val) || 0;
        await update(ref(db, `users/${user.uid}/profiles/${activeWheelChild.id}`), {
          stars: Math.min(activeWheelChild.stars + addedVal, activeWheelChild.maxStars),
        });
        const currentDailyStars = stats[activeWheelChild.id]?.[todayStr] || 0;
        await update(ref(db, `users/${user.uid}/stats/${activeWheelChild.id}`), {
          [todayStr]: currentDailyStars + addedVal,
        });
        playSound('tada');
      } else if (prize.type === 'reward') {
        await push(ref(db, `users/${user.uid}/rewards`), {
          title: `Gacha: ${prize.val}`,
          cost: 0,
          isClaimed: true,
          isApproved: false,
          assignedTo: activeWheelChild.id,
        });
        playSound('tada');
      } else {
        playSound('success');
      }

      setCelebration('spin_win');
      setTimeout(() => {
        setCelebration(null);
        setActiveWheelChild(null);
      }, 3500);
    }, 4000);
  };

  const finishTourOverlay = () => {
    setShowTour(false);
    if (user) {
      update(ref(db, `users/${user.uid}/system`), { isTourFinished: true });
    }
  };

  if (loadingAuth || (loadingPremium && !isAdmin)) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400 font-bold tracking-widest">
        <div className="text-center space-y-3">
          <div className="text-6xl animate-spin">🌟</div>
          <p className="animate-pulse font-sans tracking-normal">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (user && isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-8 text-slate-100 font-sans">
        <div className="max-w-6xl mx-auto bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-amber-400 flex items-center gap-2">
                <span className="text-4xl">🛡️</span> Panel Admin StarJar
              </h1>
              <p className="text-slate-400 text-sm mt-1">Sistem kontrol akses premium keluarga.</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-6 py-2.5 rounded-xl font-bold border border-red-500/30 transition-all"
            >
              Keluar
            </button>
          </div>
          <div className="overflow-x-auto bg-slate-900/50 rounded-2xl border border-slate-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-700">
                  <th className="p-4 text-slate-400 font-black text-xs uppercase">Email User</th>
                  <th className="p-4 text-slate-400 font-black text-xs uppercase">Status</th>
                  <th className="p-4 text-slate-400 font-black text-xs uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(allUsersData).map((uid) => {
                  const uData = allUsersData[uid];
                  if (ADMIN_EMAILS.includes(uData.email)) return null;
                  return (
                    <tr key={uid} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-4 font-bold text-sm">{uData.email || 'User Tanpa Email'}</td>
                      <td className="p-4">
                        {uData.isPremium ? (
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] font-black">
                            PREMIUM
                          </span>
                        ) : (
                          <span className="bg-slate-700 text-slate-400 px-2 py-1 rounded text-[10px] font-black">
                            PENDING
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => update(ref(db, `users/${uid}`), { isPremium: !uData.isPremium })}
                          className={`px-4 py-2 rounded-lg text-xs font-black ${
                            uData.isPremium ? 'bg-red-500/20 text-red-400' : 'bg-green-500 text-white'
                          }`}
                        >
                          {uData.isPremium ? 'Cabut Akses' : '✅ ACC'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center p-6 font-sans relative overflow-hidden">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/BG.jpg')", opacity: 0.35 }}
        ></div>
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 p-10 shadow-2xl space-y-6 relative z-10">
          <div className="text-center space-y-2">
            <img
              src="/Icon Login.png"
              className="w-20 h-20 mx-auto object-contain transform hover:scale-110 transition-transform mb-1"
              alt="StarJar"
            />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400 tracking-tight">
              StarJar
            </h1>
            <p className="text-slate-400 text-sm">{t.loginTitle}</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block ml-2">
                {t.parentEmail}
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 block ml-2">
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-sm"
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
            {authError && (
              <p className="text-xs text-red-400 font-bold text-center bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                {authError}
              </p>
            )}
            {authSuccess && (
              <p className="text-xs text-green-400 font-bold text-center bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">
                {authSuccess}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-90 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wider"
            >
              {isRegistering ? t.registerBtn : t.loginBtn}
            </button>
          </form>
          <div className="flex flex-col items-center justify-center gap-3 pt-4 border-t border-slate-700/50 text-xs">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-slate-300 hover:text-yellow-400 font-bold underline transition-colors"
            >
              {isRegistering ? t.haveAccount : t.noAccount}
            </button>
            {!isRegistering && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t.forgotPass}
              </button>
            )}
          </div>
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="bg-slate-900/80 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-700 shadow-sm text-slate-300 hover:text-white"
            >
              🌍 {lang === 'id' ? 'EN' : 'ID'}
            </button>
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
            Halo Ayah & Ibu! Terima kasih sudah mendaftar. Saat ini kami sedang mencocokkan data
            pendaftaran Anda dengan invoice pembelian. Mohon tunggu 5-10 menit.
          </p>
          <div className="pt-2">
            <div className="text-[11px] text-slate-500 animate-pulse font-medium">
              🛡️ Sinkronisasi aman dengan database...
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors underline block mx-auto mt-6"
            >
              🚪 Keluar / Ganti Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderChildView = () => (
    <div className="space-y-12 w-full mx-auto animate-fade-in px-2 md:px-4">
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 tracking-tight drop-shadow-sm">
          {t.childTitle}
        </h1>
        <p className="text-slate-400 text-lg font-medium">{t.childSubtitle}</p>
      </header>
      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-8 items-start md:pb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent w-full justify-center md:justify-start">
        {profiles.map((profile) => {
          const fillPercentage = Math.min((profile.stars / profile.maxStars) * 100, 100);
          const childTasks = tasks.filter((t) => String(t.assignedTo) === String(profile.id));
          const childRoutines = childTasks.filter((t) => t.type === 'Daily');
          const childAchievements = childTasks.filter((t) => t.type === 'Achievement');
          const childRewards = rewards.filter(
            (r) => String(r.assignedTo) === String(profile.id) && !r.isApproved
          );
          const isRoutineOpen = !!childRoutineOpen[profile.id];
          const isAchieveOpen = !!childAchieveOpen[profile.id];
          const activeStreak = getActiveStreak(profile);
          const isMultiplierActive = activeStreak >= 4;

          return (
            <div
              key={profile.id}
              className="w-full md:w-[350px] md:flex-shrink-0 bg-slate-800/60 rounded-[3rem] p-6 md:p-7 shadow-2xl flex flex-col gap-6 relative overflow-hidden border border-slate-700/60 backdrop-blur-md text-slate-100"
            >
              <div className="absolute top-5 left-5 z-30 flex flex-col items-center">
                <div className="bg-slate-900/80 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] px-3 py-1.5 rounded-2xl flex items-center gap-1.5 transform hover:scale-105 transition-transform cursor-default">
                  <span className="text-xl filter drop-shadow">🎟️</span>
                  <span className="text-lg font-black text-yellow-400">{profile.tickets || 0}</span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                    Tiket Gacha
                  </span>
                  <TutorialTooltip title="Tiket Gacha" content={t.ttGacha} />
                </div>
              </div>

              <div className="absolute top-5 right-5 z-30 flex flex-col items-center">
                {activeStreak === 0 && <span className="text-2xl filter grayscale opacity-20">🌑</span>}
                {activeStreak === 1 && <span className="text-2xl filter drop-shadow-md">🔥</span>}
                {activeStreak === 2 && <span className="text-3xl filter drop-shadow-lg">🔥🔥</span>}
                {activeStreak === 3 && (
                  <span className="text-4xl filter drop-shadow-xl animate-pulse">🔥🔥🔥</span>
                )}
                {isMultiplierActive && (
                  <div className="flex flex-col items-center transform scale-110 animate-bounce">
                    <span className="text-5xl filter drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">
                      ☄️💥
                    </span>
                    <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full mt-1 border border-yellow-300 shadow-lg">
                      1.5x BONUS
                    </span>
                  </div>
                )}
                <div className="flex items-center mt-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                    {isMultiplierActive ? 'MAX STREAK!' : `STREAK: ${activeStreak}`}
                  </span>
                  <TutorialTooltip title="Bonus Streak" content={t.ttStreak} />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center space-y-3 pt-4">
                <div
                  className={`p-4 rounded-3xl bg-gradient-to-br ${profile.theme} shadow-lg flex items-center justify-center min-w-[90px] min-h-[90px]`}
                >
                  <span className="text-5xl block filter drop-shadow">{profile.avatar}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{profile.name}</h2>
                  <span className="text-[10px] bg-slate-700/80 text-slate-300 font-black px-3 py-1 rounded-full uppercase tracking-wider mt-1 inline-block">
                    {profile.role}
                  </span>
                </div>
                <div className="relative w-40 h-56 bg-white/10 rounded-[2.5rem] border-4 border-white/20 shadow-[inset_0_4px_20px_rgba(255,255,255,0.1)] flex flex-col justify-end p-4 overflow-hidden mt-2">
                  <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/20 to-transparent z-10 flex items-center justify-center">
                    <div className="w-14 h-2 bg-amber-950/40 border border-black/20 rounded-b-md shadow-sm"></div>
                  </div>
                  <div
                    className="w-full rounded-b-[1.8rem] bg-gradient-to-t from-yellow-400 to-amber-500 transition-all duration-1000 relative shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]"
                    style={{ height: `${fillPercentage}%` }}
                  >
                    {fillPercentage > 5 && (
                      <div className="absolute inset-0 flex flex-wrap gap-1.5 p-2 items-end justify-center overflow-hidden animate-pulse">
                        {Array.from({ length: Math.min(profile.stars, 10) }).map((_, i) => (
                          <span
                            key={i}
                            className="text-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transform rotate-12"
                          >
                            ⭐
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <span className="text-4xl font-black text-white filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]">
                      {profile.stars}
                    </span>
                    <span className="text-[9px] font-black text-white/90 filter drop-shadow uppercase tracking-widest mt-0.5">
                      / {profile.maxStars} Bintang
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full mt-2">
                <button
                  onClick={() => setActiveWheelChild(profile)}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-[0_4px_20px_rgba(192,38,211,0.4)] transition-all active:scale-95 group border border-purple-400/50"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2 text-sm tracking-wide">
                    {t.spinBtn} (3 🎟️)
                  </span>
                </button>
              </div>

              <div className="w-full flex flex-col gap-4 mt-2">
                <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleChildRoutine(profile.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-200">{t.routineTab}</span>
                      <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-black">
                        {childRoutines.length}
                      </span>
                    </div>
                    <span
                      className={`text-slate-400 text-xs font-black transform transition-transform duration-300 ${
                        isRoutineOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {isRoutineOpen && (
                    <div className="p-2 border-t border-slate-700/50 space-y-2 bg-slate-950/30 animate-fade-in">
                      {childRoutines.map((item) => {
                        const rewardDisplay = isMultiplierActive
                          ? Math.ceil(item.reward * 1.5)
                          : item.reward;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-200 shadow-sm gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-200 leading-tight">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">
                                  {getTaskLabel(item)}
                               </span>
                                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                  +{rewardDisplay} ⭐
                                </span>
                                {isMultiplierActive && (
                                  <span className="text-[8px] font-black text-white bg-gradient-to-r from-red-500 to-orange-500 px-1.5 py-0.5 rounded animate-pulse shadow-md border border-red-400/50">
                                    🔥 1.5X BONUS
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCompleteTask(item.id, profile.id)}
                              disabled={item.isDone || item.isApproved}
                              className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] transition-all whitespace-nowrap shadow-sm ${
                                item.isApproved
                                  ? 'bg-green-600/30 text-green-400 cursor-not-allowed shadow-none'
                                  : item.isDone
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 active:scale-95'
                              }`}
                            >
                              {item.isApproved
                                ? t.btnApproved
                                : item.isDone
                                ? t.btnUnderReview
                                : t.btnDone}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleChildAchieve(profile.id)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-700/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-200">{t.achievementTab}</span>
                      <span className="bg-pink-500/20 text-pink-300 text-[10px] px-2 py-0.5 rounded-full font-black">
                        {childAchievements.length}
                      </span>
                    </div>
                    <span
                      className={`text-slate-400 text-xs font-black transform transition-transform duration-300 ${
                        isAchieveOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {isAchieveOpen && (
                    <div className="p-2 border-t border-slate-700/50 space-y-2 bg-slate-950/30 animate-fade-in">
                      {childAchievements.map((item) => {
                        const rewardDisplay = isMultiplierActive
                          ? Math.ceil(item.reward * 1.5)
                          : item.reward;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-200 shadow-sm gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-200 leading-tight">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pink-900/30 text-pink-400 border border-pink-800/50">
                                  {getTaskLabel(item)}
                                </span>
                                <span className="text-[9px] font-black text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                  +{rewardDisplay} ⭐
                                </span>
                                {isMultiplierActive && (
                                  <span className="text-[8px] font-black text-white bg-gradient-to-r from-red-500 to-orange-500 px-1.5 py-0.5 rounded animate-pulse shadow-md border border-red-400/50">
                                    🔥 1.5X BONUS
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCompleteTask(item.id, profile.id)}
                              disabled={item.isDone || item.isApproved}
                              className={`px-2.5 py-1.5 rounded-lg font-black text-[10px] transition-all whitespace-nowrap shadow-sm ${
                                item.isApproved
                                  ? 'bg-green-600/30 text-green-400 cursor-not-allowed shadow-none'
                                  : item.isDone
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                                  : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white active:scale-95'
                              }`}
                            >
                              {item.isApproved
                                ? t.btnApproved
                                : item.isDone
                                ? t.btnUnderReview
                                : t.btnDone}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/40 border border-slate-700/60 rounded-2xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-700/60 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      {t.rewardStore}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCatalogId(activeCatalogId === profile.id ? null : profile.id)
                      }
                      className="text-[10px] text-amber-400 font-black hover:underline bg-slate-800 px-2 py-0.5 rounded-md"
                    >
                      {activeCatalogId === profile.id ? t.closeStore : t.openStore}
                    </button>
                  </div>
                  {activeCatalogId === profile.id && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 animate-fade-in scrollbar-none">
                      {childRewards.map((r) => (
                        <div
                          key={r.id}
                          className="flex justify-between items-center p-2 rounded-xl bg-slate-900/80 border border-slate-700 shadow-sm text-xs gap-2"
                        >
                          <span className="text-slate-200 font-bold truncate text-[11px]">
                            {r.title}
                          </span>
                          <button
                            onClick={() => handleClaimReward(r.id, profile.id, r.cost)}
                            disabled={r.isClaimed || profile.stars < r.cost}
                            className={`px-2.5 py-1 rounded-md font-black text-[10px] transition-all whitespace-nowrap ${
                              r.isClaimed
                                ? 'bg-green-900/30 text-green-400'
                                : profile.stars < r.cost
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md active:scale-95'
                            }`}
                          >
                            {r.isClaimed ? t.btnClaimed : `${r.cost} ⭐`}
                          </button>
                        </div>
                      ))}
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
    const pendingTasks = tasks.filter((t) => t.isDone && !t.isApproved);
    const pendingRewards = rewards.filter((r) => r.isClaimed && !r.isApproved);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.isApproved).length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const maxChartVal = Math.max(
      10,
      ...profiles.flatMap((p) =>
        last7Days.map((d) => stats[p.id]?.[getLocalDateString(d)] || 0)
      )
    );

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative z-10">
        <header className="border-b border-slate-700 pb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">{t.helloParent}</h1>
            <p className="text-slate-400 mt-2 text-sm">{t.parentSubtitle}</p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 overflow-x-auto flex-nowrap w-full md:w-auto scrollbar-none snap-x gap-1">
            <button
              type="button"
              onClick={() => setParentTab('stats')}
              className={`snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                parentTab === 'stats' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.tabStats}
            </button>
            <button
              type="button"
              onClick={() => setParentTab('history')}
              className={`snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                parentTab === 'history' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.tabHistory}
            </button>
            <button
              type="button"
              onClick={() => setParentTab('approval')}
              className={`snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                parentTab === 'approval' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.tabApproval}{' '}
              {(pendingTasks.length > 0 || pendingRewards.length > 0) && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  {pendingTasks.length + pendingRewards.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setParentTab('manage')}
              className={`snap-center px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                parentTab === 'manage' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.tabManage}
            </button>
          </div>
        </header>

        {parentTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.statsTotalTasks}
                </p>
                <h3 className="text-3xl font-black text-white mt-1">{totalTasks}</h3>
              </div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">📋</span>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.statsApproved}
                </p>
                <h3 className="text-3xl font-black text-green-400 mt-1">{completedTasks}</h3>
              </div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">⭐</span>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {t.statsRate}
                </p>
                <h3 className="text-3xl font-black text-indigo-400 mt-1">{completionRate}%</h3>
              </div>
              <span className="text-4xl bg-slate-900 p-3 rounded-2xl border border-slate-700">📈</span>
            </div>
            <div className="bg-slate-800 md:col-span-3 rounded-3xl p-6 border border-slate-700 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-slate-200">{t.statsRealtime}</h3>
              <div className="space-y-4">
                {profiles.map((p) => {
                  const percent = Math.min((p.stars / p.maxStars) * 100, 100);
                  return (
                    <div key={p.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{p.avatar}</span>
                          <span className="text-white">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-yellow-400 font-black text-base">{p.stars}</span>
                          <span className="text-slate-500 text-xs ml-1">/ {p.maxStars} ⭐</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-1000"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800 md:col-span-3 rounded-3xl p-6 border border-slate-700 shadow-xl space-y-6">
              <h3 className="text-base font-bold text-slate-200">{t.statsChart}</h3>
              {profiles.length > 0 && (
                <>
                  <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="min-w-[500px] h-56 relative pt-4 pr-4 pl-8">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pl-8">
                        {[1, 0.75, 0.5, 0.25, 0].map((multiplier) => (
                          <div key={multiplier} className="w-full border-t border-slate-700/50 flex items-center">
                            <span className="text-[10px] text-slate-500 font-bold -ml-6 -mt-2 bg-slate-800 pr-1 absolute">
                              {Math.round(maxChartVal * multiplier)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <svg
                        viewBox="0 0 600 200"
                        className="w-full h-full overflow-visible preserve-3d"
                        preserveAspectRatio="none"
                      >
                        {profiles.map((p) => {
                          const xStep = 600 / 6;
                          const points = last7Days.map((d, index) => {
                            const dateStr = getLocalDateString(d);
                            const val = stats[p.id]?.[dateStr] || 0;
                            return `${index * xStep},${200 - (val / maxChartVal) * 200}`;
                          });
                          const hexColor = getThemeHex(p.theme);
                          return (
                            <g key={p.id}>
                              <polyline
                                points={points.join(' ')}
                                fill="none"
                                stroke={hexColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="drop-shadow-lg"
                              />
                              {points.map((pt, i) => {
                                const [px, py] = pt.split(',');
                                return (
                                  <circle
                                    key={i}
                                    cx={px}
                                    cy={py}
                                    r="5"
                                    fill={hexColor}
                                    stroke="#1e293b"
                                    strokeWidth="2"
                                  />
                                );
                              })}
                            </g>
                          );
                        })}
                      </svg>
                      <div className="absolute bottom-0 left-8 right-4 flex justify-between mt-2">
                        {last7Days.map((d, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-500 -ml-3">
                            {d.toLocaleDateString('id-ID', { weekday: 'short' })}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 justify-center border-t border-slate-700/50 pt-4">
                    {profiles.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow"
                          style={{ backgroundColor: getThemeHex(p.theme) }}
                        ></div>
                        <span className="text-xs text-slate-300 font-bold">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {parentTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl">
              <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                <span className="bg-purple-500/20 text-purple-400 p-2 rounded-xl text-lg">📜</span>{' '}
                {t.historyTitle}
              </h2>
              <div className="space-y-10">
                {profiles.map((profile) => {
                  const historyTasks = tasks.filter(
                    (t) =>
                      String(t.assignedTo) === String(profile.id) &&
                      t.type === 'Achievement' &&
                      t.isApproved
                  );
                  return (
                    <div key={profile.id} className="relative">
                      <div className="flex items-center gap-3 mb-4 border-b border-slate-700/60 pb-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${profile.theme} shadow-lg`}>
                          <span className="text-xl block filter drop-shadow">{profile.avatar}</span>
                        </div>
                        <h3 className="text-lg font-black text-white">{profile.name}</h3>
                      </div>
                      <div className="space-y-3 pl-[3.25rem]">
                        {historyTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-700 shadow-sm"
                          >
                            <div className="flex-1 mr-2">
                              <p className="text-sm font-bold text-slate-200">{task.title}</p>
                              <span className="text-[10px] text-green-400 font-black mt-1 inline-block uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded-md">
                                ✓ Sukses
                              </span>
                            </div>
                            <span className="text-xl font-black text-yellow-400 drop-shadow-md whitespace-nowrap">
                              +{task.reward} ⭐
                            </span>
                          </div>
                        ))}
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
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg text-sm">🎯</span>{' '}
                {t.approvalTaskTitle} ({pendingTasks.length})
              </h2>
              <div className="space-y-3">
                {pendingTasks.map((task) => {
                  const child = profiles.find((p) => String(p.id) === String(task.assignedTo));
                  const isMultiplier = (child ? getActiveStreak(child) : 0) >= 4;
                  const displayReward = Math.ceil(task.reward * (isMultiplier ? 1.5 : 1));
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-2xl bg-slate-900 border border-slate-700 gap-4"
                    >
                      <div>
                        <p className="text-slate-400 text-xs">{child?.name || 'Anak'}</p>
                        <p className="text-base font-bold text-white">{task.title}</p>
                        {isMultiplier && (
                          <span className="text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 rounded-md mt-1 inline-block animate-pulse shadow-md">
                            🔥 1.5X BONUS
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleRejectTask(task.id)}
                          className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black px-4 py-2.5 rounded-xl text-sm"
                        >
                          {t.btnReject}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveTask(task.id, child?.id, task.reward)}
                          className={`flex-1 sm:flex-none ${
                            isMultiplier
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900'
                              : 'bg-green-500 hover:bg-green-400 text-slate-900'
                          } font-black px-4 py-2.5 rounded-xl text-sm shadow-md`}
                        >
                          {t.btnApprove} +{displayReward}⭐
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="bg-orange-500/20 text-orange-400 p-1.5 rounded-lg text-sm">🎁</span>{' '}
                {t.approvalRewardTitle} ({pendingRewards.length})
              </h2>
              <div className="space-y-3">
                {pendingRewards.map((rew) => {
                  const child = profiles.find((p) => String(p.id) === String(rew.assignedTo));
                  return (
                    <div
                      key={rew.id}
                      className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-slate-700"
                    >
                      <div>
                        <p className="text-slate-400 text-xs">{child?.name || 'Anak'}</p>
                        <p className="text-base font-bold text-white">{rew.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApproveReward(rew.id)}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-sm shadow-md"
                      >
                        {t.btnGiveReward}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'manage' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowChildForm(!showChildForm)}
                className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left"
              >
                <span className="text-lg font-bold text-white flex items-center gap-2">
                  {t.manageChildTitle}
                </span>
                <span
                  className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${
                    showChildForm ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  ▼
                </span>
              </button>
              {showChildForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form
                    onSubmit={handleAddProfile}
                    className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Nama</label>
                        <input
                          type="text"
                          required
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Role</label>
                        <input
                          type="text"
                          value={profileForm.role}
                          onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/4">
                        <label className="text-xs text-slate-400 mb-1 block">Target Maks</label>
                        <input
                          type="number"
                          required
                          value={profileForm.maxStars}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, maxStars: Number(e.target.value) })
                          }
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-yellow-400 text-center font-bold"
                        />
                      </div>
                      <div className="w-full sm:w-1/4">
                        <label className="text-xs text-slate-400 mb-1 block">Avatar</label>
                        <select
                          value={profileForm.avatar}
                          onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white text-xl cursor-pointer"
                        >
                          {avatarOptions.map((av) => (
                            <option key={av} value={av}>
                              {av}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-1/2">
                        <label className="text-xs text-slate-400 mb-1 block">Tema Warna</label>
                        <select
                          value={profileForm.theme}
                          onChange={(e) => setProfileForm({ ...profileForm, theme: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium cursor-pointer"
                        >
                          {themeOptions.map((th) => (
                            <option key={th.value} value={th.value}>
                              {th.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl shadow-md"
                    >
                      + Tambah Profil
                    </button>
                  </form>
                  <div className="space-y-3">
                    {profiles.map((p) => (
                      <div key={p.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60">
                        {editingProfileId === p.id ? (
                          <div className="space-y-3 text-xs animate-fade-in">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold"
                                value={editProfileForm.name || ''}
                                onChange={(e) =>
                                  setEditProfileForm({ ...editProfileForm, name: e.target.value })
                                }
                              />
                              <input
                                type="text"
                                className="flex-1 bg-slate-800 border border-slate-600 p-2 rounded-lg text-white"
                                value={editProfileForm.role || ''}
                                onChange={(e) =>
                                  setEditProfileForm({ ...editProfileForm, role: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                              <button
                                type="button"
                                onClick={() => setEditingProfileId(null)}
                                className="text-slate-400 font-bold px-3 py-1.5"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={saveEditProfile}
                                className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black shadow-md"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{p.avatar}</span>
                              <span className="text-white font-bold">{p.name}</span>
                            </div>
                            <div className="flex gap-3 text-xs font-bold">
                              <button
                                type="button"
                                onClick={() => startEditProfile(p)}
                                className="text-blue-400"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(p.id)}
                                className="text-red-400"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left"
              >
                <span className="text-lg font-bold text-white flex items-center gap-2">
                  {t.manageTaskTitle}
                </span>
                <span
                  className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${
                    showTaskForm ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  ▼
                </span>
              </button>
              {showTaskForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form
                    onSubmit={handleAddTask}
                    className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700"
                  >
                    <div>
                      <label className="text-xs text-amber-400 font-bold mb-1 block">
                        💡 Gunakan Ide Misi (Opsional):
                      </label>
                      <select
                        onChange={(e) => {
                          const selected = MISSION_TEMPLATES.find((m) => m.id === e.target.value);
                          if (selected) {
                            setTaskForm({ ...taskForm, title: selected.title, reward: selected.points });
                          }
                        }}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-xs text-amber-300 font-medium"
                      >
                        <option value="">-- Pilih template otomatis --</option>
                        {Array.from(new Set(MISSION_TEMPLATES.map((m) => m.category))).map((cat) => (
                          <optgroup key={cat} label={cat} className="bg-slate-900 text-amber-500 font-bold">
                            {MISSION_TEMPLATES.filter((m) => m.category === cat).map((m) => (
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
                        <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                        <select
                          value={taskForm.assignedTo}
                          onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-bold"
                        >
                          <option value="all">🌟 Semua Anak</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Misi</label>
                        <input
                          type="text"
                          required
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Jenis</label>
                        <select
                          value={taskForm.type}
                          onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                        >
                          <option value="Daily">🔄 Rutinitas</option>
                          <option value="Achievement">🏆 Tantangan</option>
                        </select>
                      </div>
                      {taskForm.type === 'Daily' && (
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Siklus</label>
                          <select
                            value={taskForm.recurrence}
                            onChange={(e) => setTaskForm({ ...taskForm, recurrence: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                          >
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Hadiah</label>
                        <input
                          type="number"
                          required
                          value={taskForm.reward}
                          onChange={(e) => setTaskForm({ ...taskForm, reward: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-yellow-400 font-bold text-center"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-3 rounded-xl"
                    >
                      + Tambah Misi
                    </button>
                  </form>
                  <div className="space-y-3">
                    {tasks.map((t) => {
                      const child = profiles.find((p) => String(p.id) === String(t.assignedTo));
                      return (
                        <div key={t.id} className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60">
                          {editingTaskId === t.id ? (
                            <div className="space-y-3 text-xs animate-fade-in w-full">
                              <div>
                                <input
                                  type="text"
                                  className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold"
                                  value={editTaskForm.title || ''}
                                  onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="text-slate-400 font-bold px-3 py-1.5"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEditTask}
                                  className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black"
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-sm gap-3">
                              <div>
                                <p className="font-bold text-white">
                                  {t.title} <span className="text-yellow-400 text-xs ml-1">(+{t.reward}⭐)</span>
                                </p>
                              </div>
                              <div className="flex gap-3 text-xs font-bold">
                                <button
                                  type="button"
                                  onClick={() => startEditTask(t)}
                                  className="text-blue-400"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(t.id)}
                                  className="text-red-400"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowRewardForm(!showRewardForm)}
                className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left"
              >
                <span className="text-lg font-bold text-white flex items-center gap-2">
                  {t.manageRewardTitle}
                </span>
                <span
                  className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${
                    showRewardForm ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  ▼
                </span>
              </button>
              {showRewardForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-6 animate-fade-in">
                  <form
                    onSubmit={handleAddReward}
                    className="space-y-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-700"
                  >
                    <div>
                      <label className="text-xs text-rose-400 font-bold mb-1 block">
                        💡 Gunakan Ide Hadiah (Opsional):
                      </label>
                      <select
                        onChange={(e) => {
                          const selected = REWARD_TEMPLATES.find((r) => r.id === e.target.value);
                          if (selected) {
                            setRewardForm({ ...rewardForm, title: selected.title, cost: selected.points });
                          }
                        }}
                        className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-4 py-2.5 text-xs text-rose-300 font-medium"
                      >
                        <option value="">-- Pilih template otomatis --</option>
                        {Array.from(new Set(REWARD_TEMPLATES.map((r) => r.category))).map((cat) => (
                          <optgroup key={cat} label={cat} className="bg-slate-900 text-rose-500 font-bold">
                            {REWARD_TEMPLATES.filter((r) => r.category === cat).map((r) => (
                              <option key={r.id} value={r.id} className="text-slate-200 font-sans">
                                {r.title} ({r.points} ⭐)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                        <select
                          value={rewardForm.assignedTo}
                          onChange={(e) => setRewardForm({ ...rewardForm, assignedTo: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-bold"
                        >
                          <option value="all">🌟 Semua Anak</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Nama Hadiah</label>
                        <input
                          type="text"
                          required
                          value={rewardForm.title}
                          onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Biaya Bintang</label>
                      <input
                        type="number"
                        required
                        value={rewardForm.cost}
                        onChange={(e) => setRewardForm({ ...rewardForm, cost: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-yellow-400 font-bold text-center"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold px-4 py-3 rounded-xl shadow-md"
                    >
                      + Tambah Hadiah
                    </button>
                  </form>
                  <div className="space-y-3">
                    {rewards.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-2xl border border-slate-700 bg-slate-900/60 flex justify-between items-center text-sm"
                      >
                        {editingRewardId === r.id ? (
                          <div className="space-y-3 text-xs w-full animate-fade-in">
                            <div>
                              <input
                                type="text"
                                className="w-full bg-slate-800 border border-slate-600 p-2 rounded-lg text-white font-bold"
                                value={editRewardForm.title || ''}
                                onChange={(e) => setEditRewardForm({ ...editRewardForm, title: e.target.value })}
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50 mt-2">
                              <button
                                type="button"
                                onClick={() => setEditingRewardId(null)}
                                className="text-slate-400 font-bold px-3 py-1.5"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={saveEditReward}
                                className="bg-blue-600 px-4 py-1.5 rounded-xl text-white font-black"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="font-bold text-slate-200">
                                {r.title} <span className="text-amber-400 text-xs ml-1">({r.cost} ⭐)</span>
                              </p>
                            </div>
                            <div className="flex gap-3 text-xs font-bold">
                              <button
                                type="button"
                                onClick={() => startEditReward(r)}
                                className="text-blue-400"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteReward(r.id)}
                                className="text-red-400"
                              >
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-xl overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setShowWheelForm(!showWheelForm)}
                className="w-full px-6 py-4 flex justify-between items-center bg-slate-800/80 hover:bg-slate-700/30 transition-all text-left"
              >
                <span className="text-lg font-bold text-white flex items-center gap-2">
                  {t.manageWheelTitle}
                </span>
                <span
                  className={`text-slate-400 text-xl font-bold transform transition-transform duration-300 ${
                    showWheelForm ? 'rotate-180' : 'rotate-0'
                  }`}
                >
                  ▼
                </span>
              </button>
              {showWheelForm && (
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/20 space-y-4 animate-fade-in">
                  <div className="space-y-3">
                    {wheelPrizes.map((wp, i) => (
                      <div
                        key={i}
                        className="flex flex-col md:flex-row gap-2 bg-slate-900/40 p-3 rounded-xl border border-slate-700"
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={wp.label}
                            onChange={(e) => {
                              const newP = [...wheelPrizes];
                              newP[i].label = e.target.value;
                              setWheelPrizes(newP);
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs"
                          />
                        </div>
                        <div className="w-full md:w-1/5">
                          <select
                            value={wp.type}
                            onChange={(e) => {
                              const newP = [...wheelPrizes];
                              newP[i].type = e.target.value;
                              setWheelPrizes(newP);
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs"
                          >
                            <option value="star">+ Bintang</option>
                            <option value="reward">Hadiah</option>
                            <option value="zonk">Zonk</option>
                          </select>
                        </div>
                        <div className="w-full md:w-1/5">
                          <input
                            type="text"
                            value={wp.val}
                            onChange={(e) => {
                              const newP = [...wheelPrizes];
                              newP[i].val = e.target.value;
                              setWheelPrizes(newP);
                            }}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs"
                          />
                        </div>
                        <div className="w-full md:w-[60px]">
                          <input
                            type="color"
                            value={wp.color}
                            onChange={(e) => {
                              const newP = [...wheelPrizes];
                              newP[i].color = e.target.value;
                              setWheelPrizes(newP);
                            }}
                            className="w-full h-8 cursor-pointer rounded-lg border border-slate-600 p-0.5 bg-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await update(ref(db, `users/${user.uid}`), { wheelPrizes });
                      alert('Disimpan!');
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-3 rounded-xl shadow-md mt-4"
                  >
                    💾 Simpan Roda Gacha
                  </button>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-700/40 flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                {t.btnExit}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tTour = [
    { title: t.t1Title, desc: t.t1Desc, icon: '👶' },
    { title: t.t2Title, desc: t.t2Desc, icon: '📋' },
    { title: t.t3Title, desc: t.t3Desc, icon: '✅' },
    { title: t.t4Title, desc: t.t4Desc, icon: '🎟️' },
    { title: t.t5Title, desc: t.t5Desc, icon: '🔥' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-12 font-sans pb-32 relative overflow-hidden">
      <style>{`
        @keyframes bounce-soft {
          0%, 100% { transform: translateY(-8%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .animate-bounce-soft { animation: bounce-soft 1.5s infinite; }
      `}</style>
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/BG.jpg')", opacity: 0.15 }}
      ></div>

      {showTour && isPremium && !isAdmin && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-slate-800 border border-slate-600 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <span className="text-7xl mb-4 block animate-bounce-soft drop-shadow-md">
              {tTour[tourStep].icon}
            </span>
            <h3 className="text-xl font-black text-amber-400 mb-2">{tTour[tourStep].title}</h3>
            <p className="text-slate-300 text-sm mb-8 leading-relaxed font-medium">
              {tTour[tourStep].desc}
            </p>
            <div className="flex gap-2">
              {tourStep < tTour.length - 1 ? (
                <>
                  <button
                    onClick={finishTourOverlay}
                    className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    {t.tourSkipBtn}
                  </button>
                  <button
                    onClick={() => setTourStep(tourStep + 1)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                  >
                    {t.tourNext}
                  </button>
                </>
              ) : (
                <button
                  onClick={finishTourOverlay}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                >
                  {t.tourFinish}
                </button>
              )}
            </div>
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5">
              {tTour.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tourStep ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {celebration && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none bg-slate-900/70 backdrop-blur-md transition-opacity duration-500">
          {celebration === 'reward' && (
            <img
              src="/Icon Hadiah.png"
              className="w-[50vw] h-auto animate-bounce-soft drop-shadow-[0_0_50px_rgba(250,204,21,0.5)] object-contain"
              alt="Klaim Hadiah!"
            />
          )}
          {celebration === 'task' && (
            <img
              src="/Icon Menang.png"
              className="w-[75vw] max-w-[600px] h-auto animate-bounce-soft drop-shadow-[0_0_50px_rgba(250,204,21,0.5)] object-contain"
              alt="Misi Selesai!"
            />
          )}
          {celebration === 'ticket' && (
            <div className="flex flex-col items-center animate-bounce-soft">
              <img
                src="/Icon Tiket.png"
                className="w-[40vw] max-w-[300px] h-auto drop-shadow-[0_0_40px_rgba(234,179,8,0.7)] object-contain"
                alt="Dapat Tiket!"
              />
              <span className="text-yellow-400 font-black text-2xl mt-4 drop-shadow-md">+1 Tiket Harian!</span>
            </div>
          )}
          {celebration === 'spin_win' && (
            <div className="flex flex-col items-center animate-bounce-soft text-center p-8 bg-slate-800/80 border-2 border-yellow-400 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.5)]">
              <span className="text-6xl mb-4">🎉</span>
              <h2 className="text-3xl font-black text-white mb-2">Selamat!</h2>
              <p className="text-xl font-bold text-yellow-400">{spinWinText}</p>
            </div>
          )}
        </div>
      )}

      {activeWheelChild && !celebration && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4">
          <div className="bg-slate-800 p-8 rounded-[3rem] shadow-2xl border border-slate-700 w-full max-w-md flex flex-col items-center relative overflow-hidden">
            <button
              onClick={() => !isSpinning && setActiveWheelChild(null)}
              className="absolute top-4 right-6 text-slate-400 hover:text-white font-bold text-xl z-20"
              disabled={isSpinning}
            >
              ✖
            </button>
            <div className="text-center mb-8 relative z-10">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Gacha Bintang
              </h2>
              <p className="text-sm text-slate-400 font-bold">
                Tiketmu: <span className="text-yellow-400">{activeWheelChild.tickets || 0} 🎟️</span>
              </p>
            </div>

            <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-8">
              <div className="absolute -top-4 z-20 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[35px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"></div>
              <div
                className="w-full h-full rounded-full relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border-4 border-slate-700/80"
                style={{
                  background: `conic-gradient(${wheelPrizes
                    .map(
                      (p, i) =>
                        `${p.color} ${i * (360 / wheelPrizes.length)}deg ${
                          (i + 1) * (360 / wheelPrizes.length)
                        }deg`
                    )
                    .join(', ')})`,
                  transform: `rotate(${spinDegree}deg)`,
                  transition: 'transform 4s cubic-bezier(0.15,0.85,0.3,1)',
                }}
              >
                {wheelPrizes.map((p, i) => {
                  const sliceDeg = 360 / wheelPrizes.length;
                  const rot = i * sliceDeg + sliceDeg / 2;
                  return (
                    <div
                      key={i}
                      className="absolute inset-0 flex justify-center origin-center text-white font-black text-[10px] md:text-xs drop-shadow-md pt-4"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      <span className="w-16 text-center leading-tight">{p.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute z-10 w-12 h-12 bg-slate-800 rounded-full border-4 border-slate-600 shadow-inner"></div>
            </div>

            <button
              onClick={handleSpinWheel}
              disabled={isSpinning || (activeWheelChild.tickets || 0) < 3}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl ${
                isSpinning || (activeWheelChild.tickets || 0) < 3
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isSpinning ? '...' : t.spinBtn}
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full">
        {currentRole === 'child' ? renderChildView() : renderParentView()}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCurrentRole('child')}
          className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${
            currentRole === 'child'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-md scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t.modeChild}
        </button>
        <button
          type="button"
          onClick={() => setCurrentRole('parent')}
          className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${
            currentRole === 'parent'
              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-md scale-105'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {t.modeParent}
        </button>
        <div className="w-px h-6 bg-slate-600 mx-1"></div>
        <button
          onClick={() => {
            const newL = lang === 'id' ? 'en' : 'id';
            setLang(newL);
            if (user) {
              update(ref(db, `users/${user.uid}/system`), { lang: newL });
            }
          }}
          className="px-3 py-2 rounded-full font-black text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-all flex items-center gap-1"
        >
          🌍 {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
}