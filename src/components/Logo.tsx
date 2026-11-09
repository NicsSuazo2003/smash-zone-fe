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
    sm: { image: 36, text: 'text-lg' },
    md: { image: 46, text: 'text-xl' },
    nav: { image: 56, text: 'text-xl' },
    lg: { image: 64, text: 'text-3xl' },
    xl: { image: 78, text: 'text-4xl' },
    '2xl': { image: 110, text: 'text-5xl' },
  };
  const s = sizes[size];

  const content = (
    <div className="flex items-center gap-2.5 select-none">
      {!imageFailed && (
        <img
          src="/images/SP.png"
          alt="Smash Point"
          width={s.image}
          height={s.image}
          className="object-contain"
          onError={() => setImageFailed(true)}
        />
      )}
      {withText && (
        <span className={`font-display ${s.text} font-black italic uppercase tracking-wider`}>
          <span className="text-white">Smash</span>{' '}
          <span className="text-primary-500">Point</span>
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} aria-label="Smash Point home" className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}