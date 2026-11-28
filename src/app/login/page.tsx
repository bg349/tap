import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { AuthForm } from "../auth/AuthForm";

export const metadata: Metadata = { title: "Sign in · Tap" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-14">
      <Logo />
      <h1 className="mt-14 text-4xl leading-[1.05] font-semibold tracking-tight">Welcome back.</h1>
      <Suspense>
        <ConfirmFailed searchParams={props.searchParams} />
      </Suspense>
      <AuthForm mode="login" />
    </main>
  );
}

async function ConfirmFailed({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { confirm } = await searchParams;
  if (confirm !== "failed") return null;
  return (
    <p className="mt-4 text-sm text-[var(--loss)]">
      That confirmation link didn&apos;t work or has expired. Sign in, or sign up again for a new link.
    </p>
  );
}
