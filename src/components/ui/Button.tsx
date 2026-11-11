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
  // Primary: Vibrant Smash Zone Orange CTA with athletic contrast
  primary:
    'bg-[#FF7A00] text-white hover:bg-[#E56600] active:bg-[#CC5A00] shadow-sm hover:shadow-md font-black uppercase tracking-wider',

  // Secondary: Clean white card with slate border, dark text, and purple hover
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:border-[#3D1164]/40 hover:bg-slate-50 hover:text-[#3D1164] active:bg-slate-100 font-bold shadow-sm',

  // Accent: Deep Athletic Purple CTA
  accent:
    'bg-[#3D1164] text-white hover:bg-[#5A1B91] active:bg-[#260B3E] font-black uppercase tracking-wider shadow-sm hover:shadow-md',

  // Ghost: Clean muted slate for subtle inline actions
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 font-bold',

  // Danger: Soft red tint for cancellations and destructive triggers
  danger:
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white active:bg-rose-700 font-bold',

  // Success: Mint green tint for confirmations
  success:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white active:bg-emerald-700 font-bold',
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5 font-black',
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
    const classes = `inline-flex items-center justify-center select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

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