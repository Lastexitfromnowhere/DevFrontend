// src/components/ui/ProgressBar.tsx
import { cn } from '@/lib/utils';
interface ProgressBarProps {
    progress: number;
    label?: string;
    showPercentage?: boolean;
    variant?: 'default' | 'success' | 'warning';
    className?: string;
  }
  
  export function ProgressBar({
    progress,
    label,
    showPercentage = true,
    variant = 'default',
    className
  }: ProgressBarProps) {
    const variants = {
      default: 'bg-green-600',
      success: 'bg-green-500',
      warning: 'bg-yellow-500'
    };
  
    return (
      <div className={cn('space-y-1', className)}>
        {(label || showPercentage) && (
          <div className="flex justify-between">
            {label && <span className="text-sm text-green-400">{label}</span>}
            {showPercentage && (
              <span className="text-sm text-green-400">{Math.round(progress)}%</span>
            )}
          </div>
        )}
        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full transition-all duration-500',
              variants[variant]
            )}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </div>
    );
  }
  