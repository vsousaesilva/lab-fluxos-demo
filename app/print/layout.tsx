import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="print-page mx-auto max-w-4xl px-8 py-10">{children}</div>
    </div>
  );
}
