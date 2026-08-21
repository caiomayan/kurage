import { z } from "zod";
import type { User, InGameFunction, ManagementRole, TeamRole } from "./user";
export type { User, InGameFunction, ManagementRole, TeamRole };

export interface TeamMember {
  id: string;
  user: User;
  teamRole: TeamRole;
  teamFunction?: InGameFunction | null;
  managementRole: ManagementRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  country?: string | null;
  teamElo: number;
  owner: User;
  createdAt: string;
  members: TeamMember[];
}

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  requester: User;
  desiredRole: TeamRole;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: User | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface TeamInviteLink {
  id: string;
  teamId: string;
  teamName: string;
  teamTag: string;
  token: string;
  targetRole?: TeamRole | null;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  team: Team;
  invitedUser: User;
  inviterUser: User;
  targetRole: TeamRole;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  updatedAt?: string | null;
}

// ----------------------------------------------------
// UI Labels & Color mappings
// ----------------------------------------------------
export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  PLAYER: "Titular",
  SUBSTITUTE: "Reserva",
  COACH: "Treinador (Coach)",
  ASSISTANT_COACH: "Assistente Técnico",
};

export const TEAM_ROLE_SHORT_LABELS: Record<TeamRole, string> = {
  PLAYER: "Titular",
  SUBSTITUTE: "Reserva",
  COACH: "Coach",
  ASSISTANT_COACH: "Assistant",
};

export const MANAGEMENT_ROLE_LABELS: Record<ManagementRole, string> = {
  OWNER: "Fundador / Dono",
  ADMIN: "Capitão / Admin",
  MEMBER: "Membro",
};

// ----------------------------------------------------
// Validation Schemas (Zod)
// ----------------------------------------------------
export const createTeamJoinRequestSchema = z.object({
  desiredRole: z.enum(["PLAYER", "SUBSTITUTE", "COACH", "ASSISTANT_COACH"] as const, {
    message: "Selecione uma função pretendida válida.",
  }),
});

export type CreateTeamJoinRequestForm = z.infer<typeof createTeamJoinRequestSchema>;

export const createInviteLinkSchema = z.object({
  targetRole: z.enum(["PLAYER", "SUBSTITUTE", "COACH", "ASSISTANT_COACH"] as const).optional(),
  expiresInDays: z
    .number()
    .int()
    .min(1, "A validade mínima é 1 dia.")
    .max(7, "A validade máxima é 7 dias."),
  maxUses: z
    .number()
    .int()
    .min(1, "O limite mínimo é 1 uso.")
    .max(10, "O limite máximo é 10 usos."),
});

export type CreateInviteLinkForm = z.infer<typeof createInviteLinkSchema>;

export const directInviteSchema = z.object({
  steamId64: z
    .string()
    .regex(/^\d{17}$/, "SteamID64 inválido (deve conter 17 dígitos numéricos)."),
  targetRole: z.enum(["PLAYER", "SUBSTITUTE", "COACH", "ASSISTANT_COACH"] as const, {
    message: "Selecione uma função pretendida para o convite.",
  }),
});

export type DirectInviteForm = z.infer<typeof directInviteSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["PLAYER", "SUBSTITUTE", "COACH", "ASSISTANT_COACH"] as const),
});

export const updateMemberFunctionSchema = z.object({
  function: z.enum(["IGL", "AWPER", "ENTRY", "SUPPORT", "LURKER", "CORINGA"] as const),
});

// ----------------------------------------------------
// Business Logic Rules & Helpers
// ----------------------------------------------------
export const MAX_PLAYERS = 5;
export const MAX_SUBSTITUTES = 2;
export const MAX_COACHES = 1;
export const MAX_ASSISTANT_COACHES = 1;

export interface TeamComposition {
  players: TeamMember[];
  substitutes: TeamMember[];
  coach: TeamMember | null;
  assistantCoach: TeamMember | null;
  others: TeamMember[];
}

export function categorizeTeamMembers(members: TeamMember[] = []): TeamComposition {
  const composition: TeamComposition = {
    players: [],
    substitutes: [],
    coach: null,
    assistantCoach: null,
    others: [],
  };

  for (const member of members) {
    if (member.teamRole === "PLAYER") {
      composition.players.push(member);
    } else if (member.teamRole === "SUBSTITUTE") {
      composition.substitutes.push(member);
    } else if (member.teamRole === "COACH") {
      if (!composition.coach) {
        composition.coach = member;
      } else {
        composition.others.push(member);
      }
    } else if (member.teamRole === "ASSISTANT_COACH") {
      if (!composition.assistantCoach) {
        composition.assistantCoach = member;
      } else {
        composition.others.push(member);
      }
    } else {
      composition.others.push(member);
    }
  }

  return composition;
}

export function canAddRole(members: TeamMember[] = [], targetRole: TeamRole): boolean {
  const { players, substitutes, coach, assistantCoach } = categorizeTeamMembers(members);
  switch (targetRole) {
    case "PLAYER":
      return players.length < MAX_PLAYERS;
    case "SUBSTITUTE":
      return substitutes.length < MAX_SUBSTITUTES;
    case "COACH":
      return coach === null;
    case "ASSISTANT_COACH":
      return assistantCoach === null;
    default:
      return false;
  }
}

export function canManageTeam(currentUserId: string | undefined, team: Team | null): boolean {
  if (!currentUserId || !team) return false;
  if (team.owner?.id === currentUserId) return true;
  const currentMember = team.members?.find((m) => m.user?.id === currentUserId);
  return currentMember?.managementRole === "OWNER" || currentMember?.managementRole === "ADMIN";
}

export function isTeamOwner(currentUserId: string | undefined, team: Team | null): boolean {
  if (!currentUserId || !team) return false;
  if (team.owner?.id === currentUserId) return true;
  const currentMember = team.members?.find((m) => m.user?.id === currentUserId);
  return currentMember?.managementRole === "OWNER";
}

export function isInviteLinkActive(link: TeamInviteLink | null | undefined): boolean {
  if (!link) return false;
  if (!link.isActive) return false;
  if (typeof link.currentUses === "number" && typeof link.maxUses === "number" && link.currentUses >= link.maxUses) {
    return false;
  }
  if (link.expiresAt) {
    const time = new Date(link.expiresAt).getTime();
    if (isNaN(time) || time <= Date.now()) {
      return false;
    }
  }
  return true;
}

