import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- CONFIG FIREBASE STARJAR MILIK FIKRI ---
const firebaseConfig = {
  apiKey: "AIzaSyCyK1iq0pRBcRCUOElmHxhfOOyRek_Graw",
  authDomain: "starjar-f3461.firebaseapp.com",
  projectId: "starjar-f3461",
  storageBucket: "starjar-f3461.firebasestorage.app",
  messagingSenderId: "834288744757",
  appId: "1:834288744757:web:8babfcb387284efc54347c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const [currentRole, setCurrentRole] = useState<'child' | 'parent'>('parent');
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [parentTab, setParentTab] = useState<'stats' | 'approval' | 'manage'>('manage'); 
  const [celebration, setCelebration] = useState<'task' | 'reward' | null>(null);

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

  useEffect(() => {
    // Parsing data Firebase dengan Type-Safe yang disukai Vercel
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const pData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          role: data.role || '',
          stars: typeof data.stars === 'number' ? data.stars : 0,
          maxStars: typeof data.maxStars === 'number' ? data.maxStars : 50,
          avatar: data.avatar || '👶',
          theme: data.theme || 'from-pink-500 to-rose-400'
        } as Profile;
      });
      setProfiles(pData);
    });

    const unsubRewards = onSnapshot(collection(db, 'rewards'), (snapshot) => {
      const rData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          cost: typeof data.cost === 'number' ? data.cost : 10,
          isClaimed: !!data.isClaimed,
          isApproved: !!data.isApproved,
          assignedTo: data.assignedTo || ''
        } as Reward;
      });
      setRewards(rData);
    });

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          type: data.type || 'Daily',
          recurrence: data.recurrence || 'none',
          reward: typeof data.reward === 'number' ? data.reward : 2,
          isDone: !!data.isDone,
          isApproved: !!data.isApproved,
          assignedTo: data.assignedTo || ''
        } as Task;
      });
      
      setTasks(tData);

      // Logika Reset Waktu
      const today = new Date();
      const todayStr = today.toDateString();
      const currentWeek = getWeekNumber(today);
      const currentMonth = today.getFullYear() + '-' + today.getMonth();

      if (localStorage.getItem('lastDailyReset') !== todayStr) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'daily' && (t.isDone || t.isApproved)) {
            updateDoc(doc(db, 'tasks', t.id), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem('lastDailyReset', todayStr);
      }

      if (localStorage.getItem('lastWeeklyReset') !== currentWeek) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'weekly' && (t.isDone || t.isApproved)) {
            updateDoc(doc(db, 'tasks', t.id), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem('lastWeeklyReset', currentWeek);
      }

      if (localStorage.getItem('lastMonthlyReset') !== currentMonth) {
        tData.forEach(t => {
          if (t.type === 'Daily' && t.recurrence === 'monthly' && (t.isDone || t.isApproved)) {
            updateDoc(doc(db, 'tasks', t.id), { isDone: false, isApproved: false });
          }
        });
        localStorage.setItem('lastMonthlyReset', currentMonth);
      }
    });

    return () => { unsubProfiles(); unsubTasks(); unsubRewards(); };
  }, []);

  // --- STATE INPUT ---
  const [profileForm, setProfileForm] = useState({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  const [taskForm, setTaskForm] = useState({ title: '', type: 'Daily', recurrence: 'daily', reward: 2, assignedTo: 'all' });
  const [rewardForm, setRewardForm] = useState({ title: '', cost: 10, assignedTo: 'all' });

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<Profile>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<Task>>({});
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardForm, setEditRewardForm] = useState<Partial<Reward>>({});

  const handleCompleteTask = async (taskId: string) => {
    triggerCelebration('task');
    await updateDoc(doc(db, 'tasks', taskId), { isDone: true });
  };

  const handleClaimReward = async (rewardId: string, childId: string, cost: number) => {
    const child = profiles.find(p => p.id === childId);
    if (!child) return;
    if (child.stars < cost) return alert("Bintangmu belum cukup! 💪🌟");
    
    triggerCelebration('reward');
    await updateDoc(doc(db, 'profiles', childId), { stars: child.stars - cost });
    await updateDoc(doc(db, 'rewards', rewardId), { isClaimed: true });
  };

  const handleApproveTask = async (taskId: string, childId: string | undefined, reward: number) => {
    if (!childId) return;
    const child = profiles.find(p => p.id === childId);
    if (!child) return;
    await updateDoc(doc(db, 'tasks', taskId), { isApproved: true });
    await updateDoc(doc(db, 'profiles', childId), { stars: Math.min(child.stars + reward, child.maxStars) });
  };

  const handleApproveReward = async (rewardId: string) => {
    await updateDoc(doc(db, 'rewards', rewardId), { isApproved: true });
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name) return;
    await addDoc(collection(db, 'profiles'), { 
      name: profileForm.name, role: profileForm.role || 'Anak', 
      stars: 0, maxStars: Number(profileForm.maxStars), 
      avatar: profileForm.avatar, theme: profileForm.theme 
    });
    setProfileForm({ name: '', role: '', maxStars: 50, avatar: '👶', theme: 'from-pink-500 to-rose-400' });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || profiles.length === 0) return;
    
    const baseTask = {
      title: taskForm.title, type: taskForm.type,
      recurrence: taskForm.type === 'Daily' ? taskForm.recurrence : 'none',
      reward: Number(taskForm.reward), isDone: false, isApproved: false,
    };

    if (taskForm.assignedTo === 'all') {
      profiles.forEach(async (p) => {
        await addDoc(collection(db, 'tasks'), { ...baseTask, assignedTo: p.id });
      });
    } else {
      await addDoc(collection(db, 'tasks'), { ...baseTask, assignedTo: taskForm.assignedTo });
    }
    setTaskForm({ ...taskForm, title: '' }); 
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.title || profiles.length === 0) return;

    const baseReward = {
      title: rewardForm.title, cost: Number(rewardForm.cost),
      isClaimed: false, isApproved: false,
    };

    if (rewardForm.assignedTo === 'all') {
      profiles.forEach(async (p) => {
        await addDoc(collection(db, 'rewards'), { ...baseReward, assignedTo: p.id });
      });
    } else {
      await addDoc(collection(db, 'rewards'), { ...baseReward, assignedTo: rewardForm.assignedTo });
    }
    setRewardForm({ ...rewardForm, title: '' });
  };

  const startEditProfile = (profile: Profile) => { setEditingProfileId(profile.id); setEditProfileForm({ ...profile }); };
  const saveEditProfile = async () => {
    if (!editingProfileId) return;
    await updateDoc(doc(db, 'profiles', editingProfileId), { 
      ...editProfileForm, maxStars: Number(editProfileForm.maxStars || 50) 
    });
    setEditingProfileId(null);
  };
  const handleDeleteProfile = async (id: string) => {
    if (window.confirm('Yakin menghapus akun ini beserta Misi dan Hadiahnya?')) {
      await deleteDoc(doc(db, 'profiles', id));
      tasks.filter(t => t.assignedTo === id).forEach(t => deleteDoc(doc(db, 'tasks', t.id)));
      rewards.filter(r => r.assignedTo === id).forEach(r => deleteDoc(doc(db, 'rewards', r.id)));
    }
  };

  const startEditTask = (task: Task) => { setEditingTaskId(task.id); setEditTaskForm({ ...task }); };
  const saveEditTask = async () => {
    if (!editingTaskId) return;
    await updateDoc(doc(db, 'tasks', editingTaskId), { 
      ...editTaskForm, reward: Number(editTaskForm.reward || 0), 
      recurrence: editTaskForm.type === 'Daily' ? editTaskForm.recurrence : 'none' 
    });
    setEditingTaskId(null);
  };
  const handleDeleteTask = async (id: string) => await deleteDoc(doc(db, 'tasks', id));

  const startEditReward = (reward: Reward) => { setEditingRewardId(reward.id); setEditRewardForm({ ...reward }); };
  const saveEditReward = async () => {
    if (!editingRewardId) return;
    await updateDoc(doc(db, 'rewards', editingRewardId), { 
      ...editRewardForm, cost: Number(editRewardForm.cost || 0) 
    });
    setEditingRewardId(null);
  };
  const handleDeleteReward = async (id: string) => await deleteDoc(doc(db, 'rewards', id));

  const getTaskLabel = (task: Task) => {
    if (task.type === 'Achievement') return '🏆 Pencapaian';
    if (task.recurrence === 'daily') return '🔄 Harian';
    if (task.recurrence === 'weekly') return '🔄 Mingguan';
    if (task.recurrence === 'monthly') return '🔄 Bulanan';
    return '🔄 Rutinitas';
  };

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
          return (
            <div key={profile.id} className="bg-slate-800/60 backdrop-blur-sm rounded-[2.5rem] border-2 border-slate-700/50 p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex flex-row items-center justify-between gap-4 mb-10 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`text-5xl bg-gradient-to-br ${profile.theme} p-4 rounded-[2rem] shadow-lg transform -rotate-3`}>{profile.avatar}</div>
                    <div>
                      <h2 className="text-3xl font-black text-white">{profile.name}</h2>
                      <p className="text-slate-400 font-medium text-lg mt-1">{profile.role}</p>
                    </div>
                  </div>
                  
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

                <div className="space-y-4 relative z-10 mb-8">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">🎯 Misimu:</h3>
                  {tasks.filter(t => String(t.assignedTo) === String(profile.id) && !t.isApproved).map(task => (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl border bg-slate-900/40 border-slate-700 gap-3">
                      <div>
                        <p className="text-base font-bold text-slate-100">{task.title}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${task.type === 'Achievement' ? 'text-purple-300 bg-purple-500/20' : 'text-blue-300 bg-blue-500/20'}`}>
                          {getTaskLabel(task)}
                        </span>
                      </div>
                      <button onClick={() => handleCompleteTask(task.id)} disabled={task.isDone} className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-sm transition-all ${task.isDone ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 shadow-md hover:scale-105 active:scale-95'}`}>
                        {task.isDone ? 'Ditinjau ⏳' : `+${task.reward} ⭐`}
                      </button>
                    </div>
                  ))}
                  {tasks.filter(t => String(t.assignedTo) === String(profile.id) && !t.isApproved).length === 0 && (
                     <p className="text-slate-500 text-sm italic">Hore! Belum ada misi baru.</p>
                  )}
                </div>
              </div>

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
                    {rewards.filter(r => String(r.assignedTo) === String(profile.id) && !r.isApproved).length === 0 && (
                      <p className="text-slate-500 text-xs italic text-center">Belum ada hadiah di katalog.</p>
                    )}
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
            <button onClick={() => setParentTab('stats')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'stats' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📊 Statistik</button>
            <button onClick={() => setParentTab('approval')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'approval' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🔔 Persetujuan {(pendingTasks.length > 0 || pendingRewards.length > 0) && (<span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingTasks.length + pendingRewards.length}</span>)}</button>
            <button onClick={() => setParentTab('manage')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${parentTab === 'manage' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>⚙️ Kelola Data</button>
          </div>
        </header>

        {parentTab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-4xl shadow-inner">⭐</div>
                  <div><p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Bintang Aktif</p><p className="text-4xl font-black text-white">{profiles.reduce((sum, p) => sum + p.stars, 0)}</p></div>
               </div>
               <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-green-400/10 flex items-center justify-center text-4xl shadow-inner">✅</div>
                  <div><p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Rasio Misi Selesai</p><div className="flex items-baseline gap-2"><p className="text-4xl font-black text-white">{completionRate}%</p><p className="text-slate-500 text-sm">({completedTasks}/{totalTasks})</p></div></div>
               </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl">
               <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><span className="bg-indigo-500/20 text-indigo-400 p-1.5 rounded-lg text-sm">📈</span> Progres Toples Bintang</h2>
               <div className="space-y-6">
                  {profiles.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">Belum ada akun anak terdaftar.</p> : profiles.map(p => {
                       const percent = Math.min((p.stars / p.maxStars) * 100, 100);
                       return (
                          <div key={p.id} className="space-y-2">
                             <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2"><span className="text-2xl">{p.avatar}</span><span className="text-white font-bold text-sm md:text-base">{p.name}</span></div>
                                <div className="text-right"><span className="text-yellow-400 font-black text-lg">{p.stars}</span><span className="text-slate-500 text-xs font-bold ml-1">/ {p.maxStars} ⭐</span></div>
                             </div>
                             <div className="w-full bg-slate-900 rounded-full h-5 md:h-6 border border-slate-700 overflow-hidden relative shadow-inner">
                                <div className={`h-full rounded-full bg-gradient-to-r ${p.theme} transition-all duration-1000 ease-out relative`} style={{ width: `${percent}%` }}><div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-full"></div></div>
                             </div>
                          </div>
                       )
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
                      <button onClick={() => handleApproveTask(task.id, child?.id, task.reward)} className="bg-green-500 hover:bg-green-400 text-slate-900 font-black px-4 py-2 rounded-xl text-sm transition-all shadow-md">Setujui +{task.reward}⭐</button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="bg-orange-500/20 text-orange-400 p-1.5 rounded-lg text-sm">🎁</span> Klaim Hadiah ({pendingRewards.length})</h2>
              {pendingRewards.length === 0 && <p className="text-slate-500 text-sm">Belum ada hadiah diklaim.</p>}
              <div className="space-y-3">
                {pendingRewards.map(reward => {
                  const child = profiles.find(p => String(p.id) === String(reward.assignedTo));
                  return (
                    <div key={reward.id} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-orange-500/30">
                      <div><p className="text-orange-400 text-xs">{child?.name || 'Anak'} ingin:</p><p className="text-base font-bold text-white">{reward.title}</p></div>
                      <button onClick={() => handleApproveReward(reward.id)} className="bg-orange-500 hover:bg-orange-400 text-white font-black px-4 py-2 rounded-xl text-sm transition-all shadow-md">Sudah Diberikan ✓</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {parentTab === 'manage' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl md:col-span-2">
                <h2 className="text-lg font-bold text-white mb-4">👶 Tambah Akun Anak</h2>
                <form onSubmit={handleAddProfile} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Nama Panggilan</label><input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div>
                    <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Status</label><input type="text" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-1/4"><label className="text-xs text-yellow-400 mb-1 block">Kapasitas Toples</label><input type="number" required value={profileForm.maxStars} onChange={e => setProfileForm({...profileForm, maxStars: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div>
                    <div className="w-full sm:w-1/4"><label className="text-xs text-slate-400 mb-1 block">Avatar</label><select value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-xl cursor-pointer"><option value="👶">👶 Bayi</option><option value="👧">👧 Anak Pr</option><option value="👦">👦 Anak Lk</option><option value="👸">👸 Putri</option><option value="🤴">🤴 Pangeran</option><option value="🦸‍♀️">🦸‍♀️ Heroine</option><option value="🦸‍♂️">🦸‍♂️ Hero</option><option value="🥷">🥷 Ninja</option><option value="🦁">🦁 Singa</option><option value="🐼">🐼 Panda</option><option value="🦊">🦊 Rubah</option><option value="🐸">🐸 Katak</option></select></div>
                    <div className="w-full sm:w-1/2"><label className="text-xs text-slate-400 mb-1 block">Tema Warna Background</label><select value={profileForm.theme} onChange={e => setProfileForm({...profileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"><option value="from-pink-500 to-rose-400">🩷 Pink Ceria</option><option value="from-cyan-500 to-blue-400">🩵 Biru Samudra</option><option value="from-purple-500 to-indigo-400">💜 Ungu Galaksi</option><option value="from-emerald-400 to-teal-400">💚 Hijau Zamrud</option><option value="from-orange-400 to-red-400">❤️ Merah Api</option><option value="from-yellow-400 to-amber-500">💛 Kuning Emas</option></select></div>
                  </div>
                  <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-all mt-2">+ Buat Akun Anak</button>
                </form>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🎯 Tambah Misi</h2>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Tugaskan ke:</label>
                    <select value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer font-bold">
                      <option value="all">🌟 Semua Anak</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 mb-1 block">Nama Misi:</label><input type="text" required value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Kategori:</label>
                      <select value={taskForm.type} onChange={e => setTaskForm({...taskForm, type: e.target.value, recurrence: e.target.value === 'Daily' ? 'daily' : 'none'})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                        <option value="Daily">Rutinitas</option>
                        <option value="Achievement">Pencapaian</option>
                      </select>
                    </div>
                    {taskForm.type === 'Daily' && (
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">Ulangi:</label>
                        <select value={taskForm.recurrence} onChange={e => setTaskForm({...taskForm, recurrence: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                          <option value="daily">Tiap Hari</option>
                          <option value="weekly">Tiap Minggu</option>
                          <option value="monthly">Tiap Bulan</option>
                        </select>
                      </div>
                    )}
                    <div className="w-20">
                      <label className="text-xs text-slate-400 mb-1 block">Bintang:</label>
                      <input type="number" min="1" required value={taskForm.reward} onChange={e => setTaskForm({...taskForm, reward: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-center font-bold text-yellow-400" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold px-4 py-3 rounded-xl transition-all">+ Tambah Misi</button>
                </form>
              </div>

              <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">🎁 Tambah Hadiah</h2>
                <form onSubmit={handleAddReward} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Untuk Anak:</label>
                    <select value={rewardForm.assignedTo} onChange={e => setRewardForm({...rewardForm, assignedTo: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 cursor-pointer font-bold">
                      <option value="all">🌟 Semua Anak</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-400 mb-1 block">Nama Hadiah:</label><input type="text" required value={rewardForm.title} onChange={e => setRewardForm({...rewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500" /></div>
                  <div><label className="text-xs text-slate-400 mb-1 block">Harga Bintang:</label><input type="number" min="1" required value={rewardForm.cost} onChange={e => setRewardForm({...rewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 font-bold text-yellow-400" /></div>
                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold px-4 py-3 rounded-xl transition-all mt-auto">+ Tambah Hadiah</button>
                </form>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-3xl p-6 md:p-8 border border-slate-700 mt-8">
              <h2 className="text-xl font-bold text-white mb-6">🗂️ Daftar Data Saat Ini</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-slate-400 font-bold text-sm uppercase mb-3 border-b border-slate-700 pb-2">Akun Terdaftar</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profiles.map(p => (
                      editingProfileId === p.id ? (
                        <div key={p.id} className="bg-slate-800 p-4 rounded-xl border border-blue-500 shadow-xl col-span-1 sm:col-span-2 space-y-3 animate-fade-in">
                          <h4 className="text-blue-400 font-bold text-sm mb-2">✏️ Edit Akun</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase">Nama</label><input type="text" value={editProfileForm.name || ''} onChange={e => setEditProfileForm({...editProfileForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                            <div><label className="text-[10px] text-slate-400 uppercase">Status</label><input type="text" value={editProfileForm.role || ''} onChange={e => setEditProfileForm({...editProfileForm, role: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                            <div><label className="text-[10px] text-yellow-400 uppercase">Max Toples</label><input type="number" value={editProfileForm.maxStars || 50} onChange={e => setEditProfileForm({...editProfileForm, maxStars: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                            <div className="flex gap-2">
                              <div className="w-1/3"><label className="text-[10px] text-slate-400 uppercase">Avatar</label><select value={editProfileForm.avatar || '👶'} onChange={e => setEditProfileForm({...editProfileForm, avatar: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="👶">👶</option><option value="👧">👧</option><option value="👦">👦</option><option value="👸">👸</option><option value="🤴">🤴</option><option value="🦸‍♀️">🦸‍♀️</option><option value="🦸‍♂️">🦸‍♂️</option><option value="🥷">🥷</option><option value="🦁">🦁</option><option value="🐼">🐼</option><option value="🦊">🦊</option><option value="🐸">🐸</option></select></div>
                              <div className="w-2/3"><label className="text-[10px] text-slate-400 uppercase">Tema</label><select value={editProfileForm.theme || 'from-pink-500 to-rose-400'} onChange={e => setEditProfileForm({...editProfileForm, theme: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="from-pink-500 to-rose-400">🩷 Pink</option><option value="from-cyan-500 to-blue-400">🩵 Biru</option><option value="from-purple-500 to-indigo-400">💜 Ungu</option><option value="from-emerald-400 to-teal-400">💚 Hijau</option><option value="from-orange-400 to-red-400">❤️ Merah</option><option value="from-yellow-400 to-amber-500">💛 Kuning</option></select></div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700"><button onClick={() => setEditingProfileId(null)} className="text-slate-400 hover:text-white px-4 py-2 text-sm font-bold">Batal</button><button onClick={saveEditProfile} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-bold">Simpan</button></div>
                        </div>
                      ) : (
                        <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-3 rounded-xl border border-slate-700 gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br ${p.theme} text-xl shadow-md`}>{p.avatar}</div>
                            <div><p className="text-white font-bold text-sm">{p.name}</p><p className="text-slate-500 text-[10px] uppercase font-bold">Toples: {p.maxStars} ⭐</p></div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end"><button onClick={() => startEditProfile(p)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">Edit</button><button onClick={() => handleDeleteProfile(p.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">Hapus</button></div>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-slate-400 font-bold text-sm uppercase mb-3 border-b border-slate-700 pb-2">Daftar Misi Aktif</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {tasks.map(t => {
                      const child = profiles.find(p => String(p.id) === String(t.assignedTo));
                      return editingTaskId === t.id ? (
                        <div key={t.id} className="bg-slate-800 p-4 rounded-xl border border-blue-500 shadow-xl space-y-3 animate-fade-in">
                          <div className="flex flex-col gap-3">
                            <div><label className="text-[10px] text-slate-400 uppercase">Nama Misi</label><input type="text" value={editTaskForm.title || ''} onChange={e => setEditTaskForm({...editTaskForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                            <div className="flex gap-2">
                              <div className="flex-1"><label className="text-[10px] text-slate-400 uppercase">Kategori</label><select value={editTaskForm.type || 'Daily'} onChange={e => setEditTaskForm({...editTaskForm, type: e.target.value, recurrence: e.target.value === 'Daily' ? 'daily' : 'none'})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="Daily">Rutinitas</option><option value="Achievement">Pencapaian</option></select></div>
                              {editTaskForm.type === 'Daily' && (
                                <div className="flex-1"><label className="text-[10px] text-slate-400 uppercase">Ulangi</label><select value={editTaskForm.recurrence || 'daily'} onChange={e => setEditTaskForm({...editTaskForm, recurrence: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm"><option value="daily">Harian</option><option value="weekly">Mingguan</option><option value="monthly">Bulanan</option></select></div>
                              )}
                              <div className="w-16"><label className="text-[10px] text-yellow-400 uppercase">Bintang</label><input type="number" value={editTaskForm.reward || 0} onChange={e => setEditTaskForm({...editTaskForm, reward: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm text-center" /></div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                            <div className="w-1/2"><select value={editTaskForm.assignedTo || ''} onChange={e => setEditTaskForm({...editTaskForm, assignedTo: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-300 text-xs w-full">{profiles.map(p => <option key={p.id} value={p.id}>Untuk: {p.name}</option>)}</select></div>
                            <div className="flex gap-2"><button onClick={() => setEditingTaskId(null)} className="text-slate-400 hover:text-white px-3 py-1.5 text-sm font-bold">Batal</button><button onClick={saveEditTask} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold">Simpan</button></div>
                          </div>
                        </div>
                      ) : (
                        <div key={t.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-3 rounded-xl border border-slate-700 gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                               <p className="text-white font-bold text-sm">{t.title}</p>
                               <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${t.type === 'Achievement' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>{getTaskLabel(t)}</span>
                            </div>
                            <p className="text-slate-500 text-xs mt-1">Untuk: {child?.name || 'Akun Terhapus'} <span className="text-yellow-400 ml-1">({t.reward} ⭐)</span></p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none border-slate-800 pt-2 sm:pt-0"><button onClick={() => startEditTask(t)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-1 rounded-lg text-xs font-bold transition-all">Edit</button><button onClick={() => handleDeleteTask(t.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-lg text-xs font-bold transition-all">Hapus</button></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-slate-400 font-bold text-sm uppercase mb-3 border-b border-slate-700 pb-2">Katalog Hadiah Aktif</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {rewards.map(r => {
                      const child = profiles.find(p => String(p.id) === String(r.assignedTo));
                      return editingRewardId === r.id ? (
                        <div key={r.id} className="bg-slate-800 p-4 rounded-xl border border-blue-500 shadow-xl space-y-3 animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2"><label className="text-[10px] text-slate-400 uppercase">Nama Hadiah</label><input type="text" value={editRewardForm.title || ''} onChange={e => setEditRewardForm({...editRewardForm, title: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                            <div><label className="text-[10px] text-yellow-400 uppercase">Harga</label><input type="number" value={editRewardForm.cost || 0} onChange={e => setEditRewardForm({...editRewardForm, cost: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm" /></div>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                            <div className="w-1/2"><select value={editRewardForm.assignedTo || ''} onChange={e => setEditRewardForm({...editRewardForm, assignedTo: e.target.value})} className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-slate-300 text-xs w-full">{profiles.map(p => <option key={p.id} value={p.id}>Untuk: {p.name}</option>)}</select></div>
                            <div className="flex gap-2"><button onClick={() => setEditingRewardId(null)} className="text-slate-400 hover:text-white px-3 py-1.5 text-sm font-bold">Batal</button><button onClick={saveEditReward} className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-lg text-sm font-bold">Simpan</button></div>
                          </div>
                        </div>
                      ) : (
                        <div key={r.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-3 rounded-xl border border-slate-700 gap-2">
                          <div><p className="text-white font-bold text-sm">{r.title} <span className="text-yellow-400 ml-2">({r.cost} ⭐)</span></p><p className="text-slate-500 text-xs">Untuk: {child?.name || 'Akun Terhapus'}</p></div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end border-t sm:border-none border-slate-800 pt-2 sm:pt-0"><button onClick={() => startEditReward(r)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-1 rounded-lg text-xs font-bold transition-all">Edit</button><button onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded-lg text-xs font-bold transition-all">Hapus</button></div>
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans pb-32">
      {celebration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500">
          <div className="text-9xl animate-bounce drop-shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            {celebration === 'reward' ? '🎉🎁🎉' : '⭐✨'}
          </div>
        </div>
      )}

      {currentRole === 'child' ? renderChildView() : renderParentView()}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-2xl flex items-center gap-1">
        <button onClick={() => setCurrentRole('child')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'child' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>👦👧 Mode Anak</button>
        <button onClick={() => setCurrentRole('parent')} className={`px-5 py-2 rounded-full font-black text-xs md:text-sm transition-all ${currentRole === 'parent' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>👨👩 Mode Orang Tua</button>
      </div>
    </div>
  );
}