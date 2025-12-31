import React from 'react';
import { Car, Wrench } from 'lucide-react';
import { motion } from 'motion/react';

export const MainContent: React.FC = () => {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-blue-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="text-center w-full max-w-md flex flex-col items-center"
      >
        <div className="relative w-40 h-40 mb-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center text-blue-600"
          >
            <Car size={140} strokeWidth={1.2} />
          </motion.div>
          
          <motion.div
            initial={{ rotate: -45, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            className="absolute -right-2 -top-2 bg-white rounded-full p-3 shadow-lg border border-slate-100"
          >
            <Wrench size={40} className="text-orange-500" />
          </motion.div>
        </div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-3xl font-bold text-slate-900 mb-2"
        >
          Spare Auto Sale
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-slate-500 font-medium tracking-wide uppercase text-sm"
        >
          Luhega App
        </motion.p>
      </motion.div>
    </div>
  );
};
