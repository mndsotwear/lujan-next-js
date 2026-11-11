import type { Metadata } from "next";
import { DeleteAccount } from "@/components/account/DeleteAccount";
import { ProfileForm } from "@/components/account/ProfileForm";
import { NewsletterConsents } from "@/components/newsletter/NewsletterConsents";
import { fa } from "@/content/fa";
import { deviceName } from "@/modules/account";
import { getProfile, listMySessions, requireUser } from "@/modules/account/server";
import { SessionList } from "@/components/account/SessionList";
import { consentsFor } from "@/modules/newsletter/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: fa.account.nav.profile, robots: { index: false } };

export default async function ProfilePage() {
  const u = await requireUser("/account/profile");
  const [profile, consents, sessions] = await Promise.all([
    getProfile(u.id),
    consentsFor(u),
    listMySessions(u.id),
  ]);
  const faDate = (d: Date) =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(d);
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-xl font-bold">{fa.account.nav.profile}</h2>
        <ProfileForm profile={profile} />
      </div>
      <SessionList
        sessions={sessions.map((x) => ({
          id: x.id,
          device: deviceName(x.userAgent),
          since: faDate(x.createdAt),
          current: x.current,
        }))}
      />
      <NewsletterConsents sms={consents.sms} email={consents.email} hasEmail={!!u.email} />
      <DeleteAccount />
    </section>
  );
}
