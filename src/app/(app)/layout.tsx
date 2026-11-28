import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getUser } from "@/lib/supabase/server";

/**
 * Pages that show the app navigation (sidebar + mobile tabs) when you're signed in.
 * Signed-out visitors get the page on its own, as before.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1">{children}</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) return <>{children}</>;
  return <AppShell wide>{children}</AppShell>;
}
