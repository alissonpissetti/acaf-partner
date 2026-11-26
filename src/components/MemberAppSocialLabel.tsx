import { useLayoutEffect, useRef, useState } from 'react';

type Props = {
  label: string;
  width: number;
  fontSize: number;
  className?: string;
};

/** Espelha o FittedBox do app: o nome cabe na largura do ícone. */
export function MemberAppSocialLabel({ label, width, fontSize, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const natural = el.scrollWidth;
    setScale(natural > width ? Math.min(1, width / natural) : 1);
  }, [label, width, fontSize]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        fontSize,
        width,
        transform: scale < 1 ? `scale(${scale})` : undefined,
      }}
    >
      {label}
    </span>
  );
}