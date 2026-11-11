/** پیوند دانلود فایل (نه ناوبری صفحه؛ پس Link و پیش‌بارگذاری نمی‌خواهد) */
export function DownloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      download
      className="rounded-ctl border-line inline-grid min-h-10 place-items-center border-[1.5px] px-4 text-sm font-medium"
    >
      {children}
    </a>
  );
}
