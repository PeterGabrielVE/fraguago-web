'use client';
import { useEffect, useRef, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import PasswordInput from '@/components/PasswordInput';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useI18n } from '@/components/I18nProvider';

const ROLE_KEYS = {
  OWNER: 'labels.role.OWNER',
  ADMIN: 'labels.role.ADMIN',
  TRAINER: 'labels.role.TRAINER',
  STAFF: 'labels.role.STAFF',
  MEMBER: 'labels.role.MEMBER',
} as const;
const ROLE_LABELS: Record<string, string> = localizedRecord(ROLE_KEYS);
const ROLE_OPTIONS = localizedOptions(ROLE_KEYS);
// Mismo orden que en el API: de mayor a menor jerarquía.
const ROLE_ORDER = Object.keys(ROLE_KEYS);

// Roles del usuario; los creados antes de los roles múltiples solo traen `role`.
function rowRoles(row: { role?: string; roles?: string[] }): string[] {
  const set = new Set([...(row.roles ?? []), ...(row.role ? [row.role] : [])]);
  return ROLE_ORDER.filter((r) => set.has(r));
}

// El rol Socio necesita ficha de socio (se da de alta en Socios) y el de
// Propietario solo lo puede dar otro propietario.
function roleDisabled(role: string, current: string[], isOwner: boolean) {
  if (role === 'MEMBER') return !current.includes('MEMBER');
  if (role === 'OWNER') return !isOwner;
  return false;
}

