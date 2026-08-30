"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PiCube, PiWarningCircle } from "react-icons/pi";
import { buildViewerSource, isViewerRenderable, ViewerApi, type ViewerItemInput } from "@/lib/inventory/viewer-api";

interface Inventory3DViewerProps {
  item: ViewerItemInput;
  fallback: ReactNode;
  onApi?: (api: ViewerApi | null) => void;
}

export function Inventory3DViewer({ item, fallback, onApi }: Inventory3DViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialItemRef = useRef(item);
  const [source] = useState(() => buildViewerSource(item));
  const [api, setApi] = useState<ViewerApi | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const supported = isViewerRenderable(item);

  useEffect(() => {
    if (!supported || !iframeRef.current) return;
    const viewerApi = new ViewerApi(iframeRef.current);
    const offReady = viewerApi.on("ready", () => setStatus("ready"));
    const offRendered = viewerApi.on("rendered", () => setStatus("ready"));
    const offLoading = viewerApi.on("loading", ({ busy }) => setStatus(busy ? "loading" : "ready"));
    const offUnsupported = viewerApi.on("unsupported", () => setStatus("unavailable"));
    const offRateLimited = viewerApi.on("rateLimited", () => setStatus("unavailable"));
    setApi(viewerApi);
    onApi?.(viewerApi);
    return () => {
      offReady();
      offRendered();
      offLoading();
      offUnsupported();
      offRateLimited();
      viewerApi.destroy();
      setApi(null);
      onApi?.(null);
    };
  }, [onApi, supported]);

  useEffect(() => {
    if (api && item !== initialItemRef.current) api.setItem(item);
  }, [api, item]);

  if (!supported || status === "unavailable") {
    return (
      <div className="relative flex size-full items-center justify-center">
        {fallback}
        {status === "unavailable" && <span className="absolute bottom-12 flex items-center gap-1.5 rounded-full border border-amber-200/10 bg-black/55 px-3 py-1.5 text-[10px] text-amber-100/55"><PiWarningCircle /> 3D indisponível; usando visualização 2D</span>}
      </div>
    );
  }

  return (
    <div className="relative size-full bg-transparent">
      <iframe
        ref={iframeRef}
        src={source}
        title="Visualizador 3D do item"
        className="size-full border-0 bg-transparent"
        style={{ backgroundColor: "transparent", colorScheme: "normal" }}
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#020303]/45 text-[var(--kurage-accent)] backdrop-blur-sm">
          <span className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-black/50 px-4 py-2 text-xs"><PiCube className="animate-pulse" /> Carregando modelo 3D…</span>
        </div>
      )}
    </div>
  );
}
