import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/current-user";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();

  return <AppShell user={user}>{children}</AppShell>;
}
