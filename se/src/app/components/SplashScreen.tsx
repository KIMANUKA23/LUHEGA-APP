import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LuhegaLogo } from './LuhegaLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'loading' | 'bursting' | 'finished'>('loading');

  useEffect(() => {
    // Simulate loading process
    const timer = setTimeout(() => {
      setStage('bursting');
    }, 2000); // Pulse for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // When bursting starts, wait for animation to finish then call onFinish
  useEffect(() => {
    if (stage === 'bursting') {
      const timer = setTimeout(() => {
        setStage('finished');
        onFinish();
      }, 500); // Duration of burst animation
      return () => clearTimeout(timer);
    }
  }, [stage, onFinish]);

  if (stage === 'finished') return null;

  return (
    <div className="absolute inset-0 bg-blue-50 flex flex-col items-center justify-center z-50 overflow-hidden">
      <motion.div
        className="relative flex flex-col items-center justify-center"
        initial={{ scale: 1, opacity: 1 }}
        animate={
          stage === 'loading' 
            ? { scale: [1, 1.1, 1] } 
            : { scale: 30, opacity: 0 }
        }
        transition={
          stage === 'loading'
            ? { 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }
            : { 
                duration: 0.8, 
                ease: "easeIn" 
              }
        }
      >
        <LuhegaLogo size={100} />
      </motion.div>

      {/* Text elements - fade out when bursting */}
      <motion.div
        className="absolute bottom-20 flex flex-col items-center"
        animate={{ opacity: stage === 'bursting' ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          Luhega App
        </h1>
        <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">
          Smart Business Solutions
        </p>
      </motion.div>
    </div>
  );
};
