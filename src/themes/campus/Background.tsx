import type { BackgroundProps } from '../types';

/** 校園文具：方格筆記紙、紅色裝訂線、強調色的水彩暈染與手繪塗鴉 */
export default function CampusBackground({ accent = '#3563e9', reducedMotion }: BackgroundProps) {
  return (
    <div className="campus-paper absolute inset-0 overflow-hidden" style={{ ['--accent' as string]: accent }}>
      <div className={`campus-blob absolute -right-[10%] -top-[15%] h-[60vmax] w-[60vmax] ${reducedMotion ? '' : 'animate-blob'}`} />
      <div className={`campus-blob campus-blob-2 absolute -bottom-[25%] -left-[15%] h-[50vmax] w-[50vmax] ${reducedMotion ? '' : 'animate-blob-rev'}`} />
      <div className="absolute bottom-0 left-[clamp(0.9rem,2.6vw,2.6rem)] top-24 hidden w-px bg-[#e5484d]/35 sm:block" />
      <div className="absolute bottom-0 left-[calc(clamp(0.9rem,2.6vw,2.6rem)+4px)] top-24 hidden w-px bg-[#e5484d]/25 sm:block" />
      <svg className="campus-doodle absolute right-[6%] top-[9%] hidden h-24 w-24 md:block" viewBox="0 0 100 100" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 8 L61 38 L93 39 L67 58 L77 90 L50 71 L23 90 L33 58 L7 39 L39 38 Z" strokeWidth="3" />
      </svg>
      <svg className="campus-doodle absolute bottom-[10%] right-[38%] hidden h-16 w-40 md:block" viewBox="0 0 160 60" fill="none" strokeLinecap="round">
        <path d="M5 40 C 30 5, 60 55, 90 25 S 140 10, 150 30" strokeWidth="3" />
        <path d="M140 20 L152 31 L137 36" strokeWidth="3" />
      </svg>
      <div className="grain absolute inset-0 opacity-40 mix-blend-multiply" />
    </div>
  );
}
