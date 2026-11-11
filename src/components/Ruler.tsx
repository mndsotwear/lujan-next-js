/** خط تزئینی لوجان: یک خط‌چین نرم با نقطه‌ی آبی در وسط (جایگزین خط‌کش شانه‌ی نسخه‌ی قبلی) */
export function Ruler({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 ${className}`}>
      <span className="border-line flex-1 border-t border-dashed" />
      <span className="bg-copper size-2 rounded-full" />
      <span className="border-line flex-1 border-t border-dashed" />
    </div>
  );
}
