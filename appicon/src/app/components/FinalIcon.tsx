import React, { useRef } from "react";
import { Settings, Zap, Download, Sparkles, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "motion/react";

export const FinalIcon = () => {
  const iconRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (iconRef.current) {
      try {
        const dataUrl = await toPng(iconRef.current, { cacheBustybust: true });
        const link = document.createElement("a");
        link.download = "autospare-app-icon.png";
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Failed to download image", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(120,50,255,0.15),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-4">
          <Sparkles className="w-3 h-3" />
          <span>Premium Edition</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
          AutoSpare <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Zabarau</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-lg">
          A bold, futuristic identity designed to stand out on any home screen.
        </p>
      </motion.div>

      {/* 
        MAIN ICON CONTAINER
        This element is what gets downloaded. 
      */}
      <div className="relative group perspective-1000">
        <div 
          ref={iconRef}
          id="app-icon"
          className="relative w-80 h-80 md:w-96 md:h-96 rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-[0_0_80px_-20px_rgba(147,51,234,0.5)] border border-white/10"
        >
          {/* 
            BACKGROUND LAYERS 
          */}
          {/* 1. Base Zabarau Gradient - Richer and deeper */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#4c1d95] via-[#581c87] to-[#2e1065]" />
          
          {/* 2. Abstract Geometric Mesh / Tech Pattern */}
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" 
            style={{ 
              backgroundImage: `
                radial-gradient(circle at 100% 100%, rgba(255,255,255,0.1) 0%, transparent 50%),
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 40px 40px, 40px 40px'
            }} 
          />
          
          {/* 3. Central Glow/Highlight behind elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/30 blur-[60px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/20 blur-[40px] rounded-full" />

          {/* 
            ICON CONTENT 
          */}
          <div className="relative z-10 flex flex-col items-center justify-center transform scale-110">
             {/* Top: Emerald Gear */}
             <div className="relative">
                {/* Gear Glow */}
                <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                <Settings 
                  className="relative w-36 h-36 text-emerald-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]" 
                  strokeWidth={1.5} 
                />
             </div>
             
             {/* Bottom Row: Zap + Text */}
             <div className="flex items-center gap-2 mt-[-10px] relative">
               <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400/20 blur-lg rounded-full" />
                  <Zap className="relative w-10 h-10 text-white fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
               </div>
               <span className="text-white font-black tracking-[0.25em] text-3xl drop-shadow-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                 AUTO
               </span>
             </div>
          </div>

          {/* 
            OVERLAYS
          */}
          {/* Top Gloss */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
          
          {/* Inner Border Ring */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" />
        </div>
      </div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-12 flex flex-col sm:flex-row items-center gap-4"
      >
        <button 
          onClick={handleDownload}
          className="group relative flex items-center gap-3 bg-white text-purple-900 font-bold py-4 px-10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-1 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
          <Download className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Download Icon</span>
        </button>
      </motion.div>
      
      <p className="mt-6 text-sm text-slate-500">
        Ready for iOS and Android
      </p>
    </div>
  );
};
