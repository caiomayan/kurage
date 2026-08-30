import Image from "next/image";
import Link from "next/link";
import { PiArrowRight, PiCrosshair, PiUsersThree } from "react-icons/pi";
import { cn } from "@/lib/utils";
import {
  getFixedServersByMode,
  isGameServerFresh,
  type FixedServerMode,
  type GameServerWithPlayers,
} from "@/lib/game-servers";

const MODE_COPY: Record<
  FixedServerMode,
  { title: string; eyebrow: string; description: string }
> = {
  RETAKE: {
    title: "Retake",
    eyebrow: "Recuperação de bombsite",
    description: "Execução curta, leitura de round e retomada coordenada.",
  },
  DEATHMATCH: {
    title: "Deathmatch",
    eyebrow: "Combate contínuo",
    description: "Ritmo livre para aquecimento e treino mecânico.",
  },
};

type FixedServerDirectoryProps = {
  servers: GameServerWithPlayers[];
  compact?: boolean;
  onSelect?: (serverId: string) => void;
};

export function FixedServerDirectory({
  servers,
  compact = false,
  onSelect,
}: FixedServerDirectoryProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {(["RETAKE", "DEATHMATCH"] as const).map((mode) => {
        const modeServers = getFixedServersByMode(servers, mode);
        const copy = MODE_COPY[mode];

        return (
          <section key={mode} aria-labelledby={`fixed-mode-${mode}`}>
            <div className="mb-4 flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-mute">
                  {copy.eyebrow}
                </p>
                <h3
                  id={`fixed-mode-${mode}`}
                  className="mt-1 font-display text-[26px] tracking-tight text-ink"
                >
                  {copy.title}
                </h3>
              </div>
              <span className="text-[11px] text-mute">
                {modeServers.filter((server) => isGameServerFresh(server)).length} online
              </span>
            </div>

            <div className="space-y-3">
              {modeServers.length > 0 ? (
                modeServers.map((server) => (
                  <FixedServerCard
                    key={server.id}
                    server={server}
                    mode={mode}
                    compact={compact}
                    onSelect={onSelect}
                  />
                ))
              ) : (
                <EmptyFixedModeCard mode={mode} description={copy.description} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FixedServerCard({
  server,
  mode,
  compact,
  onSelect,
}: {
  server: GameServerWithPlayers;
  mode: FixedServerMode;
  compact: boolean;
  onSelect?: (serverId: string) => void;
}) {
  const isOnline = isGameServerFresh(server);
  const content = (
    <>
      {server.currentMap ? (
        <Image
          src={`/thumbs/${server.currentMap}.png`}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover opacity-[0.18] saturate-75 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-[0.26]"
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      <div className={cn("relative z-10 flex min-h-[188px] flex-col", compact && "min-h-[164px]")}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isOnline
                    ? "bg-accent-green shadow-[0_0_12px_rgba(17,255,153,0.75)]"
                    : "bg-white/25",
                )}
              />
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-body">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <h4 className="mt-4 font-display text-[23px] tracking-tight text-white">
              {server.name}
            </h4>
            <p className="mt-1 text-[13px] text-body">
              {server.currentMap
                ? server.currentMap.replace("de_", "").replaceAll("_", " ")
                : "Mapa indisponível"}
            </p>
          </div>

          <div className="flex items-center gap-2 text-mute">
            <PiUsersThree size={17} aria-hidden />
            <span className="font-mono text-[12px] text-body">
              {server.currentPlayers}/{server.maxPlayers}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-8">
          {mode === "RETAKE" ? (
            <div className="flex items-center gap-3 font-mono text-[13px]">
              <span className="text-[#8fc7ff]">CT {server.ctScore}</span>
              <span className="h-3 w-px bg-white/15" />
              <span className="text-[#f4c26d]">TR {server.trScore}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-body">
              <PiCrosshair size={16} aria-hidden />
              <span>Aquecimento livre</span>
            </div>
          )}

          <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition group-hover:text-accent-green">
            Ver servidor
            <PiArrowRight size={15} aria-hidden />
          </span>
        </div>
      </div>
    </>
  );

  const className =
    "group relative block w-full overflow-hidden rounded-[14px] border border-white/[0.09] bg-surface-card p-5 text-left transition duration-300 hover:border-[rgba(var(--kurage-accent-rgb),0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60";

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={() => onSelect(server.id)}>
        {content}
      </button>
    );
  }

  return (
    <Link href={`/mar?server=${encodeURIComponent(server.id)}`} className={className}>
      {content}
    </Link>
  );
}

function EmptyFixedModeCard({
  mode,
  description,
}: {
  mode: FixedServerMode;
  description: string;
}) {
  return (
    <div className="flex min-h-[188px] flex-col justify-between rounded-[14px] border border-dashed border-white/[0.1] bg-white/[0.018] p-5">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-mute">
          Offline
        </span>
      </div>
      <div>
        <p className="font-display text-[19px] text-body">
          Nenhum servidor {mode === "RETAKE" ? "Retake" : "DM"} configurado
        </p>
        <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-mute">
          {description} Esta área será preenchida automaticamente quando um servidor fixo for registrado.
        </p>
      </div>
    </div>
  );
}
