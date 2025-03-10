// src/components/ui/terminal/TerminalButton.tsx
interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: React.ReactNode;
    loading?: boolean;
  }
  
  export function TerminalButton({ 
    children, 
    variant = 'primary', 
    icon,
    loading = false,
    className = "",
    disabled,
    ...props 
  }: TerminalButtonProps) {
    const variantStyles = {
      primary: "bg-[#5e8f3a] hover:bg-[#6fa44b] text-white",
      secondary: "bg-[#333230] hover:bg-[#444340] text-white",
      danger: "bg-[#8a4d12] hover:bg-[#9b5e23] text-white"
    };
  
    const isDisabled = disabled || loading;
  
    return (
      <button
        className={`
          flex items-center justify-center space-x-2 
          px-4 py-2 rounded font-mono text-sm
          transition-colors duration-200
          ${variantStyles[variant]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <span className="animate-spin mr-2">⠋</span>
        ) : icon ? (
          <span className="w-4 h-4">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
