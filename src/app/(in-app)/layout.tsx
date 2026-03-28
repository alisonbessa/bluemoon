import { AppShell } from "./_components/app-shell";

export default function InAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
