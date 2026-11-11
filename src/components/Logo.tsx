import { useState } from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'nav' | 'lg' | 'xl' | '2xl';
  withText?: boolean;
  to?: string;
}

export function Logo({ size = 'md', withText = true, to = '/' }: LogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const sizes = {
    sm: { image: 36, text: 'text-base', subtext: 'text-[9px]' },
    md: { image: 46, text: 'text-lg', subtext: 'text-[10px]' },
    nav: { image: 52, text: 'text-xl', subtext: 'text-[10px]' },
    lg: { image: 64, text: 'text-2xl', subtext: 'text-xs' },
    xl: { image: 80, text: 'text-3xl', subtext: 'text-sm' },
    '2xl': { image: 110, text: 'text-4xl', subtext: 'text-base' },
  };
  const s = sizes[size];

  const content = (
    <div className="flex items-center gap-3 select-none">
      {!imageFailed && (
        <img
          src="/images/logo.png"
          alt="Smash Zone by Jerjen"
          width={s.image}
          height={s.image}
          className="object-contain shrink-0"
          onError={() => setImageFailed(true)}
        />
      )}
      {withText && (
        <div className="flex flex-col leading-none">
          <span className={`font-display ${s.text} font-black italic uppercase tracking-wider`}>
            <span className="text-[#3D1164]">Smash</span>{' '}
            <span className="text-[#FF7A00]">Zone</span>
          </span>
          <span className={`${s.subtext} font-semibold uppercase tracking-widest text-slate-500 mt-0.5`}>
            by Jerjen &bull; Hub
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label="Smash Zone by Jerjen home"
        className="inline-block transition-opacity hover:opacity-90"
      >
        {content}
      </Link>
    );
  }
  return content;
}