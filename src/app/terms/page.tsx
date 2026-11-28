import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms of Service · Tap",
  description: "The plain-language rules for using Tap.",
};

// TODO(Ben): replace with the real contact address before submitting to Google.
const CONTACT = "contact email to be confirmed";
const UPDATED = "November 28, 2026";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Who we are and what Tap does",
    body: [
      "Tap lets you link your accounts from other services, such as chess.com, and shows them together on one profile card that you can share with friends. By using Tap you agree to these terms. If you do not agree, please do not use the service.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You can sign up with an email and password, or with Google or Apple. You must give accurate information, keep your sign-in details safe, and be old enough to agree to these terms where you live (at least 13 years old).",
      "You are responsible for what happens under your account. Tell us promptly if you think someone else has got into it.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "Please use Tap in good faith. You agree not to:",
      "• break the law or the rules of any linked service;\n• link an account that is not yours, or pretend to be someone else;\n• try to break, overload, scrape or reverse engineer Tap, or get around its security;\n• upload or share anything abusive, hateful, harassing or that infringes someone else's rights;\n• use Tap to send spam or to harm other people.",
    ],
  },
  {
    title: "4. Your content and linked accounts",
    body: [
      "You keep ownership of everything you add to Tap. You give us permission to store it and to show it on your profile in the way you set it up, only so that we can run the service for you.",
      "When you link a third-party account (for example chess.com), we show information from that service on your profile. Each linked service has its own terms and privacy rules, and you are responsible for following them. We are not affiliated with or endorsed by those services, and their names belong to their owners. You can unlink an account at any time.",
    ],
  },
  {
    title: "5. Sign-in with Google or Apple",
    body: [
      "If you sign in with Google or Apple, we receive only the basic details needed to create your account, such as your name and email address. We do not post on your behalf. You can stop using that sign-in method at any time.",
    ],
  },
  {
    title: "6. No warranty",
    body: [
      "Tap is provided \"as is\" and \"as available\". We try to keep it accurate and running, but we do not promise it will be uninterrupted, error-free, or that data from linked services will always be correct or up to date.",
    ],
  },
  {
    title: "7. Limit of liability",
    body: [
      "To the extent the law allows, Tap and its owners are not liable for indirect or consequential losses, or for loss of data, arising from your use of the service. Nothing in these terms limits any rights you have that cannot be limited by law.",
    ],
  },
  {
    title: "8. Ending your account",
    body: [
      "You can stop using Tap and ask us to delete your account at any time. We may suspend or end your access if you break these terms or if we need to protect the service or other people. We may also stop offering Tap, and will try to give notice if we do.",
    ],
  },
  {
    title: "9. Changes to these terms",
    body: [
      "We may update these terms from time to time. When we do, we will change the date at the top of this page, and for significant changes we will try to tell you in the app. Continuing to use Tap after a change means you accept the new terms.",
    ],
  },
  {
    title: "10. Contact",
    body: [`Questions about these terms? Reach us at ${CONTACT}.`],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">Last updated {UPDATED}</p>
      <p className="mt-6 text-[var(--muted)]">
        The short version: use Tap kindly, keep your account safe, and know that we show
        your linked accounts only the way you set them up.
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-2 whitespace-pre-line text-[var(--muted)]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
