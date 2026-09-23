// Minimal geometric glyphs, one per PartType "group", drawn with currentColor
// so they pick up whatever color the caller sets. Deliberately schematic
// (think circuit-diagram, not clip-art) to match the rest of the UI, and
// cheap to extend: an unknown group just falls back to a plain node dot.

import type { ReactElement } from "react";

interface IconProps {
  className?: string;
}

const shared = { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none" as const };

function Compartment({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="2" y="3" width="12" height="10" rx="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Organelle({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path
        d="M8 1.5 14 5v6l-6 3.5L2 11V5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Environment({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 2H3a1 1 0 0 0-1 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 2h2a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5 14H3a1 1 0 0 1-1-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 14h2a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

function MembraneTransport({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M2 5.5h12M2 10.5h12" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 1.5" />
      <path d="M6 3l3 5-3 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Connection({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="3.2" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12.8" cy="8" r="1.5" fill="currentColor" />
      <path d="M4.7 8h6.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Friendly({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M8 1.5 14 8l-6 6.5L2 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Ally({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 8.2 7.2 10l3.3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Enemy({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M8 2 14.2 13H1.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.4v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.7" fill="currentColor" />
    </svg>
  );
}

function Route({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M2 12 7 4l3 4 4-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 2h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Generic({ className }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const BY_GROUP: Record<string, (props: IconProps) => ReactElement> = {
  compartment: Compartment,
  organelle: Organelle,
  environment: Environment,
  "membrane transport": MembraneTransport,
  connection: Connection,
  friendly: Friendly,
  ally: Ally,
  enemy: Enemy,
  route: Route,
};

export function PartIcon({ group, className }: { group?: string; className?: string }) {
  const Cmp = (group && BY_GROUP[group]) || Generic;
  return <Cmp className={className} />;
}
