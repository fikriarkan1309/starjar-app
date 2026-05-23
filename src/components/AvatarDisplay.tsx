// src/components/AvatarDisplay.tsx
import React from 'react';

interface AvatarDisplayProps {
  avatar: string;
  className?: string;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ avatar, className = "w-16 h-16" }) => {
  // Kalau ada tanda '/' berarti ini link gambar (PNG)
  const isImage = avatar?.includes('/');
  
  return isImage ? (
    <img src={avatar} alt="Avatar" className={`${className} object-contain drop-shadow-md`} />
  ) : (
    // Kalau nggak ada tanda '/', berarti ini emoji lama
    <span className="text-5xl filter drop-shadow" style={{ fontSize: className.includes('w-') ? 'inherit' : undefined }}>
      {avatar}
    </span>
  );
};