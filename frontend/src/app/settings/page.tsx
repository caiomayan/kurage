"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiUser,
  PiCrosshair,
  PiArrowsClockwise,
  PiSparkle,
  PiCheck,
  PiCopy,
  PiArrowRight,
  PiSpinnerGap,
  PiWarningCircle,
  PiCheckCircle,
  PiCaretDown,
  PiArrowSquareOut,
  PiMagnifyingGlass,
  PiX,
  PiCamera,
  PiUploadSimple,
  PiSteamLogo,
  PiPencilSimple,
  PiEnvelope,
} from "react-icons/pi";
import { useAuth } from "@/lib/auth";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { AvatarCropDialog, type AvatarCrop } from "@/components/settings/AvatarCropDialog";
import type { InGameFunction, UserWithStats } from "@/types/user";

type SettingsSection = "profile" | "contact" | "tactical" | "integrations" | "passport";

interface UserContact {
  email: string | null;
  phoneNumber: string | null;
}

type AvatarUploadFeedback = { type: "error" | "info"; text: string } | null;
type AvatarCropSource =
  | { kind: "file"; file: File; previewUrl: string }
  | { kind: "steam"; previewUrl: string };

const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function waitForAvatarImage(url: string, timeoutMs = 8_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error("timeout"));
    }, timeoutMs);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("unavailable"));
    };
    image.src = url;
  });
}

function getAvatarCropBounds(width: number, height: number, crop: AvatarCrop) {
  const cropSize = Math.min(width, height) / crop.zoom;
  const maxLeft = width - cropSize;
  const maxTop = height - cropSize;

  return {
    left: maxLeft / 2 - crop.positionX * maxLeft / 2,
    top: maxTop / 2 - crop.positionY * maxTop / 2,
    size: cropSize,
  };
}

