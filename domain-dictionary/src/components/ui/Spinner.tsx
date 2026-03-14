interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <span
      className={`inline-block ${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
      aria-hidden="true"
    />
  );
}
