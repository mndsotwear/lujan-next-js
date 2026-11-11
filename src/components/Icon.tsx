/**
 * آیکون‌های خطی پروژه (از طرح M0.4). تصویر واقعی محصول جای آیکون دسته را می‌گیرد وقتی ProductImage داشته باشد.
 * همه تزئینی‌اند (aria-hidden) مگر اینکه label داده شود.
 */
import type { SVGProps } from "react";

const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinejoin: "round",
} as const;
const U = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

const paths: Record<string, { vb: number; el: React.ReactNode }> = {
  coffee: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M20 6h24v9H20z" />
        <path d="M18 15h28v39a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" />
        <path d="M24 28h16v14H24z" />
        <path d="M28 35c2-3 6-3 8 0-2 3-6 3-8 0z" />
      </g>
    ),
  },
  syrup: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M27 4h10v8H27z" />
        <path d="M25 12h14l4 10v32a6 6 0 0 1-6 6H27a6 6 0 0 1-6-6V22z" />
        <path d="M25 34h14v13H25z" />
        <path d="M32 38c-2 2 0 5 0 5s2-3 0-5z" />
      </g>
    ),
  },
  snack: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M17 6h30v8l-4 3v30l4 3v6H17v-6l4-3V17l-4-3z" />
        <circle cx="32" cy="32" r="7" />
        <path d="M17 56h30" />
      </g>
    ),
  },
  noodle: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M10 32h44a22 20 0 0 1-44 0z" />
        <path d="M22 54h20" />
        <path d="M18 32c4-7 8 0 12-7s8 0 12-7" />
        <path d="M40 5 30 26M48 8 36 26" />
      </g>
    ),
  },
  olive: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M28 4h8v10h-8z" />
        <path d="M28 14c-6 5-8 10-8 18v22a6 6 0 0 0 6 6h12a6 6 0 0 0 6-6V32c0-8-2-13-8-18" />
        <ellipse cx="32" cy="42" rx="6" ry="8" />
        <path d="M32 34c0-3 3-5 5-5" />
      </g>
    ),
  },
  tea: {
    vb: 64,
    el: (
      <g {...P}>
        <path d="M12 26h34v12a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z" />
        <path d="M46 30h4a6 6 0 0 1 0 12h-6" />
        <path d="M24 8c-3 4 3 6 0 10M34 8c-3 4 3 6 0 10" />
        <path d="M12 58h34" />
      </g>
    ),
  },
  search: {
    vb: 24,
    el: (
      <g {...U}>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </g>
    ),
  },
  cart: {
    vb: 24,
    el: (
      <g {...U}>
        <path d="M3 4h2l2 11h11l2-8H6.5" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </g>
    ),
  },
  user: {
    vb: 24,
    el: (
      <g {...U}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
      </g>
    ),
  },
  heart: {
    vb: 24,
    el: <path {...U} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  },
  home: { vb: 24, el: <path {...U} d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" /> },
  grid: { vb: 24, el: <path {...U} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
  truck: {
    vb: 24,
    el: (
      <g {...U} strokeWidth={1.6}>
        <path d="M2 6h12v10H2zM14 10h4l3 3v3h-7z" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </g>
    ),
  },
  shield: {
    vb: 24,
    el: (
      <g {...U} strokeWidth={1.6}>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </g>
    ),
  },
  return: {
    vb: 24,
    el: (
      <g {...U} strokeWidth={1.6}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
      </g>
    ),
  },
  store: {
    vb: 24,
    el: (
      <g {...U} strokeWidth={1.6}>
        <path d="M3 9 5 4h14l2 5M4 9v11h16V9" />
        <path d="M3 9h18M10 20v-6h4v6" />
      </g>
    ),
  },
  filter: { vb: 24, el: <path {...U} d="M4 6h16M7 12h10M10 18h4" /> },
  close: { vb: 24, el: <path {...U} d="M6 6l12 12M18 6 6 18" /> },
  check: {
    vb: 24,
    el: <path fill="none" stroke="currentColor" strokeWidth={2} d="m5 12 5 5 9-10" />,
  },
  star: {
    vb: 24,
    el: (
      <path
        fill="currentColor"
        d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"
      />
    ),
  },
  menu: { vb: 24, el: <path {...U} d="M4 7h16M4 12h16M4 17h16" /> },
  chevron: { vb: 24, el: <path {...U} d="m15 5-7 7 7 7" /> },
  chevronDown: { vb: 24, el: <path {...U} d="m5 9 7 7 7-7" /> },
  sun: {
    vb: 24,
    el: (
      <g {...U}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </g>
    ),
  },
  moon: {
    vb: 24,
    el: <path {...U} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  },
  info: {
    vb: 24,
    el: (
      <g {...U}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5v.5" />
      </g>
    ),
  },
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  label,
  ...rest
}: { name: string; label?: string } & SVGProps<SVGSVGElement>) {
  const icon = paths[name] ?? paths.coffee!;
  return (
    <svg
      viewBox={`0 0 ${icon.vb} ${icon.vb}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      {...rest}
    >
      {icon.el}
    </svg>
  );
}
