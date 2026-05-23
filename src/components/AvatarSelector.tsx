import React from 'react';

interface AvatarSelectorProps {
  selected: string;
  options: string[];
  onSelect: (avatar: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selected, options, onSelect }) => {
  return (
    // PENGATURAN SCROLL KE SAMPING (FLEX ROW & OVERFLOW X)
    <div className="flex overflow-x-auto gap-3 pb-3 pt-1 px-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
      {options.map((av) => (
        <button
          type="button"
          key={av}
          onClick={() => onSelect(av)}
          className={`flex-shrink-0 p-2 rounded-2xl border-2 transition-all flex items-center justify-center w-[60px] h-[60px] ${
            selected === av ? 'border-yellow-400 bg-slate-700 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-110' : 'border-transparent bg-slate-800 hover:bg-slate-700/50'
          }`}
        >
          {av.includes('/') ? (
            <img src={av} alt="Avatar" className="w-12 h-12 object-contain drop-shadow-md pointer-events-none" />
          ) : (
            <span className="text-3xl filter drop-shadow pointer-events-none">{av}</span>
          )}
        </button>
      ))}
    </div>
  );
};