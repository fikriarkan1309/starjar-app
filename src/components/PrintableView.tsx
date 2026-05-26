// src/components/PrintableView.tsx
import React from 'react';

interface PrintableViewProps {
  profiles: any[];
  tasks: any[];
  rewards: any[];
}

export const PrintableView: React.FC<PrintableViewProps> = ({ profiles, tasks, rewards }) => {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    // 'hidden' di layar biasa, 'print:block' saat diprint
    <div className="hidden print:block w-full bg-white text-black p-8 font-sans">
      {profiles.map((profile) => {
        // Ambil data khusus anak ini (atau yang statusnya 'all')
        const childTasks = tasks.filter(t => t.assignedTo === profile.id || t.assignedTo === 'all');
        const routines = childTasks.filter(t => t.type === 'Daily');
        const achievements = childTasks.filter(t => t.type === 'Achievement');
        const childRewards = rewards.filter(r => r.assignedTo === profile.id || r.assignedTo === 'all');

        return (
          // break-after-page bikin 1 anak 1 kertas, nggak nyampur
          <div key={profile.id} className="break-after-page mb-12">
            
            {/* Header Kertas */}
            <div className="flex items-center gap-4 mb-6 border-b-[3px] border-black pb-4">
              {profile.avatar?.includes('/') ? (
                <img src={profile.avatar} alt="avatar" className="w-16 h-16 object-contain" />
              ) : (
                <span className="text-4xl">{profile.avatar}</span>
              )}
              <div>
                <h1 className="text-4xl font-black uppercase tracking-widest">{profile.name}</h1>
                <p className="text-xl text-gray-600 font-bold tracking-wide">Papan Misi & Tracker Hadiah</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* KOLOM KIRI: RUTINITAS HARIAN (Ceklis Senin-Minggu) */}
              <div>
                <h2 className="text-xl font-bold bg-gray-200 p-2 mb-3 text-center uppercase border border-black">
                  🔄 Rutinitas Harian
                </h2>
                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr>
                      <th className="border border-black p-2 text-left bg-gray-100">Nama Misi</th>
                      {days.map(d => <th key={d} className="border border-black p-1 text-center text-xs bg-gray-100">{d}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {routines.map(t => (
                      <tr key={t.id}>
                        <td className="border border-black p-2 font-medium">
                          {t.title} <span className="font-bold text-gray-500">({t.reward}⭐)</span>
                        </td>
                        {days.map(d => (
                          <td key={d} className="border border-black p-2 text-center">
                            <div className="w-4 h-4 border border-black mx-auto rounded-sm"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KOLOM KANAN: TANTANGAN BESAR & KATALOG HADIAH */}
              <div>
                {/* Tantangan */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold bg-gray-200 p-2 mb-3 text-center uppercase border border-black">
                    🏆 Tantangan (Misi Sekali)
                  </h2>
                  <ul className="space-y-2 border border-black p-3">
                    {achievements.map(t => (
                      <li key={t.id} className="flex justify-between items-center text-sm border-b border-gray-300 pb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border border-black rounded-sm"></div>
                          <span>{t.title}</span>
                        </div>
                        <span className="font-bold border border-black px-2 py-0.5 rounded-full">{t.reward}⭐</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hadiah */}
                <div>
                  <h2 className="text-xl font-bold bg-gray-200 p-2 mb-3 text-center uppercase border border-black">
                    🎁 Katalog Hadiah
                  </h2>
                  <ul className="space-y-2 border border-black p-3">
                    {childRewards.map(r => (
                      <li key={r.id} className="flex justify-between items-center text-sm border-b border-dashed border-gray-400 pb-1">
                        <span className="font-medium">{r.title}</span>
                        <span className="font-bold border-2 border-black px-2 py-0.5 rounded-full">{r.cost}⭐</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer / Ttd */}
            <div className="mt-12 pt-8 border-t border-gray-400 flex justify-between px-10">
              <div className="text-center">
                <p className="mb-8 font-bold">Orang Tua,</p>
                <p className="border-t border-black w-32 pt-1">( ........................... )</p>
              </div>
              <div className="text-center">
                <p className="mb-8 font-bold">Anak Hebat,</p>
                <p className="border-t border-black w-32 pt-1">( ........................... )</p>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};