import React from 'react';
import { motion } from 'framer-motion';
import { Play, MoreVertical, Clock, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  cover?: string;
  duration?: string;
  size?: string;
  mediaType?: string;
  progress?: number;
  onClick?: () => void;
  className?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  title, subtitle, cover, duration, size, mediaType, progress, onClick, className
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative flex flex-col bg-surface-1/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Aspect Ratio Box (Poster-style 2:3 or 16:9? Let's use 16:10 for general feel) */}
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
             <Play className="w-12 h-12 text-white/10 group-hover:text-accent/50 transition-colors" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                <Play className="text-white fill-current ml-1" size={24} />
            </div>
        </div>

        {/* Badge: Duration */}
        {duration && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white/90 border border-white/10">
                {duration}
            </div>
        )}

        {/* Badge: Media Type */}
        {mediaType && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white/90 border border-white/10 uppercase">
                {mediaType}
            </div>
        )}

        {/* Progress Bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-accent" 
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} 
            />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-accent transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-medium text-white/40 uppercase tracking-wider">
           {subtitle && <span className="truncate">{subtitle}</span>}
           {size && (
             <div className="flex items-center gap-1">
               <HardDrive size={10} />
               {size}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
};
