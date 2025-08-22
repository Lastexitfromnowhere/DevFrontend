import React from 'react';
import { cn } from '@/lib/utils';
interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}
export function Switch({ checked, onCheckedChange, disabled, className, ...props }: SwitchProps) {
  return (
    <label className={cn(
      "relative inline-flex items-center cursor-pointer",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        {...props}
      />
      <div className={cn(
        "w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer",
        checked ? "bg-indigo-600" : "bg-gray-700",
        "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
      )} />
    </label>
  );
} 