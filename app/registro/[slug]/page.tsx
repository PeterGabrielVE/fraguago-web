'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Flame from '@/components/Flame';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PhoneField, { isValidPhone } from '@/components/PhoneField';
import PasswordInput from '@/components/PasswordInput';
import InfoTip from '@/components/InfoTip';
import { useT } from '@/components/I18nProvider';
import { activityOptions, preferredTimeOptions, relationshipOptions } from '@/lib/memberOptions';

// Mínimo que exige el API para la contraseña.
const MIN_PASSWORD_LENGTH = 8;

// text-base en móvil: con menos de 16px iOS hace zoom al enfocar. min-w-0 y
// appearance-none evitan que el input date de iOS se salga de su columna.
const inputClass =
  'block h-10 w-full min-w-0 max-w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal outline-none sm:text-sm ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition disabled:cursor-not-allowed disabled:bg-slate-50';

type Details = {
  firstName: string; lastName: string; identificationNumber: string; email: string;
  password: string; confirmPassword: string; phone: string; birthDate: string;
  address: string; activityLevel: string; preferredTime: string;
};

type HealthDraft = {
  hypertension: boolean; diabetes: boolean; heartProblems: boolean; asthma: boolean;
  otherConditions: string; hasInjury: boolean; injuryDescription: string;
  takesMedication: boolean; medicationDescription: string;
};

type ContactDraft = { name: string; phone: string; relationship: string };

const EMPTY_HEALTH: HealthDraft = {
  hypertension: false, diabetes: false, heartProblems: false, asthma: false,
  otherConditions: '', hasInjury: false, injuryDescription: '',
  takesMedication: false, medicationDescription: '',
};

// Pasos del asistente, en orden. El último envía la inscripción.
const STEPS = ['personal', 'account', 'health', 'emergency'] as const;

