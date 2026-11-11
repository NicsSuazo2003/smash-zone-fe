import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {label}
            {props.required && <span className="ml-1 text-[#FF7A00]">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all focus:border-[#3D1164] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D1164]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              leftIcon ? 'pl-10' : ''
            } ${
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/25'
                : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
          >
            {label}
            {props.required && <span className="ml-1 text-[#FF7A00]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border border-slate-300 bg-white p-4 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-sm transition-all resize-none focus:border-[#3D1164] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3D1164]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/25'
              : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';