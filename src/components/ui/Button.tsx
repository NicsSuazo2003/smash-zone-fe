import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    to?: undefined;
  };

type LinkButtonProps = BaseProps & {
  to: string;
};

type Props = ButtonProps | LinkButtonProps;

const variants: Record<Variant, string> = {
  // Primary: Championship Red CTA with subtle outer glow
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-glow-primary font-bold border border-primary-400/40 uppercase tracking-wide',

  // Secondary: Carbon pitch tile with hairline border
  secondary:
    'border border-neutral-700 bg-neutral-900 text-cream hover:border-neutral-500 hover:bg-neutral-800 hover:text-white active:bg-neutral-700 font-medium shadow-sm',

  // Accent: Optic Gold for high-urgency reservations & live bookings
  accent:
    'bg-accent-500 text-neutral-950 hover:bg-accent-400 active:bg-accent-600 shadow-glow-accent font-bold border border-accent-300/40 uppercase tracking-wide',

  // Ghost: Quiet slate button for inline controls
  ghost:
    'text-cream-muted hover:text-white hover:bg-neutral-800/60 active:bg-neutral-700/60 font-medium',

  // Danger: Red wash for cancellations & destructive triggers
  danger:
    'bg-primary-500/15 text-primary-300 border border-primary-500/30 hover:bg-primary-500 hover:text-white active:bg-primary-600 font-semibold',

  // Success: Emerald green for confirmations
  success:
    'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white active:bg-emerald-600 font-semibold',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5 font-bold',
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading,
      leftIcon,
      rightIcon,
      fullWidth,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const classes = `inline-flex items-center justify-center select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

    if ('to' in rest && rest.to) {
      return (
        <Link to={rest.to} className={classes}>
          {leftIcon}
          <span>{children}</span>
          {rightIcon}
        </Link>
      );
    }

    const buttonProps = rest as ButtonProps;
    return (
      <button
        ref={ref}
        className={classes}
        disabled={isLoading ?? buttonProps.disabled}
        {...buttonProps}
      >
        {isLoading ? <Spinner /> : leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';