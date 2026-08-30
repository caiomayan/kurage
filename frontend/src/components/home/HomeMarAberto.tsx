"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PiArrowRight, PiWarningCircle } from "react-icons/pi";
import { FixedServerDirectory } from "@/components/servers/FixedServerDirectory";
import { api } from "@/lib/api";
import {
  expireStaleServers,
  type GameServerWithPlayers,
} from "@/lib/game-servers";

const EASE = [0.16, 1, 0.3, 1] as const;

export function HomeMarAberto() {
  const [servers, setServers] = useState<GameServerWithPlayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchFixedServers() {
      try {
        const response = await api.get<GameServerWithPlayers[]>("/servers");
        if (!isMounted) return;
        setServers(expireStaleServers(Array.isArray(response) ? response : []));
        setLoadError(false);
      } catch {
        if (isMounted) {
          setServers((current) => expireStaleServers(current));
          setLoadError(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchFixedServers();
    const interval = setInterval(fetchFixedServers, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative z-10 w-full overflow-hidden border-t border-[var(--divider-soft)] bg-canvas py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: ["-12%", "12%", "-12%"],
            y: ["0%", "8%", "0%"],
            opacity: [0.34, 0.58, 0.34],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-10%] top-[8%] h-[480px] w-[120%] rounded-full mix-blend-screen blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--kurage-accent-rgb),0.24) 0%, rgba(146,188,227,0.1) 48%, transparent 74%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_35%,rgba(146,188,227,0.07),transparent_42%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-12 flex flex-col items-start justify-between gap-7 border-b border-white/[0.08] pb-9 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mute">
              Servidores oficiais
            </p>
            <h2 className="mt-3 font-display text-[44px] leading-none tracking-tight text-ink sm:text-[56px]">
              O Mar.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-body">
              Retake e Deathmatch em correntes independentes. Estado, mapa, lotação e placar vêm diretamente dos servidores Kurage.
            </p>
          </div>

          <Link
            href="/mar"
            className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-body transition hover:text-white"
          >
            Explorar O Mar
            <PiArrowRight className="transition-transform group-hover:translate-x-1" size={15} aria-hidden />
          </Link>
        </motion.header>

        {isLoading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="space-y-4 animate-pulse">
                <div className="h-10 w-40 rounded bg-white/[0.04]" />
                <div className="h-[164px] rounded-[14px] border border-white/[0.06] bg-white/[0.025]" />
              </div>
            ))}
          </div>
        ) : (
          <FixedServerDirectory servers={servers} compact />
        )}

        {loadError ? (
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[#d7a57f]">
            <PiWarningCircle size={17} aria-hidden />
            A telemetria está temporariamente indisponível. A seção tentará novamente automaticamente.
          </div>
        ) : null}
      </div>
    </section>
  );
}
