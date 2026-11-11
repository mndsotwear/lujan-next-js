/** نشانی، تلفن، ساعات و مسیریابی فروشگاه حضوری (FR-INV-06، D-061) */
import { STORE } from "@/config/store";
import { fa } from "@/content/fa";
import { isOpenAt, mapLinks, tehranNow } from "@/modules/content/store-hours";

export function StoreInfo() {
  const info = STORE.storeInfo;
  const t = fa.storeInfo;
  if (!info.address && !info.phone && !info.geo && info.hours.length === 0) return null;
  const open = info.hours.length ? isOpenAt(info.hours, tehranNow()) : null;
  const links = info.geo ? mapLinks(info.geo) : null;
  return (
    <section
      aria-labelledby="store-info"
      className="rounded-card border-line bg-surface mb-8 grid gap-5 border p-5 md:grid-cols-2"
    >
      <div className="space-y-3">
        <h2 id="store-info" className="text-lg font-bold">
          {t.title(STORE.storeLocation.city)}
        </h2>
        {info.address && <p className="leading-8">{info.address}</p>}
        {info.phone && (
          <p>
            <a href={`tel:${info.phone}`} dir="ltr" className="text-copper font-bold">
              {info.phone.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
            </a>
          </p>
        )}
        {links && (
          <div className="flex flex-wrap gap-2 text-sm">
            {(["neshan", "balad", "google"] as const).map((k) => (
              <a
                key={k}
                href={links[k]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-ctl border-line hover:border-ink border-[1.5px] px-3 py-2"
              >
                {t.route[k]}
              </a>
            ))}
          </div>
        )}
      </div>
      {info.hours.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-bold">{t.hours}</h3>
            <span className={`text-xs font-bold ${open ? "text-ok" : "text-steel"}`}>
              {open ? t.openNow : t.closedNow}
            </span>
          </div>
          <ul className="space-y-1 text-sm">
            {info.hours.map((r, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{r.days.map((d) => t.days[d]).join("، ")}</span>
                <span dir="ltr">
                  {`${r.open} – ${r.close}`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
