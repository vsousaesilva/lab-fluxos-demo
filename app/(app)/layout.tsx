import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const isAdmin = await isAdminEmail(session.user.email);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl space-y-6 px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
