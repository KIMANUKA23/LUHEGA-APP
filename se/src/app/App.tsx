import React, { useState, useRef } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MainContent } from './components/MainContent';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import '../styles/theme.css';

export default function App() {
  const [loading, setLoading] = useState(true);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (captureRef.current) {
      try {
        const canvas = await html2canvas(captureRef.current, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: '#eff6ff', // Match bg-blue-50
          logging: false,
          width: 1242 / 3, // Simulate the mobile width scaling
          height: 2436 / 3, // Simulate the mobile height scaling
          windowWidth: 1242 / 3,
          windowHeight: 2436 / 3,
        });
        
        const link = document.createElement('a');
        link.download = 'splash.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Failed to capture image', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Mobile Frame Container */}
      <div className="relative group">
        <div 
          ref={captureRef}
          className="relative w-[375px] h-[812px] bg-blue-50 overflow-hidden shadow-2xl rounded-[3rem] border-[8px] border-slate-800"
          style={{
            // Approximate ratio for 1242x2436
            aspectRatio: '1242/2436',
          }}
        >
          {loading ? (
            <SplashScreen onFinish={() => setLoading(false)} />
          ) : (
            <MainContent />
          )}
        </div>

        {/* Download Controls - Outside the capture area */}
        {!loading && (
          <div className="absolute -right-20 top-0 flex flex-col gap-4">
             <button 
              onClick={handleDownload}
              className="bg-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform text-slate-900 group-hover:opacity-100 opacity-100 duration-200"
              title="Download Splash Screen"
            >
              <Download size={24} />
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 text-slate-400 text-sm">
        Preview Mode • Click the download icon to save frame
      </div>
    </div>
  );
}
