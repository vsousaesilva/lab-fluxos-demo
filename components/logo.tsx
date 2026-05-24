import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** Tamanho do componente. Em "icon" só mostra o símbolo (corte da imagem). */
  variant?: "full" | "compact" | "icon";
  className?: string;
  /** Altura em px (default varia por variant). */
  height?: number;
  priority?: boolean;
};

/**
 * Logo "Laboratório de Fluxos". Usa o PNG em /logo.png (servido pelo
 * Next a partir do root do projeto via /public — copiamos o arquivo
 * pra public/logo.png na primeira build, ou referenciamos /logo.png
 * diretamente quando estiver lá).
 */
export function Logo({
  variant = "full",
  className,
  height,
  priority = false,
}: LogoProps) {
  const h =
    height ?? (variant === "full" ? 56 : variant === "compact" ? 36 : 32);
  // Proporção original: ~1080w x 360h (3:1)
  const w = Math.round(h * 3);

  return (
    <Image
      src="/logo.png"
      alt="Laboratório de Fluxos"
      width={w}
      height={h}
      priority={priority}
      className={cn("h-auto select-none", className)}
      style={{ height: h, width: "auto" }}
    />
  );
}
