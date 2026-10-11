import { Briefcase, Crown, Dumbbell, ShieldCheck, User } from 'lucide-react';

// Icono, nombre y descripción de cada rol, en orden de jerarquía (igual que el API).
export const ROLE_META = {
  OWNER: { icon: Crown, name: 'labels.role.OWNER', hint: 'login.roleHint.OWNER' },
  ADMIN: { icon: ShieldCheck, name: 'labels.role.ADMIN', hint: 'login.roleHint.ADMIN' },
  TRAINER: { icon: Dumbbell, name: 'labels.role.TRAINER', hint: 'login.roleHint.TRAINER' },
  STAFF: { icon: Briefcase, name: 'labels.role.STAFF', hint: 'login.roleHint.STAFF' },
  MEMBER: { icon: User, name: 'labels.role.MEMBER', hint: 'login.roleHint.MEMBER' },
} as const;

export type RoleKey = keyof typeof ROLE_META;

export function isRoleKey(role: string): role is RoleKey {
  return role in ROLE_META;
}
