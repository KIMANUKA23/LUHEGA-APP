import React from "react";
import { Car, Wrench, Package, Database, Settings, Zap, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export const IconShowcase = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-16 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4"
          >
            App Icon Concepts
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            For <span className="font-semibold text-indigo-600">AutoSpare Inventory System</span>. 
            Designed for impact, clarity, and brand recognition.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Concept 1 */}
          <IconCard 
            title="Modern Mechanic"
            description="Trustworthy and Professional. Uses a deep blue gradient to signify reliability."
            delay={0.3}
          >
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center overflow-hidden">
               {/* Background Pattern */}
               <div className="absolute inset-0 opacity-10 scale-150">
                  <Wrench className="w-full h-full stroke-white rotate-45" strokeWidth={0.5} />
               </div>
               
               {/* Main Icon */}
               <div className="relative z-10 bg-white/20 backdrop-blur-sm p-4 rounded-2xl border border-white/30 shadow-2xl">
                 <Car className="w-16 h-16 text-white drop-shadow-md" strokeWidth={1.5} />
               </div>
            </div>
          </IconCard>

          {/* Concept 2 */}
          <IconCard 
            title="Fast Inventory"
            description="Energetic and Efficient. The orange gradient captures attention and implies speed."
            delay={0.4}
          >
            <div className="relative w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
              
              <div className="relative z-10 transform -rotate-6 transition-transform hover:rotate-0 duration-500">
                <Package className="w-20 h-20 text-white fill-white/10 drop-shadow-lg" strokeWidth={1.5} />
                <div className="absolute -bottom-2 -right-2 bg-white text-orange-600 rounded-full p-1.5 shadow-lg">
                  <CheckCircle2 fill="currentColor" strokeWidth={3} className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </IconCard>

          {/* Concept 3 */}
          <IconCard 
            title="Tech Specs"
            description="Premium and High-Tech. Dark mode aesthetic for a modern SaaS feel."
            delay={0.5}
          >
            <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden group">
              {/* Neon Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-emerald-500/20 blur-3xl rounded-full" />

              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                 <Settings className="w-16 h-16 text-emerald-400 animate-spin-slow group-hover:animate-spin" style={{ animationDuration: '10s' }} strokeWidth={1.5} />
                 <div className="flex gap-1">
                   <Zap className="w-5 h-5 text-white fill-white" />
                   <span className="text-white font-bold tracking-widest text-sm">AUTO</span>
                 </div>
              </div>
              
              {/* Grid Lines */}
              <div className="absolute inset-0 opacity-20" 
                style={{ 
                  backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} 
              />
            </div>
          </IconCard>
        </div>

        <div className="mt-20 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Context Preview</h2>
          <div className="flex flex-wrap justify-center gap-8">
            <PhonePreview label="Concept 1">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Car className="w-8 h-8 text-white" />
              </div>
            </PhonePreview>
            <PhonePreview label="Concept 2">
              <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center">
                 <Package className="w-8 h-8 text-white" />
              </div>
            </PhonePreview>
            <PhonePreview label="Concept 3">
               <div className="w-full h-full bg-slate-900 flex items-center justify-center border border-slate-700">
                  <Settings className="w-8 h-8 text-emerald-400" />
               </div>
            </PhonePreview>
          </div>
        </div>
      </div>
    </div>
  );
};

const IconCard = ({ children, title, description, delay }: { children: React.ReactNode, title: string, description: string, delay: number }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center"
    >
      <div className="group relative w-48 h-48 md:w-56 md:h-56 rounded-[2.5rem] shadow-2xl overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
        {children}
        {/* Gloss Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/30 pointer-events-none" />
      </div>
      <div className="mt-6 text-center px-2">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

const PhonePreview = ({ children, label }: { children: React.ReactNode, label: string }) => {
  return (
    <div className="flex flex-col items-center gap-3">
       <div className="relative w-[160px] h-[320px] bg-slate-100 rounded-[2rem] border-4 border-slate-800 shadow-xl overflow-hidden">
         {/* Notch */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-xl z-20" />
         
         {/* Screen Content */}
         <div className="absolute inset-0 bg-slate-200">
             {/* Wallpaper */}
             <div className="absolute inset-0 opacity-50 bg-gradient-to-b from-slate-300 to-slate-400" />
             
             {/* Icons Grid */}
             <div className="grid grid-cols-3 gap-2 p-4 pt-10">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="w-10 h-10 bg-slate-300 rounded-lg" />
               ))}
               {/* The App Icon */}
               <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg relative z-10">
                 {children}
               </div>
               <div className="col-span-3 text-center mt-1">
                 <span className="text-[8px] font-medium text-slate-600 block">AutoSpare</span>
               </div>
             </div>
         </div>
       </div>
       <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
};
