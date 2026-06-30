import type { LucideIcon } from 'lucide-react';

type Color = 'indigo' | 'green' | 'blue' | 'orange' | 'red' | 'purple';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: Color;
  onClick?: () => void;
}

const gradients: Record<Color, string> = {
  indigo: 'bg-linear-to-br from-indigo-600 to-indigo-400',
  green:  'bg-linear-to-br from-emerald-500 to-teal-400',
  blue:   'bg-linear-to-br from-blue-600 to-sky-400',
  orange: 'bg-linear-to-br from-orange-500 to-amber-400',
  red:    'bg-linear-to-br from-red-500 to-rose-400',
  purple: 'bg-linear-to-br from-violet-600 to-purple-400',
};

export default function StatCard({ label, value, sub, icon: Icon, color = 'indigo', onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-2xl p-5 shadow-md',
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-xl',
        onClick ? 'cursor-pointer active:scale-95 select-none' : 'cursor-default',
        gradients[color],
      ].join(' ')}
    >

      {/* Top highlight line */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/30" />

      {/* Large decorative background icon */}
      <Icon size={100} className="absolute -right-5 -bottom-3 text-white/12 pointer-events-none" />

      {/* Icon badge */}
      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-4 shadow-sm">
        <Icon size={21} className="text-white" />
      </div>

      {/* Value */}
      <p className="text-[2.1rem] font-extrabold text-white leading-none tracking-tight">{value}</p>

      {/* Label */}
      <p className="text-white/85 text-sm font-semibold mt-2 leading-tight">{label}</p>

      {/* Sub */}
      {sub && <p className="text-white/55 text-xs mt-1">{sub}</p>}
    </div>
  );
}
