"use client";
import { useActionState } from "react";
import { fa } from "@/content/fa";
import { unsubscribeByToken } from "@/modules/newsletter/actions";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(unsubscribeByToken, null);
  if (state?.ok) return <p role="status">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-ctl bg-ink text-bg min-h-12 px-6 font-bold disabled:opacity-60"
      >
        {fa.newsletter.unsubscribeButton}
      </button>
      {state && !state.ok && <p className="text-bad text-sm">{state.message}</p>}
    </form>
  );
}
