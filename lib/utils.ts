import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "America/Fortaleza";

export function formatDate(d: Date | number | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "object" ? d : new Date(d);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
  }).format(date);
}

export function formatDateTime(d: Date | number | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "object" ? d : new Date(d);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function truncate(s: string | null | undefined, max = 80) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
