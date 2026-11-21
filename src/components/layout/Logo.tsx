import { useId } from "react";

export function LogoMark({ size = 32 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3DDC97" />
          <stop offset="1" stopColor="#2EC4B6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M8.5 23.5C8.5 15 14.2 9.6 23.5 9c-.3 8.9-5.8 14.5-15 14.5z" fill="#0E1512" />
      <path d="M9.5 22.5 17.5 14.5" stroke="#3DDC97" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight">
        Taza<span className="text-primary"> AI</span>
      </span>
    </span>
  );
}