async function cropLocalAvatar(file: File, crop: AvatarCrop): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("invalid-image"));
      element.src = objectUrl;
    });
    const { left, top, size } = getAvatarCropBounds(image.naturalWidth, image.naturalHeight, crop);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");

    context.drawImage(image, left, top, size, size, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("crop-unavailable");
    return new File([blob], "avatar.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface CountryOption {
  code: string;
  name: string;
}

const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: "BR", name: "Brasil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "UY", name: "Uruguai" },
  { code: "PY", name: "Paraguai" },
  { code: "PE", name: "Peru" },
  { code: "CO", name: "Colômbia" },
  { code: "PT", name: "Portugal" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
  { code: "ES", name: "Espanha" },
  { code: "DE", name: "Alemanha" },
  { code: "FR", name: "França" },
  { code: "SE", name: "Suécia" },
  { code: "DK", name: "Dinamarca" },
  { code: "PL", name: "Polônia" },
  { code: "UA", name: "Ucrânia" },
  { code: "GB", name: "Reino Unido" },
  { code: "IT", name: "Itália" },
  { code: "NO", name: "Noruega" },
  { code: "FI", name: "Finlândia" },
];

const CS2_ROLES: Array<{
  id: InGameFunction;
  label: string;
  description: string;
}> = [
  {
    id: "ENTRY",
    label: "Entry Fragger",
    description: "Abertura de espaço e primeiro duelo nas execuções.",
  },
  {
    id: "AWPER",
    label: "AWPer",
    description: "Controle de ângulos longos e impacto com rifle de precisão.",
  },
  {
    id: "IGL",
    label: "In-Game Leader",
    description: "Comando tático, leitura de jogo e coordenação estratégica.",
  },
  {
    id: "SUPPORT",
    label: "Suporte",
    description: "Utilitários calculados, flashbangs e refrag disciplinado.",
  },
  {
    id: "LURKER",
    label: "Lurker",
    description: "Controle de rotações adversárias e corte silencioso de mapa.",
  },
  {
    id: "CORINGA",
    label: "Coringa",
    description: "Adaptação versátil a qualquer função necessária no round.",
  },
];

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, loginWithSteam, refreshUser } = useAuth();

  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // Form states
  const [username, setUsername] = useState<string>("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [primaryFunction, setPrimaryFunction] = useState<InGameFunction>("CORINGA");
  const [secondaryFunction, setSecondaryFunction] = useState<InGameFunction | null>(null);
  const [country, setCountry] = useState<string>("BR");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUploadFeedback, setAvatarUploadFeedback] = useState<AvatarUploadFeedback>(null);
  const [avatarCropSource, setAvatarCropSource] = useState<AvatarCropSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states & micro-feedbacks
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingTactical, setIsSavingTactical] = useState(false);
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSyncingFaceit, setIsSyncingFaceit] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize values from authenticated user
  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        setUsername(user.username || "");
        if (user.primaryFunction) setPrimaryFunction(user.primaryFunction);
        setSecondaryFunction(user.secondaryFunction || null);
        if (user.country) setCountry(user.country);
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrent = true;
    api.get<UserContact>("/users/me/contact")
      .then((contact) => {
        if (!isCurrent) return;
        setContactEmail(contact.email || "");
        setContactPhone(contact.phoneNumber || "");
      })
      .catch(() => {
        // The form remains empty when the API is unavailable; saving surfaces a
        // user-facing error and no private data is rendered from public profile data.
      })
      .finally(() => {
        if (isCurrent) setIsLoadingContact(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Update username
  const handleSaveUsername = async () => {
    if (!username.trim() || username.trim() === user?.username) {
      setIsEditingUsername(false);
      return;
    }
    setIsSavingUsername(true);
    try {
      await api.put(`/users/me/username?username=${encodeURIComponent(username.trim())}`);
      await refreshUser();
      setIsEditingUsername(false);
      showToast("Nome de exibição atualizado com sucesso!");
    } catch {
      showToast("Erro ao atualizar nome de exibição.", "error");
    } finally {
      setIsSavingUsername(false);
    }
  };

  const closeAvatarCropper = () => {
    if (avatarCropSource?.kind === "file") URL.revokeObjectURL(avatarCropSource.previewUrl);
    setAvatarCropSource(null);
  };

  const uploadAvatarFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const updatedUser = await api.post<UserWithStats>("/users/me/avatar", formData);
    const currentUser = await refreshUser();
    const avatarUrl = currentUser?.avatarUrl ?? updatedUser.avatarUrl;
    if (!avatarUrl) throw new Error("missing-avatar-url");

    setAvatarUploadFeedback({ type: "info", text: "Arquivo recebido. Verificando a imagem pública…" });
    await waitForAvatarImage(avatarUrl);
  };

  // Opens the editor instead of committing a raw image immediately.
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploadFeedback(null);

    // Validate size (< 5MB) and type
    if (file.size > 5 * 1024 * 1024) {
      const message = "A imagem deve ter menos de 5 MB.";
      setAvatarUploadFeedback({ type: "error", text: message });
      showToast(message, "error");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      const message = "Use uma imagem PNG, JPG ou WebP.";
      setAvatarUploadFeedback({ type: "error", text: message });
      showToast(message, "error");
      return;
    }

    setAvatarCropSource({ kind: "file", file, previewUrl: URL.createObjectURL(file) });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChooseSteamAvatar = async () => {
    setAvatarUploadFeedback(null);
    setIsUpdatingAvatar(true);
    try {
      const source = await api.get<{ avatarUrl: string }>("/users/me/steam-avatar");
      if (!source.avatarUrl) throw new Error("missing-steam-avatar");
      setAvatarCropSource({ kind: "steam", previewUrl: source.avatarUrl });
    } catch (error) {
      const message = error instanceof ApiError
        ? `Não foi possível obter seu avatar da Steam: ${error.message}`
        : "Não foi possível obter seu avatar da Steam.";
      setAvatarUploadFeedback({ type: "error", text: message });
      showToast(message, "error");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleSaveAvatarCrop = async (crop: AvatarCrop) => {
    if (!avatarCropSource) return;

    setIsUpdatingAvatar(true);
    setAvatarUploadFeedback(null);
    try {
      if (avatarCropSource.kind === "file") {
        await uploadAvatarFile(await cropLocalAvatar(avatarCropSource.file, crop));
      } else {
        const updatedUser = await api.post<UserWithStats>("/users/me/avatar/steam", crop);
        const currentUser = await refreshUser();
        const avatarUrl = currentUser?.avatarUrl ?? updatedUser.avatarUrl;
        if (!avatarUrl) throw new Error("missing-avatar-url");
        setAvatarUploadFeedback({ type: "info", text: "Foto recebida. Verificando a imagem pública…" });
        await waitForAvatarImage(avatarUrl);
      }

      closeAvatarCropper();
      setIsAvatarModalOpen(false);
      showToast("Avatar atualizado com sucesso!");
    } catch (error) {
      const message = error instanceof ApiError
        ? `Não foi possível atualizar o avatar: ${error.message}`
        : "Não foi possível concluir o recorte. Verifique a configuração do armazenamento de imagens.";
      setAvatarUploadFeedback({ type: "error", text: message });
      closeAvatarCropper();
      showToast(message, "error");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // Save country change immediately via combobox
  const handleSelectCountry = async (newCountry: string) => {
    setCountry(newCountry);
    try {
      await api.put(`/users/me/country?country=${encodeURIComponent(newCountry)}`);
      await refreshUser();
      showToast(`País alterado para ${newCountry}.`);
    } catch {
      showToast("Erro ao atualizar país.", "error");
    }
  };

  // Save tactical roles
  const handleSaveTactical = async (primary: InGameFunction, secondary: InGameFunction | null) => {
    setPrimaryFunction(primary);
    setSecondaryFunction(secondary);
    setIsSavingTactical(true);
    try {
      await api.put("/users/me/functions", {
        primaryFunction: primary,
        secondaryFunction: secondary,
      });
      await refreshUser();
      showToast("Especialização tática atualizada!");
    } catch {
      showToast("Erro ao atualizar funções táticas.", "error");
    } finally {
      setIsSavingTactical(false);
    }
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    try {
      const contact = await api.put<UserContact>("/users/me/contact", {
        email: contactEmail.trim() || null,
        phoneNumber: contactPhone.trim() || null,
      });
      setContactEmail(contact.email || "");
      setContactPhone(contact.phoneNumber || "");
      showToast("Canais de contato atualizados.");
    } catch {
      showToast("Revise o e-mail e o telefone antes de salvar.", "error");
    } finally {
      setIsSavingContact(false);
    }
  };

  // Sync Faceit Data
  const handleSyncFaceit = async () => {
    setIsSyncingFaceit(true);
    try {
      await api.put("/users/me/faceit-sync");
      await refreshUser();
      showToast("Telemetria e estatísticas Faceit sincronizadas.");
    } catch {
      showToast("Erro ao conectar com a API da Faceit.", "error");
    } finally {
      setIsSyncingFaceit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020507] flex items-center justify-center text-ink">
        <PiSpinnerGap className="w-7 h-7 animate-spin text-[var(--kurage-accent)]" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="relative min-h-screen bg-[#020507] font-sans text-ink flex items-center justify-center p-6">
        <div className="relative z-10 max-w-sm w-full text-center flex flex-col items-center gap-6">
          <PiUser className="w-10 h-10 text-[var(--kurage-accent)]/80" />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[24px] font-bold text-white tracking-tight">
              Configurações da Conta
            </h1>
            <p className="text-[13px] font-sans text-stone-400 leading-relaxed">
              Autentique-se com sua conta Steam para acessar suas preferências e telemetria.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loginWithSteam()}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-[6px] bg-white text-black font-sans font-medium text-[13px] hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <span>Conectar com Steam</span>
            <PiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const userStats = (user as UserWithStats).stats;
  const kurageLevel = userStats?.kurageLevel ?? null;
  const faceitLevel = (user as UserWithStats).faceitLevel ?? null;

  const navItems = [
    { id: "profile" as SettingsSection, label: "Perfil", icon: PiUser },
    { id: "contact" as SettingsSection, label: "Comunicação", icon: PiEnvelope },
    { id: "tactical" as SettingsSection, label: "Especialização CS2", icon: PiCrosshair },
    { id: "integrations" as SettingsSection, label: "Conexões & Telemetria", icon: PiArrowsClockwise },
    { id: "passport" as SettingsSection, label: "Passaporte & Assinatura", icon: PiSparkle },
  ];

  return (
    <div className="relative min-h-screen bg-[#020507] font-sans text-ink pb-36 pt-24 sm:pt-32">
      
      {/* ── 1. SUBTLE OCEANIC ATMOSPHERE ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full opacity-[0.05] blur-[150px]"
          style={{ background: "radial-gradient(circle, var(--kurage-accent) 0%, #92bce3 60%, transparent 80%)" }}
        />
      </div>

      {/* ── 2. TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-sans font-medium backdrop-blur-xl border shadow-[0_12px_36px_rgba(0,0,0,0.85)]",
                toastMessage.type === "success"
                  ? "bg-[#06120c]/95 text-[#11ff99] border-[#11ff99]/25"
                  : "bg-[#140608]/95 text-[#ff4d4d] border-[#ff4d4d]/25"
              )}
            >
              {toastMessage.type === "success" ? (
                <PiCheckCircle className="w-4 h-4 text-[#11ff99]" />
              ) : (
                <PiWarningCircle className="w-4 h-4 text-[#ff4d4d]" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. MAIN CONTAINER ── */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1 pb-8 border-b border-white/[0.06] mb-8">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[var(--kurage-accent)]/80">
            <span>Configurações</span>
          </div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-bold text-white tracking-tight">
            Preferências da Conta
          </h1>
          <p className="text-[13px] font-sans text-stone-400">
            Gerencie sua identidade, especialização tática e conexões competitivas.
          </p>
        </div>

        {/* ── 4. TWO-COLUMN MASTER-DETAIL ARCHITECTURE ── */}
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 lg:gap-12 items-start">
          
          {/* Sidebar Nav */}
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none sticky top-28">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left transition-colors shrink-0 cursor-pointer text-[13px] font-sans",
                    isActive
                      ? "text-white font-medium bg-white/[0.06]"
                      : "text-stone-400 hover:text-stone-200 hover:bg-white/[0.02]"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[var(--kurage-accent)]" : "text-stone-400")} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Settings Content Area */}
          <div className="flex flex-col min-w-0">
            
            {/* ══════════════════════════════════════════════════════════ */}
            {/* SECTION 1: PERFIL (Foco central no avatar & edição direta) */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeSection === "profile" && (
              <div className="flex flex-col gap-8">
                
                {/* ── HERO AVATAR FOCUS (Central, Floating, High Craft) ── */}
                <div className="flex flex-col items-center text-center pb-8 border-b border-white/[0.06]">
                  
                  {/* Avatar with Camera Trigger Overlay */}
                  <div className="relative group/avatar mb-4">
                    <div
                      onClick={() => {
                        setAvatarUploadFeedback(null);
                        setIsAvatarModalOpen(true);
                      }}
                      className="relative cursor-pointer rounded-full overflow-hidden transition-transform duration-200 group-hover/avatar:scale-[1.02] shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                      title="Alterar foto de perfil"
                    >
                      <Avatar
                        src={user.avatarUrl}
                        username={user.username}
                        size="xl"
                        isVerifiedPro={user.isVerifiedPro}
                        enableHovercard={false}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                        <PiCamera className="w-5 h-5" />
                        <span className="text-[10px] font-sans font-medium uppercase tracking-wider">Alterar</span>
                      </div>
                    </div>

                    {/* Subtle Level Node at Bottom Right */}
                    {kurageLevel != null && kurageLevel > 0 && (
                      <div className="absolute -bottom-1 -right-1">
                        <KurageLevelIcon level={kurageLevel} />
                      </div>
                    )}
                  </div>

                  {/* Name + Inline Country Combobox */}
                  <div className="flex items-center justify-center gap-2">
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveUsername();
                            if (e.key === "Escape") {
                              setUsername(user.username || "");
                              setIsEditingUsername(false);
                            }
                          }}
                          autoFocus
                          maxLength={32}
                          className="bg-white/[0.06] border border-[var(--kurage-accent)]/40 rounded-[6px] px-2.5 py-1 text-[18px] sm:text-[20px] font-display font-bold text-white text-center focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveUsername}
                          disabled={isSavingUsername}
                          className="p-1.5 text-[#11ff99] hover:bg-white/10 rounded-[6px] transition-colors cursor-pointer"
                          title="Salvar nome"
                        >
                          {isSavingUsername ? <PiSpinnerGap className="w-4 h-4 animate-spin" /> : <PiCheck className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUsername(user.username || "");
                            setIsEditingUsername(false);
                          }}
                          className="p-1.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <PiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/name">
                        <span className="font-display text-[20px] sm:text-[22px] font-bold text-white tracking-tight leading-none">
                          {user.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingUsername(true)}
                          className="text-stone-500 hover:text-stone-300 transition-colors p-1"
                          title="Editar nome de exibição"
                        >
                          <PiPencilSimple className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Discreet Country Trigger (Flag icon + chevron arrow only, no border/bg) */}
                    <CountryComboboxMinimal value={country} onChange={handleSelectCountry} />
                  </div>

                  {/* Subtle Kurage ID & Steam Meta */}
                  <div className="flex items-center justify-center gap-2 text-[12px] font-mono text-stone-400 mt-2">
                    <span className="text-stone-500">#{user.kurageId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(user.kurageId), "kurageId")}
                      className="text-stone-500 hover:text-stone-300 transition-colors p-0.5"
                      title="Copiar Kurage ID"
                    >
                      {copiedKey === "kurageId" ? <PiCheck className="w-3 h-3 text-[#11ff99]" /> : <PiCopy className="w-3 h-3" />}
                    </button>
                    <span className="text-stone-600">·</span>
                    <span className="text-stone-500">{user.steamId64}</span>
                  </div>

                </div>

                {/* Profile Public Link Row */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-white">
                      Ver Perfil Público
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Veja como sua telemetria e calibração são exibidas para a comunidade.
                    </span>
                  </div>

                  <Link
                    href={`/player/${user.kurageId}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-sans text-stone-300 hover:text-white transition-colors"
                  >
                    <span>Abrir Perfil</span>
                    <PiArrowSquareOut className="w-3.5 h-3.5 text-stone-400" />
                  </Link>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SECTION 2: COMUNICAÇÃO PRIVADA                            */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeSection === "contact" && (
              <div className="flex flex-col gap-7">
                <div className="flex flex-col gap-2 pb-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <PiEnvelope className="w-4 h-4 text-[var(--kurage-accent)]" />
                    <span className="text-[14px] font-medium text-white">Canais de comunicação</span>
                  </div>
                  <p className="text-[13px] text-stone-400 leading-relaxed">
                    Opcional e privado. Estes dados não aparecem no seu perfil público. E-mail e WhatsApp ainda não são usados para envios; quando os canais forem ativados, haverá confirmação e preferência explícita.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-medium text-white">E-mail</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) => setContactEmail(event.target.value)}
                      placeholder="voce@exemplo.com"
                      autoComplete="email"
                      maxLength={254}
                      disabled={isLoadingContact || isSavingContact}
                      className="h-11 rounded-[6px] border border-white/[0.1] bg-white/[0.04] px-3 text-[14px] text-white placeholder:text-stone-600 focus:border-[var(--kurage-accent)]/60 focus:outline-none disabled:opacity-50"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] font-medium text-white">Telefone / WhatsApp</span>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      placeholder="+55 85 99999-9999"
                      autoComplete="tel"
                      maxLength={40}
                      disabled={isLoadingContact || isSavingContact}
                      className="h-11 rounded-[6px] border border-white/[0.1] bg-white/[0.04] px-3 text-[14px] text-white placeholder:text-stone-600 focus:border-[var(--kurage-accent)]/60 focus:outline-none disabled:opacity-50"
                    />
                    <span className="text-[12px] text-stone-500">Use código do país, por exemplo: +55 85 99999-9999.</span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <span className="text-[12px] text-stone-500">Deixe um campo vazio para remover aquele contato.</span>
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={isLoadingContact || isSavingContact}
                    className="h-10 shrink-0 inline-flex items-center justify-center gap-2 rounded-[6px] bg-white px-4 text-[13px] font-medium text-black transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingContact && <PiSpinnerGap className="h-4 w-4 animate-spin" />}
                    <span>Salvar contato</span>
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SECTION 3: ESPECIALIZAÇÃO CS2                             */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeSection === "tactical" && (
              <div className="divide-y divide-white/[0.06]">
                
                {/* Primary Tactical Role */}
                <div className="pb-8 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-white">
                      Função Primária
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Sua atribuição principal nas estratégias de equipe.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CS2_ROLES.map((r) => {
                      const isSelected = primaryFunction === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            const newSec = secondaryFunction === r.id ? null : secondaryFunction;
                            handleSaveTactical(r.id, newSec);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3.5 py-2.5 rounded-[6px] text-left transition-all cursor-pointer border",
                            isSelected
                              ? "bg-white/[0.08] border-[var(--kurage-accent)]/40 text-white shadow-[0_0_12px_rgba(var(--kurage-accent-rgb),0.1)]"
                              : "bg-transparent border-white/[0.06] text-stone-400 hover:text-stone-200 hover:border-white/10"
                          )}
                        >
                          <RoleIcon role={r.id} size={15} />
                          <div className="flex flex-col min-w-0">
                            <span className={cn("text-[13px] font-medium truncate", isSelected ? "text-white" : "text-stone-300")}>
                              {r.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Tactical Role */}
                <div className="py-8 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-white">
                      Função Secundária (Opcional)
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Função de adaptação em rounds táticos específicos.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveTactical(primaryFunction, null)}
                      className={cn(
                        "flex items-center justify-center px-3 py-2 rounded-[6px] text-[12px] font-medium transition-all cursor-pointer border",
                        secondaryFunction === null
                          ? "bg-white/[0.08] border-white/20 text-white"
                          : "bg-transparent border-white/[0.06] text-stone-400 hover:text-stone-200"
                      )}
                    >
                      Nenhuma
                    </button>

                    {CS2_ROLES.filter((r) => r.id !== primaryFunction).map((r) => {
                      const isSelected = secondaryFunction === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSaveTactical(primaryFunction, r.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-[6px] text-left transition-all cursor-pointer border",
                            isSelected
                              ? "bg-white/[0.08] border-[#92bce3]/40 text-white"
                              : "bg-transparent border-white/[0.06] text-stone-400 hover:text-stone-200 hover:border-white/10"
                          )}
                        >
                          <RoleIcon role={r.id} size={14} />
                          <span className="text-[12px] font-medium truncate">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tactical Role Summary Strip */}
                <div className="pt-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RoleIcon role={primaryFunction} size={18} />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-white">
                        {CS2_ROLES.find((r) => r.id === primaryFunction)?.label}
                        {secondaryFunction && ` · ${CS2_ROLES.find((r) => r.id === secondaryFunction)?.label}`}
                      </span>
                      <span className="text-[12px] text-stone-400">
                        {CS2_ROLES.find((r) => r.id === primaryFunction)?.description}
                      </span>
                    </div>
                  </div>

                  {isSavingTactical && (
                    <PiSpinnerGap className="w-4 h-4 animate-spin text-[var(--kurage-accent)]" />
                  )}
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SECTION 3: CONEXÕES & TELEMETRIA                          */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeSection === "integrations" && (
              <div className="divide-y divide-white/[0.06]">
                
                {/* Steam OpenID */}
                <div className="pb-8 flex items-center justify-between gap-4">
                  <div className="flex flex-col max-w-sm">
                    <span className="text-[14px] font-medium text-white">
                      Steam OpenID
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Sessão autenticada via protocolo Valve Corporation.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-mono text-[#11ff99]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#11ff99]" />
                      Conectado
                    </span>

                    <a
                      href={`https://steamcommunity.com/profiles/${user.steamId64}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-stone-400 hover:text-white transition-colors cursor-pointer"
                      title="Ver Perfil na Comunidade Steam"
                    >
                      <PiArrowSquareOut className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Faceit CS2 */}
                <div className="pt-8 flex items-center justify-between gap-4">
                  <div className="flex flex-col max-w-sm">
                    <span className="text-[14px] font-medium text-white">
                      Telemetria Faceit CS2
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Sincronização de nível e rating competitivo via SteamID64.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {faceitLevel ? (
                      <div className="flex items-center gap-2">
                        <FaceitLevelIcon level={faceitLevel} size={22} />
                        <span className="text-[13px] font-mono font-semibold text-white">
                          Nível {faceitLevel}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-stone-500 font-sans">
                        Não detectado
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSyncFaceit}
                      disabled={isSyncingFaceit}
                      className="p-2 text-stone-400 hover:text-[var(--kurage-accent)] transition-colors cursor-pointer disabled:opacity-40"
                      title="Re-sincronizar dados Faceit"
                    >
                      <PiArrowsClockwise className={cn("w-4 h-4", isSyncingFaceit && "animate-spin text-[var(--kurage-accent)]")} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* SECTION 4: PASSAPORTE & ASSINATURA                        */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeSection === "passport" && (
              <div className="divide-y divide-white/[0.06]">
                
                {/* Plan Tier Status */}
                <div className="pb-8 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-white">
                      Passaporte Competitivo
                    </span>
                    <span className="text-[13px] text-stone-400">
                      Nível de acesso e recursos ativos no ecossistema Kurage.
                    </span>
                  </div>

                  <span className={cn(
                    "rounded-[4px] border px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider",
                    user.subscriptionTier === "MARE"
                      ? "border-[var(--mare-accent)]/30 bg-[var(--mare-accent)]/15 text-[var(--mare-accent)]"
                      : "border-white/[0.1] bg-white/[0.04] text-stone-400"
                  )}>
                    {user.subscriptionTier === "MARE" ? "Maré" : "Livre"}
                  </span>
                </div>

                {/* Account Details */}
                <div className="py-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono uppercase text-mute">Titular</span>
                    <span className="text-[14px] font-medium text-white mt-1">{user.username}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono uppercase text-mute">Membro Desde</span>
                    <span className="text-[14px] font-medium text-white mt-1">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "2026"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono uppercase text-mute">Nível Kurage</span>
                    <span className="text-[14px] font-medium text-[var(--kurage-accent)] mt-1">
                      {kurageLevel != null ? `Nível ${kurageLevel}` : "Em calibração"}
                    </span>
                  </div>
                </div>

                {/* Active Capabilities */}
                <div className="pt-8 flex flex-col gap-3">
                  <span className="text-[13px] font-medium text-white">
                    {user.subscriptionTier === "MARE" ? "Benefícios Maré" : "Recursos ativos"}
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-stone-300">
                    {(user.subscriptionTier === "MARE"
                      ? [
                          "Tema e selo Maré",
                          "Prioridade nos servidores oficiais",
                          "Histórico e análises avançadas",
                          "Acesso antecipado a novidades",
                        ]
                      : [
                          "Passaporte competitivo",
                          "Classificação oficial no ranking",
                          "Acesso aos servidores públicos",
                          "Inventário personalizado",
                        ]
                    ).map((capability) => (
                      <div key={capability} className="flex items-center gap-2">
                        <PiCheck className={cn("h-3.5 w-3.5", user.subscriptionTier === "MARE" ? "text-[var(--mare-accent)]" : "text-[#11ff99]")} />
                        <span>{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── 5. AVATAR EDIT MODAL ── */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpdatingAvatar && setIsAvatarModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-sm rounded-[12px] bg-[#070b0e] border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col p-6 gap-5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-[14px] font-sans font-semibold text-white">
                  Alterar Foto de Perfil
                </span>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  disabled={isUpdatingAvatar}
                  className="text-stone-400 hover:text-white p-1"
                >
                  <PiX className="w-4 h-4" />
                </button>
              </div>

              {/* Current Avatar preview */}
              <div className="flex flex-col items-center gap-2">
                <Avatar
                  src={user.avatarUrl}
                  username={user.username}
                  size="xl"
                  isVerifiedPro={user.isVerifiedPro}
                  enableHovercard={false}
                  className="w-20 h-20 rounded-full object-cover"
                />
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingAvatar}
                  className="flex items-center justify-center gap-2 h-10 rounded-[6px] bg-white text-black font-sans font-medium text-[13px] hover:bg-stone-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingAvatar ? (
                    <PiSpinnerGap className="w-4 h-4 animate-spin" />
                  ) : (
                    <PiUploadSimple className="w-4 h-4" />
                  )}
                  <span>Fazer upload de foto</span>
                </button>

                {avatarUploadFeedback && (
                  <p
                    role="alert"
                    className={cn(
                      "rounded-[6px] border px-3 py-2 text-xs leading-5",
                      avatarUploadFeedback.type === "error"
                        ? "border-red-400/25 bg-red-400/[0.07] text-red-200"
                        : "border-[var(--kurage-accent)]/25 bg-[var(--kurage-accent)]/[0.07] text-[#c8e1d9]",
                    )}
                  >
                    {avatarUploadFeedback.text}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleChooseSteamAvatar}
                  disabled={isUpdatingAvatar}
                  className="flex items-center justify-center gap-2 h-10 rounded-[6px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-stone-300 hover:text-white font-sans font-medium text-[13px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <PiSteamLogo className="w-4 h-4 text-[var(--kurage-accent)]" />
                  <span>Escolher avatar da Steam</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {avatarCropSource && (
          <AvatarCropDialog
            imageUrl={avatarCropSource.previewUrl}
            sourceLabel={avatarCropSource.kind === "steam" ? "Avatar oficial da Steam" : "Nova foto de perfil"}
            isSaving={isUpdatingAvatar}
            onCancel={closeAvatarCropper}
            onSave={handleSaveAvatarCrop}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

// ── MINIMAL COUNTRY COMBOBOX (Trigger has ONLY flag icon + arrow down, NO border, NO background) ──
interface CountryComboboxMinimalProps {
  value: string;
  onChange: (countryCode: string) => void;
}

function CountryComboboxMinimal({ value, onChange }: CountryComboboxMinimalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedCountry = SUPPORTED_COUNTRIES.find((c) => c.code === value) || {
    code: value,
    name: value,
  };

  const filteredCountries = SUPPORTED_COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Minimal Trigger: Just Flag + Arrow, NO border, NO background */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 p-1 rounded transition-opacity hover:opacity-80 cursor-pointer bg-transparent border-0 focus:outline-none"
        title={`Alterar país (${selectedCountry.name})`}
      >
        <CountryFlag country={selectedCountry.code} />
        <PiCaretDown className="w-3 h-3 text-stone-400" />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-2 w-60 rounded-[8px] bg-[#070b0e] border border-white/[0.1] shadow-[0_16px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden flex flex-col"
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
              <PiMagnifyingGlass className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar país..."
                autoFocus
                className="w-full bg-transparent text-[13px] font-sans text-white placeholder:text-stone-500 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-stone-400 hover:text-white"
                >
                  <PiX className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto p-1 scrollbar-thin">
              {filteredCountries.map((c) => {
                const isSelected = c.code === value;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[13px] font-sans text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-stone-300 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CountryFlag country={c.code} />
                      <span>{c.name}</span>
                    </div>
                    {isSelected && <PiCheck className="w-3.5 h-3.5 text-[var(--kurage-accent)]" />}
                  </button>
                );
              })}

              {filteredCountries.length === 0 && (
                <div className="py-4 text-center text-[12px] text-stone-500 font-sans">
                  Nenhum país encontrado
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
