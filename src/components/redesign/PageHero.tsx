import type { ReactNode } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { RedesignImage } from '@/lib/redesignImages';

/**
 * Hero used by Home, Discover and Community: text on the left over a soft
 * gradient, a photo fading in from the right, an optional handwritten tagline
 * and an optional location chip over the photo. `tone="photo"` darkens the photo
 * edge-to-edge so white text sits on it (Home).
 */
export function PageHero({
  id,
  eyebrow,
  title,
  subtitle,
  image,
  tagline,
  chip,
  tone = 'light',
  children,
  priority = false,
}: {
  id: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: string;
  image: RedesignImage;
  tagline?: string;
  chip?: string;
  tone?: 'light' | 'photo';
  children?: ReactNode;
  priority?: boolean;
}) {
  const photo = tone === 'photo';
  return (
    <section
      aria-labelledby={id}
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-border-subtle ${photo ? 'min-h-[188px] bg-slate-900 shadow-sm sm:min-h-[216px]' : 'bg-gradient-to-r from-surface-info via-surface-brand-subtle to-surface-default'}`}
    >
      {photo && (
        <Image
          src={image.src}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-[60%_40%]"
        />
      )}
      {photo && <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/25 to-transparent" />}
      <div className={`relative z-10 p-5 sm:max-w-[64%] sm:px-9 sm:py-8 ${photo ? 'text-white' : 'text-text-primary'}`}>
        {eyebrow && (
          <p className={`text-xs font-semibold uppercase tracking-wider ${photo ? 'text-white/90' : 'text-text-primary'}`}>{eyebrow}</p>
        )}
        <h1 id={id} className={`mt-1.5 font-bold leading-tight ${photo ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-4xl'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-3 max-w-lg text-sm leading-relaxed sm:text-base ${photo ? 'text-white/90' : 'text-muted-foreground'}`}>{subtitle}</p>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
      {!photo && (
        <div aria-hidden className="relative h-32 sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[45%]">
          <Image
            src={image.src}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 36vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover object-center [mask-image:linear-gradient(to_bottom,transparent,black_35%)] sm:[mask-image:linear-gradient(to_right,transparent,black_40%)]"
          />
          {tagline && (
            <p className="absolute left-[12%] top-6 hidden -rotate-6 font-serif text-lg italic leading-snug text-text-brand drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] sm:block lg:text-xl">
              {tagline}
            </p>
          )}
        </div>
      )}
      {chip && (
        <span className="absolute bottom-3 right-4 z-10 hidden items-center gap-1 text-sm font-medium text-white drop-shadow sm:inline-flex">
          <MapPin className="size-4" aria-hidden />
          {chip}
        </span>
      )}
    </section>
  );
}
