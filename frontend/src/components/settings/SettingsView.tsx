import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { SettingsCard } from './SettingsCard';
import { 
  Palette, PlayCircle, Info, 
  Monitor, Keyboard, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'playback' | 'keyboard' | 'about'>('appearance');
  
  const accentColor = useUIStore((s) => s.accentColor);
  const setAccentColor = useUIStore((s) => s.setAccentColor);

  const colors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Orange', value: '#f97316' },
  ];

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'playback', label: 'Playback', icon: PlayCircle },
    { id: 'keyboard', label: 'Shortcuts', icon: Keyboard },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-surface-0">
      {/* Settings Navigation */}
      <div className="w-64 border-r border-white/5 p-6 flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white mb-6 px-2">Settings</h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              activeTab === tab.id 
                ? "bg-accent/10 text-accent font-bold" 
                : "text-white/40 hover:bg-white/5 hover:text-white/60"
            )}
          >
            <tab.icon size={20} />
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-12 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SettingsCard 
                  title="Theme Accent" 
                  description="Choose a color for buttons, progress bars, and highlights."
                >
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setAccentColor(color.value)}
                        className={cn(
                          "group h-12 rounded-xl border border-white/5 flex items-center justify-center transition-all active:scale-95",
                          accentColor === color.value ? "ring-2 ring-white/20" : "hover:bg-white/5"
                        )}
                        style={{ backgroundColor: `${color.value}20` }}
                      >
                        <div 
                          className="size-4 rounded-full shadow-lg transition-transform group-hover:scale-125"
                          style={{ backgroundColor: color.value }}
                        >
                          {accentColor === color.value && <Check className="text-white mx-auto mt-0.5" size={10} strokeWidth={4} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </SettingsCard>

                <SettingsCard 
                  title="Interface Scale" 
                  description="Adjust the size of text and UI elements."
                >
                   <div className="flex items-center gap-4">
                     <span className="text-xs text-white/40 font-bold uppercase">Compact</span>
                     <input type="range" className="flex-1 accent-accent" min="0" max="100" defaultValue="50" />
                     <span className="text-xs text-white/40 font-bold uppercase">Comfortable</span>
                   </div>
                </SettingsCard>
              </motion.div>
            )}

            {activeTab === 'playback' && (
              <motion.div
                key="playback"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <SettingsCard title="Default Playback" description="Global playback preferences for MPV.">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                         <span className="text-sm font-medium text-white/80">Hardware Decoding</span>
                         <input type="checkbox" defaultChecked className="accent-accent size-5" />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                         <span className="text-sm font-medium text-white/80">Auto-Fullscreen on Play</span>
                         <input type="checkbox" className="accent-accent size-5" />
                      </div>
                   </div>
                </SettingsCard>
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div
                key="about"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 rounded-3xl bg-accent flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-accent/20">
                  <Monitor className="text-white" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Media Maestro</h2>
                <p className="text-white/40 text-sm mb-8">Version 0.1.0 Stable</p>
                <div className="max-w-md mx-auto p-6 rounded-2xl bg-white/5 border border-white/5 italic text-white/30 text-sm">
                  "A premium, distraction-free media experience inspired by the best of open-source design."
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