// Formulario público de inscripción: el gym comparte /registro/<slug> y el
// socio llena su ficha desde el celular. No requiere sesión. Acepta también
// el id del gym (enlaces viejos); el API resuelve ambos.
export default function PublicSignupPage() {
  const t = useT();
  const { slug } = useParams<{ slug: string }>();
  const [gymName, setGymName] = useState<string | null>(null);
  const [gymError, setGymError] = useState('');
  const [details, setDetails] = useState<Details>({
    firstName: '', lastName: '', identificationNumber: '', email: '',
    password: '', confirmPassword: '', phone: '', birthDate: '',
    address: '', activityLevel: '', preferredTime: '',
  });
  const [health, setHealth] = useState<HealthDraft>(EMPTY_HEALTH);
  const [contact, setContact] = useState<ContactDraft>({ name: '', phone: '', relationship: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Candado síncrono contra doble envío (ver la pantalla de asistencia).
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/public/members/${encodeURIComponent(slug)}`)
      .then((gym: { name: string }) => setGymName(gym.name))
      .catch(() => setGymError(t('members.signup.invalidLink')));
  }, [slug]);

  function updateDetails(key: keyof Details, value: string) { setDetails((d) => ({ ...d, [key]: value })); }
  function updateHealth<K extends keyof HealthDraft>(key: K, value: HealthDraft[K]) { setHealth((h) => ({ ...h, [key]: value })); }
  function updateContact(key: keyof ContactDraft, value: string) { setContact((c) => ({ ...c, [key]: value })); }

  function fail(message: string) {
    setError(message);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }

  const contactStarted = Boolean(contact.name || contact.phone || contact.relationship);

  // Validaciones que el navegador no cubre con required/minLength. Solo se
  // renderizan los campos del paso actual, así que la validación nativa del
  // <form> ya se limita a ese paso.
  function stepError(index: number): string | null {
    const key = STEPS[index];
    if (key === 'personal' && details.phone && !isValidPhone(details.phone)) return t('members.create.errPhone');
    if (key === 'account') {
      if (details.password.length < MIN_PASSWORD_LENGTH) return t('members.signup.errPasswordShort', { min: MIN_PASSWORD_LENGTH });
      if (details.password !== details.confirmPassword) return t('members.signup.errPasswordMatch');
    }
    if (key === 'emergency' && contactStarted) {
      if (!contact.name.trim() || !contact.phone || !contact.relationship) return t('members.create.errContactIncomplete');
      if (!isValidPhone(contact.phone)) return t('members.create.errContactPhone');
    }
    return null;
  }

  function goTo(index: number) {
    setError('');
    setStep(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError('');

    const message = stepError(step);
    if (message) return fail(message);
    if (step < STEPS.length - 1) return goTo(step + 1);

    const hasHealthData = Object.values(health).some((v) => v === true || (typeof v === 'string' && v.trim() !== ''));

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await api.post(`/public/members/${encodeURIComponent(slug)}/register`, {
        firstName: details.firstName,
        lastName: details.lastName,
        identificationNumber: details.identificationNumber,
        email: details.email,
        password: details.password,
        phone: details.phone || undefined,
        birthDate: details.birthDate || undefined,
        address: details.address || undefined,
        activityLevel: details.activityLevel || undefined,
        preferredTime: details.preferredTime || undefined,
        medicalProfile: hasHealthData ? {
          hypertension: health.hypertension,
          diabetes: health.diabetes,
          heartProblems: health.heartProblems,
          asthma: health.asthma,
          otherConditions: health.otherConditions.trim() || undefined,
          hasInjury: health.hasInjury,
          injuryDescription: health.hasInjury ? health.injuryDescription.trim() || undefined : undefined,
          takesMedication: health.takesMedication,
          medicationDescription: health.takesMedication ? health.medicationDescription.trim() || undefined : undefined,
        } : undefined,
        emergencyContact: contactStarted ? { ...contact, name: contact.name.trim() } : undefined,
      }) as { firstName: string | null };
      setDoneName(result.firstName ?? details.firstName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      fail(requestError instanceof Error ? requestError.message : t('members.signup.failed'));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const disabled = loading || !gymName;

  return (
    <main className="theme-static min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
              <Flame size={11} color="#fff" />
            </span>
            Fragua<span className="text-amber-500">Go</span>
          </div>
          {gymName && <p className="text-lg font-semibold text-slate-700">{gymName}</p>}
        </div>

        <Card className="border-0 shadow-xl">
          <div className="p-6 sm:p-10">
            {gymError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{gymError}</AlertDescription>
              </Alert>
            ) : doneName !== null ? (
              <div className="space-y-5 text-center" role="status" aria-live="polite">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">{t('members.signup.successTitle', { name: doneName })}</h1>
                  <p className="text-sm leading-6 text-slate-600">{t('members.signup.successText')}</p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-amber-600 hover:to-amber-700"
                >
                  {t('members.signup.goToLogin')}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8 space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-slate-900">{t('members.signup.title')}</h1>
                  <p className="text-sm leading-6 text-slate-600">{t('members.signup.intro')}</p>
                </div>

                <Stepper current={step} onSelect={(index) => index < step && goTo(index)} />

                <form onSubmit={submit} className="space-y-8">
                  {STEPS[step] === 'personal' && (
                    <Section title={t('members.signup.personalData')}>
                      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <TextField label={t('members.fields.firstName')} tip={t('members.signup.tips.firstName')} required autoComplete="given-name" maxLength={80} value={details.firstName} onChange={(v) => updateDetails('firstName', v)} disabled={disabled} />
                        <TextField label={t('members.fields.lastName')} tip={t('members.signup.tips.lastName')} required autoComplete="family-name" maxLength={80} value={details.lastName} onChange={(v) => updateDetails('lastName', v)} disabled={disabled} />
                        <TextField label={t('members.fields.idNumber')} tip={t('members.signup.tips.idNumber')} required inputMode="numeric" autoComplete="off" maxLength={30} value={details.identificationNumber} onChange={(v) => updateDetails('identificationNumber', v)} disabled={disabled} />
                        <TextField label={t('members.fields.birthDate')} tip={t('members.signup.tips.birthDate')} type="date" value={details.birthDate} onChange={(v) => updateDetails('birthDate', v)} disabled={disabled} />
                        <Field label={t('members.fields.phone')} tip={t('members.signup.tips.phone')}>
                          <PhoneField value={details.phone} onChange={(v) => updateDetails('phone', v)} />
                        </Field>
                        <TextField label={t('members.fields.address')} tip={t('members.signup.tips.address')} autoComplete="street-address" maxLength={200} value={details.address} onChange={(v) => updateDetails('address', v)} disabled={disabled} />
                        <SelectField label={t('members.fields.activityLevel')} tip={t('members.signup.tips.activityLevel')} value={details.activityLevel} options={activityOptions} onChange={(v) => updateDetails('activityLevel', v)} disabled={disabled} />
                        <SelectField label={t('members.fields.preferredTime')} tip={t('members.signup.tips.preferredTime')} value={details.preferredTime} options={preferredTimeOptions} onChange={(v) => updateDetails('preferredTime', v)} disabled={disabled} />
                      </div>
                    </Section>
                  )}

                  {STEPS[step] === 'account' && (
                    <Section title={t('members.signup.account')} hint={t('members.signup.accountHint')}>
                      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <TextField label={t('members.fields.email')} tip={t('members.signup.tips.email')} type="email" required autoComplete="email" maxLength={120} value={details.email} onChange={(v) => updateDetails('email', v)} disabled={disabled} />
                        </div>
                        <TextField label={t('members.fields.passwordMin')} tip={t('members.signup.tips.password')} type="password" required autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} maxLength={72} value={details.password} onChange={(v) => updateDetails('password', v)} disabled={disabled} />
                        <TextField label={t('members.signup.confirmPassword')} tip={t('members.signup.tips.confirmPassword')} type="password" required autoComplete="new-password" maxLength={72} value={details.confirmPassword} onChange={(v) => updateDetails('confirmPassword', v)} disabled={disabled} />
                      </div>
                    </Section>
                  )}

                  {STEPS[step] === 'health' && (
                    <Section title={t('members.tabs.health')} hint={t('members.signup.healthHint')}>
                      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <CheckboxField label={t('members.health.hypertension')} checked={health.hypertension} onChange={(v) => updateHealth('hypertension', v)} disabled={disabled} />
                        <CheckboxField label={t('members.health.diabetes')} checked={health.diabetes} onChange={(v) => updateHealth('diabetes', v)} disabled={disabled} />
                        <CheckboxField label={t('members.health.heartProblems')} checked={health.heartProblems} onChange={(v) => updateHealth('heartProblems', v)} disabled={disabled} />
                        <CheckboxField label={t('members.health.asthma')} checked={health.asthma} onChange={(v) => updateHealth('asthma', v)} disabled={disabled} />
                      </div>
                      <TextField label={t('members.health.otherConditions')} tip={t('members.signup.tips.otherConditions')} multiline maxLength={1000} value={health.otherConditions} onChange={(v) => updateHealth('otherConditions', v)} disabled={disabled} />
                      <CheckboxField label={t('members.health.hasInjury')} checked={health.hasInjury} onChange={(v) => updateHealth('hasInjury', v)} disabled={disabled} />
                      {health.hasInjury && <TextField label={t('members.health.injuryDescription')} tip={t('members.signup.tips.injuryDescription')} multiline maxLength={1000} value={health.injuryDescription} onChange={(v) => updateHealth('injuryDescription', v)} disabled={disabled} />}
                      <CheckboxField label={t('members.health.takesMedication')} checked={health.takesMedication} onChange={(v) => updateHealth('takesMedication', v)} disabled={disabled} />
                      {health.takesMedication && <TextField label={t('members.health.medicationDescription')} tip={t('members.signup.tips.medicationDescription')} multiline maxLength={1000} value={health.medicationDescription} onChange={(v) => updateHealth('medicationDescription', v)} disabled={disabled} />}
                    </Section>
                  )}

                  {STEPS[step] === 'emergency' && (
                    <>
                      <Section title={t('members.tabs.emergency')} hint={t('members.signup.emergencyHint')}>
                        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                          <TextField label={t('members.fields.name')} tip={t('members.signup.tips.contactName')} maxLength={120} value={contact.name} onChange={(v) => updateContact('name', v)} disabled={disabled} />
                          <SelectField label={t('members.fields.relationship')} tip={t('members.signup.tips.relationship')} value={contact.relationship} options={relationshipOptions} onChange={(v) => updateContact('relationship', v)} disabled={disabled} />
                          <Field label={t('members.fields.phone')} tip={t('members.signup.tips.contactPhone')}>
                            <PhoneField value={contact.phone} onChange={(v) => updateContact('phone', v)} />
                          </Field>
                        </div>
                      </Section>

                      <label className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-slate-700">
                        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" />
                        <span>{t('members.signup.consent')}<span className="text-red-500"> *</span></span>
                      </label>
                    </>
                  )}

                  {error && (
                    <div ref={errorRef}>
                      <Alert variant="destructive" className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {step > 0 && (
                      <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={loading} className="flex-1 py-2 text-base">
                        <ChevronLeft className="h-4 w-4" />{t('members.signup.back')}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={disabled}
                      className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-600 py-2 text-base font-semibold transition-all hover:from-amber-600 hover:to-amber-700"
                    >
                      {step < STEPS.length - 1 ? (
                        <>{t('members.signup.next')}<ChevronRight className="h-4 w-4" /></>
                      ) : loading ? t('members.signup.sending') : t('members.signup.submit')}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

// Indicador de pasos: círculos numerados (los ya hechos se pueden pulsar
// para volver) y, en el celular, "Paso X de Y" con una barra de progreso.
function Stepper({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  const t = useT();
  const labels = [t('members.signup.stepPersonal'), t('members.signup.stepAccount'), t('members.tabs.health'), t('members.signup.stepEmergency')];
  const stepOf = t('members.signup.stepOf', { current: current + 1, total: STEPS.length });
  return (
    <nav aria-label={stepOf} className="mb-8">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-amber-600 sm:hidden">
        {stepOf} · {labels[current]}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 sm:hidden">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="hidden items-center sm:flex">
        {labels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className={`flex items-center ${index < labels.length - 1 ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                className="flex items-center gap-2 disabled:cursor-default"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  done ? 'bg-amber-500 text-white' : active ? 'border-2 border-amber-500 text-amber-600' : 'border-2 border-slate-200 text-slate-400'
                }`}>
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`whitespace-nowrap text-sm font-medium ${active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
              </button>
              {index < labels.length - 1 && <span className={`mx-3 h-px flex-1 ${done ? 'bg-amber-500' : 'bg-slate-200'}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// La etiqueta va con htmlFor (no envolviendo el campo) para que el botón de
// ayuda quede fuera del <label>: dentro, el label apuntaría al botón y no al
// input. Sin htmlFor (p. ej. el teléfono, con dos controles que ya tienen
// aria-label) el texto es un simple span.
function Field({
  label, required = false, tip, htmlFor, children,
}: { label: string; required?: boolean; tip?: string; htmlFor?: string; children: React.ReactNode }) {
  const text = <>{label}{required && <span className="text-red-500"> *</span>}</>;
  return (
    <div className="mb-4 min-w-0 text-sm font-medium text-slate-700">
      <div className="mb-1.5 flex items-center gap-1.5">
        {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : <span>{text}</span>}
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </div>
  );
}

function TextField({
  label, value, onChange, required = false, multiline = false, type = 'text', disabled = false,
  autoComplete, inputMode, minLength, maxLength, tip,
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean;
  multiline?: boolean; type?: 'text' | 'email' | 'password' | 'date'; disabled?: boolean;
  autoComplete?: string; inputMode?: 'numeric' | 'text'; minLength?: number; maxLength?: number; tip?: string;
}) {
  const id = useId();
  return (
    <Field label={label} required={required} tip={tip} htmlFor={id}>
      {type === 'password' ? (
        <PasswordInput
          id={id}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : multiline ? (
        <textarea id={id} required={required} disabled={disabled} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} h-auto min-h-24`} />
      ) : (
        <input
          id={id}
          type={type}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </Field>
  );
}

function SelectField({
  label, value, options, onChange, disabled = false, tip,
}: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; disabled?: boolean; tip?: string }) {
  const t = useT();
  const id = useId();
  return (
    <Field label={label} tip={tip} htmlFor={id}>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{t('common.select')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function CheckboxField({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-amber-600" />
      {label}
    </label>
  );
}
