import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title, description, children, className
}) => {
  return (
    <div className={cn(
      "p-6 rounded-2xl bg-surface-1/50 border border-white/5 backdrop-blur-sm space-y-4",
      className
    )}>
      <div>
        <h3 className="text-lg font-bold text-white/90">{title}</h3>
        {description && <p className="text-sm text-white/40 mt-1">{description}</p>}
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
};
