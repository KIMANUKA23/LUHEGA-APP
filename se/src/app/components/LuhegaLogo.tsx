import React from 'react';

interface LuhegaLogoProps {
  className?: string;
  size?: number;
}

export const LuhegaLogo: React.FC<LuhegaLogoProps> = ({ className = '', size = 64 }) => {
  // 4 squares in a 2x2 grid
  // Gap proportional to size
  const gap = size * 0.15;
  const squareSize = (size - gap) / 2;

  return (
    <div 
      className={`grid grid-cols-2 ${className}`} 
      style={{ 
        width: size, 
        height: size, 
        gap: gap 
      }}
    >
      <div className="bg-blue-600 rounded-lg w-full h-full" />
      <div className="bg-blue-600 rounded-lg w-full h-full" />
      <div className="bg-blue-600 rounded-lg w-full h-full" />
      <div className="bg-blue-600 rounded-lg w-full h-full" />
    </div>
  );
};
