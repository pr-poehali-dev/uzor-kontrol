interface BadgeProps {
  variant: 'success' | 'error' | 'warning' | 'neutral' | 'info';
  children: React.ReactNode;
}

const variants = {
  success: 'bg-green-500/15 text-green-400 border-green-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  neutral: 'bg-white/10 text-muted-foreground border-white/15',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
