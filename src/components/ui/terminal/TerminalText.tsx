interface TerminalTextProps {
    children: React.ReactNode;
    type?: 'command' | 'output' | 'error';
    className?: string;
  }
  export function TerminalText({ children, type = 'output', className = "" }: TerminalTextProps) {
    const typeStyles = {
      command: "text-green-400 before:content-['$_']",
      output: "text-green-300",
      error: "text-red-400 before:content-['!_']"
    };
    return (
      <div className={`font-mono text-sm ${typeStyles[type]} ${className}`}>
        {children}
      </div>
    );
  }