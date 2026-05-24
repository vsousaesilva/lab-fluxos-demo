"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Microscope,
  BookOpen,
  Target,
  Workflow,
  FileCode2,
  ShieldCheck,
  ScrollText,
  MessagesSquare,
  Send,
  CheckSquare,
  Gauge,
  Bot,
  Ticket,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "pipeline" | "fluxos" | "scrum" | "integracao" | "admin";
};

const NAV: NavItem[] = [
  // Pipeline
  { href: "/painel", label: "Painel", icon: Gauge, group: "pipeline" },
  { href: "/demandas", label: "Demandas", icon: Inbox, group: "pipeline" },
  { href: "/analises", label: "Análise de Demanda", icon: Microscope, group: "pipeline" },
  { href: "/hu", label: "Histórias de Usuário", icon: BookOpen, group: "pipeline" },
  { href: "/sprints", label: "Sprints", icon: Target, group: "pipeline" },
  { href: "/revisao", label: "Revisão", icon: CheckSquare, group: "pipeline" },
  // Fluxos PJe
  { href: "/bpmn", label: "Designer BPMN", icon: Workflow, group: "fluxos" },
  { href: "/gerador-xml", label: "Gerador XML jPDL", icon: FileCode2, group: "fluxos" },
  { href: "/validador", label: "Validador XML", icon: ShieldCheck, group: "fluxos" },
  { href: "/consultor", label: "Consultor de Fluxos", icon: MessagesSquare, group: "fluxos" },
  // Scrum
  { href: "/ritos", label: "Ritos Scrum", icon: ScrollText, group: "scrum" },
  // Integração
  { href: "/jira", label: "Jira", icon: Send, group: "integracao" },
  { href: "/agentes", label: "Agentes (jobs)", icon: Bot, group: "integracao" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/convites", label: "Convites", icon: Ticket, group: "admin" },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  pipeline: "Pipeline",
  fluxos: "Fluxos PJe",
  scrum: "Scrum",
  integracao: "Integração",
  admin: "Admin",
};

const GROUP_ORDER: NavItem["group"][] = [
  "pipeline",
  "fluxos",
  "scrum",
  "integracao",
  "admin",
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const grouped = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  return (
    <aside
      aria-label="Sidebar"
      className="flex h-screen w-64 shrink-0 flex-col border-r bg-card"
      data-print="hide"
    >
      <div className="flex h-20 items-center justify-center border-b bg-gradient-to-br from-primary/5 to-accent/5 px-4">
        <Logo variant="full" height={48} priority />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
          <div key={group} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[group]}
            </div>
            <ul className="space-y-0.5">
              {grouped[group].map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/painel" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={async () => {
            await signOut();
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
