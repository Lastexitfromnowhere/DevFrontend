"use client";
import React from 'react';
import { Loader2 } from 'lucide-react';
interface DashboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}
export const DashboardButton: React.FC<DashboardButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500";
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    secondary: "bg-gray-700/70 hover:bg-gray-600/70 text-gray-100 backdrop-blur-sm border border-gray-600/30",
    danger: "bg-red-600/80 hover:bg-red-700/80 text-white backdrop-blur-sm",
    success: "bg-green-600/80 hover:bg-green-700/80 text-white backdrop-blur-sm",
    ghost: "bg-transparent hover:bg-gray-700/30 text-gray-300 hover:text-white"
  };
  const sizeStyles = {
    sm: "text-xs py-1 px-2 space-x-1",
    md: "text-sm py-2 px-3 space-x-2",
    lg: "text-base py-2.5 px-4 space-x-2"
  };
  const widthStyle = fullWidth ? "w-full" : "";
  const disabledStyle = disabled || loading ? "opacity-60 cursor-not-allowed" : "";
  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${widthStyle}
        ${disabledStyle}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
};
export default DashboardButton;
