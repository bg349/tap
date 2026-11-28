import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy policy · Tap",
  description: "What Tap collects, why, and how to have it deleted.",
};

// TODO(Ben): replace with the real contact address before Google verification.
const CONTACT_EMAIL = "CONTACT-EMAIL-TO-BE-CONFIRMED";
const UPDATED = "28 November 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Privacy policy
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">Last updated {UPDATED}</p>
      <p className="mt-6">
        Tap lets you link your accounts and share one profile with friends. This page explains,
        in plain language, what we collect, why, and the choices you have. We keep it short
        because we collect very little.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details.</strong> When you sign up with email, Google or Apple, we
            receive your email address and, if the provider shares them, your name and profile
            picture. We never see your Google or Apple password.
          </li>
          <li>
            <strong>Linked accounts.</strong> The chess.com username you give us. Using it, we
            fetch the public stats chess.com already makes available (rating, games, results) to
            build your profile card. We don&apos;t ask for your chess.com password.
          </li>
          <li>
            <strong>Basic technical data.</strong> Standard server logs such as IP address and
            browser type, and a sign-in cookie that keeps you logged in.
          </li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>
          Only to run Tap: signing you in, saving your linked accounts, and showing your profile
          card. We don&apos;t use your data for advertising and we don&apos;t build ad profiles.
        </p>
        <p>
          From Google, we use only your basic profile (email, name, picture). We don&apos;t
          access your Gmail, Drive, Calendar or any other Google data. Our use of information
          received from Google APIs follows the{" "}
          <a
            className="underline underline-offset-4"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements.
        </p>
      </Section>

      <Section title="Who handles your data">
        <p>
          We don&apos;t sell your data and we don&apos;t share it for marketing. A few service
          providers process it on our behalf so the app works:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase</strong> stores accounts, sign-in sessions and your linked
            accounts.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website.
          </li>
          <li>
            <strong>Google and Apple</strong> handle sign-in if you choose those options.
          </li>
          <li>
            <strong>chess.com</strong> is contacted only to read your public stats.
          </li>
        </ul>
        <p>
          Your profile card shows your linked usernames and public stats. If you share your
          profile link, anyone with the link can see it.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your data while your account exists. When you ask us to delete your account, we
          remove your account and linked accounts, apart from routine backups that expire on
          their own schedule.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can download all your data or delete your account yourself from the Account page, at any time. You can also ask us by email. You can
          also revoke Tap&apos;s access from your Google or Apple account settings. Cookies are
          used only to keep you signed in, not for tracking.
        </p>
      </Section>

      <Section title="Children">
        <p>Tap is not meant for children under 13, and we don&apos;t knowingly collect their data.</p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If we change this policy, we&apos;ll update the date above. Questions or deletion
          requests:{" "}
          <span className="font-medium">{CONTACT_EMAIL}</span>
        </p>
      </Section>

      <p className="mt-10 text-sm">
        <Link href="/" className="text-[var(--muted)] underline-offset-4 hover:underline">
          ← Back to Tap
        </Link>
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9 space-y-3 text-[15px] leading-relaxed">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
