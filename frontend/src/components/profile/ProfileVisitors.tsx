"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PiArrowClockwise, PiUsersThree } from "react-icons/pi";
import { api, ApiError } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import type { ProfileVisitorItem } from "@/types/profile";

interface ProfileVisitorsProps {
  kurageId: number;
}

const visitDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatVisitDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horário indisponível" : visitDateFormatter.format(date);
}

export function ProfileVisitors({ kurageId }: ProfileVisitorsProps) {
  const visitorsQuery = useQuery<ProfileVisitorItem[]>({
    queryKey: ["profile-visitors", kurageId],
    queryFn: () => api.get<ProfileVisitorItem[]>(`/users/kurage/${kurageId}/visitors`, {
      params: { limit: 20 },
    }),
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
      return failureCount < 1;
    },
  });

  return (
    <section
      aria-labelledby="profile-visitors-title"
      className="border-y border-white/[0.07] py-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="profile-visitors-title" className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <PiUsersThree aria-hidden="true" className="size-[17px] text-[var(--kurage-accent)]" />
            Quem passou por aqui
          </h2>
          <p className="mt-1 text-xs text-mute">As 20 visitas mais recentes deste perfil.</p>
        </div>

        {visitorsQuery.isError && (
          <button
            type="button"
            onClick={() => visitorsQuery.refetch()}
            className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[8px] px-3 text-xs font-medium text-charcoal transition-colors hover:bg-white/[0.05] hover:text-ink focus-visible:outline-none"
          >
            <PiArrowClockwise aria-hidden="true" className="size-4" />
            Tentar de novo
          </button>
        )}
      </div>

      {visitorsQuery.isPending && (
        <p className="mt-5 text-sm text-charcoal" role="status">Carregando visitantes…</p>
      )}

      {visitorsQuery.isError && (
        <p className="mt-5 text-sm text-charcoal" role="alert">
          Não foi possível carregar as visitas agora.
        </p>
      )}

      {visitorsQuery.isSuccess && visitorsQuery.data.length === 0 && (
        <p className="mt-5 text-sm text-charcoal">Ninguém passou por aqui ainda.</p>
      )}

      {visitorsQuery.isSuccess && visitorsQuery.data.length > 0 && (
        <ul className="mt-5 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {visitorsQuery.data.map((visitor) => {
            const visitedAt = formatVisitDate(visitor.visitedAt);
            return (
              <li key={`${visitor.userId}-${visitor.visitedAt}`} className="w-16 shrink-0 text-center">
                <Link
                  href={`/player/${visitor.kurageId}`}
                  aria-label={`${visitor.username}, visitou em ${visitedAt}`}
                  title={`${visitor.username} · ${visitedAt}`}
                  className="group inline-flex rounded-full focus-visible:outline-none"
                >
                  <Avatar
                    src={visitor.avatarUrl}
                    username={visitor.username}
                    kurageId={visitor.kurageId}
                    size="lg"
                    enableHovercard={false}
                    className="transition-[border-color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-[var(--kurage-accent)]/50"
                  />
                </Link>
                <time
                  dateTime={visitor.visitedAt}
                  className="mt-2 block text-xs leading-tight tabular-nums text-mute"
                >
                  {visitedAt}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