function RolesPicker({ initial, isOwner, onChange }: { initial: string[]; isOwner: boolean; onChange: (roles: string[]) => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>(initial);

  useEffect(() => { onChange(selected); }, [selected, onChange]);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLE_OPTIONS.map((o) => {
          const checked = selected.includes(o.value);
          const disabled = roleDisabled(o.value, initial, isOwner);
          return (
            <label
              key={o.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                checked ? 'border-amber-400 bg-amber-50 text-slate-900' : 'border-slate-200 text-slate-700'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-amber-300'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => setSelected((prev) => (
                  e.target.checked
                    ? ROLE_ORDER.filter((r) => r === o.value || prev.includes(r))
                    : prev.filter((r) => r !== o.value)
                ))}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {selected.length === 0 && <p role="alert" className="text-xs text-red-600">{t('admin.users.rolesRequired')}</p>}
      <p className="text-xs text-slate-500">{t('admin.users.rolesHint')}</p>
    </div>
  );
}

const PREFERRED_TIME_OPTIONS = localizedOptions({
  MAÑANA: 'labels.preferredTime.MAÑANA',
  TARDE: 'labels.preferredTime.TARDE',
  NOCHE: 'labels.preferredTime.NOCHE',
  OTROS: 'labels.preferredTime.OTROS',
});

const MIN_PASSWORD = 7;

type UserRow = { id: string; email?: string; profile?: { firstName?: string; lastName?: string } };

function displayName(row: UserRow) {
  return `${row.profile?.firstName ?? ''} ${row.profile?.lastName ?? ''}`.trim() || row.email || '';
}

// Valida nueva contraseña + confirmación; null si está bien.
function passwordError(password: string, confirm: string, t: ReturnType<typeof useI18n>['t']) {
  if (password.length < MIN_PASSWORD) return t('admin.users.passwordTooShort');
  if (password !== confirm) return t('admin.users.passwordMismatch');
  return null;
}

function ChangePasswordDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const error = passwordError(password, confirm, t);
  // El aviso de "no coinciden" aparece al escribir la confirmación, no antes.
  const showError = touched || (confirm.length > 0 && password.length > 0);

  function close() {
    setPassword(''); setConfirm(''); setTouched(false);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!user || error) return;
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}/password`, { password, confirmPassword: confirm });
      toast.add({ title: t('admin.users.passwordChanged'), type: 'success' });
      close();
    } catch (err) {
      toast.add({ title: t('admin.users.passwordChangeFailed'), description: err instanceof Error ? err.message : undefined, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

  return (
    <Dialog open={Boolean(user)} onOpenChange={(nextOpen) => { if (!nextOpen && !saving) close(); }}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('admin.users.changePassword')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.changePasswordFor', { name: user ? displayName(user) : '' })} {t('admin.users.passwordSessionsNote')}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t('admin.users.newPassword')}<span className="text-red-500"> *</span>
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">{t('admin.users.passwordMin')}</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              {t('admin.users.confirmPassword')}<span className="text-red-500"> *</span>
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={showError && Boolean(error)}
              aria-describedby={showError && error ? 'password-error' : undefined}
              className={inputClass}
            />
            {showError && error && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(error)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition disabled:opacity-60"
            >
              {saving ? t('common.processing') : t('admin.users.changePassword')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const { t, intlLocale } = useI18n();
  // Roles marcados en el diálogo de "Roles", por fila.
  const roleDraft = useRef<Record<string, string[]>>({});
  const isOwner = getRole()?.toUpperCase() === 'OWNER';
  // Al crear no se ofrece Socio (va por Socios) ni Propietario si no lo eres.
  const createRoleOptions = ROLE_OPTIONS.filter((o) => !roleDisabled(o.value, [], isOwner));
  const [passwordTarget, setPasswordTarget] = useState<UserRow | null>(null);

  return (
    <>
      <ResourceManager
        title={t('admin.users.title')}
        icon={ShieldCheck}
        endpoint="/users"
        formVariant="modal"
        columns={[
          { key: 'profile', label: t('admin.users.name'), render: (r) => `${r.profile?.firstName ?? ''} ${r.profile?.lastName ?? ''}`.trim() || '—' },
          { key: 'email', label: t('admin.users.email'), render: (r) => r.email || '—' },
          {
            key: 'role',
            label: t('admin.users.roles'),
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {rowRoles(r).map((role) => (
                  <Badge key={role} variant={role === 'OWNER' || role === 'ADMIN' ? 'default' : 'secondary'}>
                    {ROLE_LABELS[role] ?? role}
                  </Badge>
                ))}
              </div>
            ),
          },
          { key: 'phone', label: t('admin.users.phone'), render: (r) => r.profile?.phone || '—' },
          { key: 'createdAt', label: t('admin.users.created'), render: (r) => new Date(r.createdAt).toLocaleDateString(intlLocale) },
        ]}
        getEditValues={(row) => ({
          firstName: row.profile?.firstName ?? '',
          lastName: row.profile?.lastName ?? '',
          phone: row.profile?.phone ?? '',
          address: row.profile?.address ?? '',
          preferredTime: row.profile?.preferredTime ?? '',
        })}
        fields={[
          { name: 'firstName', label: t('admin.users.firstName'), required: true, requiredOnEdit: true },
          { name: 'lastName', label: t('admin.users.lastName') },
          { name: 'email', label: t('admin.users.emailField'), type: 'email', required: true, createOnly: true },
          { name: 'password', label: t('admin.users.password'), type: 'password', required: true, createOnly: true, hint: t('admin.users.passwordMin') },
          { name: 'confirmPassword', label: t('admin.users.confirmPassword'), type: 'password', required: true, createOnly: true },
          { name: 'roles', label: t('admin.users.roles'), type: 'multiselect', options: createRoleOptions, required: true, createOnly: true, hint: t('admin.users.rolesHint') },
          { name: 'phone', label: t('admin.users.phone'), type: 'phone' },
          { name: 'address', label: t('admin.users.address'), editOnly: true },
          { name: 'preferredTime', label: t('admin.users.preferredTime'), type: 'select', options: PREFERRED_TIME_OPTIONS, editOnly: true },
        ]}
        // Solo aplica al crear: al editar estos campos no están en el formulario.
        validate={(form) => {
          if (form.password === undefined) return null;
          if (!Array.isArray(form.roles) || form.roles.length === 0) return t('admin.users.rolesRequired');
          return passwordError(form.password ?? '', form.confirmPassword ?? '', t);
        }}
        extraActions={(row) => [
          {
            label: t('admin.users.changePassword'),
            icon: KeyRound,
            silent: true,
            onClick: () => setPasswordTarget(row as UserRow),
          },
          {
            label: t('admin.users.editRoles'),
            icon: ShieldCheck,
            confirm: true,
            confirmTitle: t('admin.users.editRoles'),
            confirmDescription: (
              <div className="space-y-3 text-sm">
                <p>{t('admin.users.rolesFor', { name: displayName(row as UserRow) })}</p>
                <RolesPicker
                  initial={rowRoles(row)}
                  isOwner={isOwner}
                  onChange={(roles) => { roleDraft.current[row.id] = roles; }}
                />
              </div>
            ),
            onClick: async () => {
              const roles = roleDraft.current[row.id] ?? rowRoles(row);
              if (roles.length === 0) throw new Error(t('admin.users.rolesRequired'));
              await api.patch(`/users/${row.id}/roles`, { roles });
            },
          },
        ]}
      />
      <ChangePasswordDialog user={passwordTarget} onClose={() => setPasswordTarget(null)} />
    </>
  );
}
