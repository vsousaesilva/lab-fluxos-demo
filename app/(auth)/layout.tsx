import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary/40 via-background to-accent/10 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo variant="full" height={64} priority />
        </div>
        {children}
      </div>
    </div>
  );
}
