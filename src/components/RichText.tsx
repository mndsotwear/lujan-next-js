/** نمایش توضیحات با قالب پایه (D-044) — بدون HTML خام؛ React همه‌ی متن را escape می‌کند */
import { Fragment } from "react";
import { parseRichText, type Inline } from "@/modules/catalog";

const inline = (parts: Inline[]) =>
  parts.map((p, i) =>
    p.bold ? <strong key={i}>{p.text}</strong> : <Fragment key={i}>{p.text}</Fragment>,
  );

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 leading-8 ${className}`}>
      {parseRichText(text).map((b, i) =>
        b.type === "h" ? (
          <h3 key={i} className="pt-2 font-bold">
            {inline(b.text)}
          </h3>
        ) : b.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 ps-6">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        ),
      )}
    </div>
  );
}
