import Link from "next/link";
import { fa } from "@/content/fa";

export function NotFoundBody() {
  return (
    <main className="mx-auto flex min-h-[50dvh] max-w-[1240px] flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{fa.notFound.title}</h1>
      <p className="text-ink-2 mt-2">{fa.notFound.body}</p>
      <Link href="/" className="text-copper mt-6 font-medium underline-offset-4 hover:underline">
        {fa.notFound.cta}
      </Link>
    </main>
  );
}
