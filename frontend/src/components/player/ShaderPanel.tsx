import React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import * as App from '../../../wailsjs/go/main/App';
import { cn } from '@/lib/utils';

interface ShaderPanelProps {
  onClose: () => void;
}

interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  path: string;
}

// Seanime-compatible Anime4K presets
const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No post-processing',
    path: '',
  },
  {
    id: 'anime4k-a',
    name: 'Anime4K Mode A',
    description: 'Fast upscaling for 1080p+ anime',
    path: 'Anime4K_Clamp_High.glsl;Anime4K_Restore_CNN_M.glsl;Anime4K_Upscale_CNN_x2_M.glsl;Anime4K_AutoDownscalePre_x2.glsl;Anime4K_AutoDownscalePre_x4.glsl;Anime4K_Upscale_CNN_x2_M.glsl',
  },
  {
    id: 'anime4k-b',
    name: 'Anime4K Mode B',
    description: 'Quality upscaling for 720p anime',
    path: 'Anime4K_Clamp_High.glsl;Anime4K_Restore_CNN_Soft_M.glsl;Anime4K_Upscale_CNN_x2_M.glsl;Anime4K_AutoDownscalePre_x2.glsl;Anime4K_AutoDownscalePre_x4.glsl;Anime4K_Upscale_CNN_x2_M.glsl',
  },
  {
    id: 'anime4k-c',
    name: 'Anime4K Mode C',
    description: 'Fast upscaling + denoising for low-res',
    path: 'Anime4K_Clamp_High.glsl;Anime4K_Restore_CNN_VL.glsl;Anime4K_Upscale_CNN_x2_M.glsl;Anime4K_AutoDownscalePre_x2.glsl;Anime4K_AutoDownscalePre_x4.glsl;Anime4K_Upscale_CNN_x2_M.glsl',
  },
  {
    id: 'fsrcnnx',
    name: 'FSRCNNX',
    description: 'Best quality upscaler (GPU heavy)',
    path: 'FSRCNNX_x2_16-0-4-1.glsl',
  },
];

export const ShaderPanel: React.FC<ShaderPanelProps> = ({ onClose }) => {
  const currentShader = usePlayerStore((s) => s.currentShader);
  const loadShader = usePlayerStore((s) => s.loadShader);
  const clearShaders = usePlayerStore((s) => s.clearShaders);

  const handleSelect = async (preset: ShaderPreset) => {
    if (preset.path === '') {
      await clearShaders();
    } else {
      await loadShader(preset.path);
    }
    onClose();
  };

  return (
    <div className="w-72 bg-surface-0/95 backdrop-blur-xl rounded-xl border border-surface-3 shadow-2xl animate-scale-in">
      <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Video Shaders</h3>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-xs">✕</button>
      </div>
      <div className="p-2 space-y-1">
        {SHADER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg transition",
              (currentShader === preset.path || (!currentShader && preset.id === 'none'))
                ? "bg-accent/15 text-accent"
                : "hover:bg-surface-3 text-text-secondary"
            )}
          >
            <p className="text-sm font-medium">{preset.name}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{preset.description}</p>
          </button>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-surface-3">
        <p className="text-[10px] text-text-tertiary">
          Shaders are loaded from the <span className="text-text-secondary">shaders/</span> directory. Anime4K requires OpenGL.
        </p>
      </div>
    </div>
  );
};