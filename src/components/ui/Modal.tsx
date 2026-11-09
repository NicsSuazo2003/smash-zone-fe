// src/components/ui/Modal.tsx
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /**
   * Optional footer content rendered inside a sticky bottom bar.
   * Use this for form actions (Save / Cancel). On mobile the footer
   * stays pinned to the bottom of the modal, on desktop it behaves
   * like a normal footer.
   */
  footer?: ReactNode;
  /**
   * When true, the modal takes up the full viewport on mobile
   * (no rounded corners, no floating card). Better for long forms.
   * Defaults to true.
   */
  fullScreenOnMobile?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  footer,
  fullScreenOnMobile = true,
}: ModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const sizes: Record<string, string> = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={`
            fixed inset-0 z-[100] flex
            ${fullScreenOnMobile ? 'items-stretch sm:items-center' : 'items-center'}
            justify-center
            p-0 sm:p-4
          `}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-charcoal/85 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`
              relative flex w-full flex-col bg-neutral-900/95
              ${sizes[size]}
              ${fullScreenOnMobile
                ? 'h-full max-h-none rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl'
                : 'max-h-[90vh] rounded-2xl'}
              border border-neutral-700 shadow-2xl backdrop-blur-sm
              ${className || ''}
            `}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-neutral-700 px-4 py-3.5 sm:px-6 sm:py-4">
                <h3 className="pr-2 font-display text-base font-bold text-cream sm:text-lg">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-xl border border-transparent p-1.5 text-cream-muted transition hover:border-neutral-600 hover:bg-neutral-800/80 hover:text-primary-300 active:scale-95"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div
                className="
                  shrink-0 border-t border-neutral-700
                  bg-neutral-950/90 backdrop-blur-sm
                  p-4 sm:p-5
                "
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}