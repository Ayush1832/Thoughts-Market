'use client'

import { CheckCircle2Icon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Option sets (from the client's Creator Corner application spec) ──────────
const ELIGIBILITY = [
  'Minimum 70,000 followers/subscribers on at least one platform',
  'Minimum $5,000 cumulative trading/wagering volume on Thoughts Market',
  'Completed identity verification (KYC)',
  'Minimum age: 18 years',
  'Good standing with no major platform or community violations',
  'Public profile available for verification',
]

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Snapchat', 'X (Twitter)', 'Facebook', 'Twitch', 'Kick', 'Other']
const CATEGORIES = ['Sports', 'Politics', 'Geopolitics', 'Finance', 'Crypto', 'Entertainment', 'Celebrity News', 'Technology', 'Gaming', 'Real Estate', 'Business', 'Commodities', 'Science', 'Other']
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45+']

const IDENTITY_DOCS = [
  'Government-issued ID',
  'Selfie Verification',
  'Proof of Social Media Ownership',
  'Proof of Address (if requested)',
  'Additional documents requested by Compliance Team',
]

const DECLARATIONS = [
  'All information provided is accurate.',
  'I own or manage the social accounts submitted.',
  'I understand Thoughts Market may independently verify my audience and engagement metrics.',
  'I consent to account review and compliance checks.',
  'I understand approval is not guaranteed.',
  'I agree to comply with all Creator Rules and Community Guidelines.',
]

const STEPS = ['Eligibility', 'Personal', 'Social Media', 'Creator Profile', 'Community', 'Thoughts Market Activity', 'Identity', 'Declaration']

const INPUT_CLASS = `
  w-full rounded-xl border border-tm-border bg-tm-surface px-4 py-3 text-sm text-tm-primary transition-colors
  placeholder:text-tm-secondary/40
  focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:outline-none
`

interface FormState {
  // Personal
  fullLegalName: string
  displayName: string
  username: string
  email: string
  phone: string
  country: string
  dob: string
  language: string
  // Social
  primaryPlatform: string
  profileLink: string
  handle: string
  totalFollowers: string
  avgMonthlyViews: string
  engagementRate: string
  secondaryPlatform: string
  secondaryLink: string
  secondaryFollowers: string
  additionalPlatform: string
  additionalLink: string
  additionalFollowers: string
  // Creator profile
  categories: string[]
  aboutYou: string
  reason: string
  // Community
  audienceSize: string
  audienceCountry: string
  ageGroups: string[]
  monthlyReach: string
  workedWithBrands: string
  collaborations: string
  // Thoughts Market activity
  tsUsername: string
  accountAge: string
  totalVolume: string
  totalMarkets: string
  winRate: string
  referralCode: string
  // Identity verification + declaration
  identityDocs: string[]
  declarations: string[]
  signature: string
  signatureDate: string
}

const INITIAL_FORM: FormState = {
  fullLegalName: '',
  displayName: '',
  username: '',
  email: '',
  phone: '',
  country: '',
  dob: '',
  language: '',
  primaryPlatform: '',
  profileLink: '',
  handle: '',
  totalFollowers: '',
  avgMonthlyViews: '',
  engagementRate: '',
  secondaryPlatform: '',
  secondaryLink: '',
  secondaryFollowers: '',
  additionalPlatform: '',
  additionalLink: '',
  additionalFollowers: '',
  categories: [],
  aboutYou: '',
  reason: '',
  audienceSize: '',
  audienceCountry: '',
  ageGroups: [],
  monthlyReach: '',
  workedWithBrands: '',
  collaborations: '',
  tsUsername: '',
  accountAge: '',
  totalVolume: '',
  totalMarkets: '',
  winRate: '',
  referralCode: '',
  identityDocs: [],
  declarations: [],
  signature: '',
  signatureDate: new Date().toISOString().slice(0, 10),
}

// ─── Reusable bits ────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string, required?: boolean, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold tracking-wide text-tm-secondary uppercase">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      {children}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <Field label={label} required={required}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_CLASS)}
      />
    </Field>
  )
}

function ChipGroup({
  options,
  selected,
  onToggle,
  multi,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  multi?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onToggle(option)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
            selected.includes(option)
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-tm-border bg-tm-surface text-tm-secondary hover:bg-tm-elevated hover:text-tm-primary',
          )}
        >
          {multi && selected.includes(option) ? '✓ ' : ''}
          {option}
        </button>
      ))}
    </div>
  )
}

export default function CreatorApplicationForm({ onSubmit }: { onSubmit: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [agreed, setAgreed] = useState(false)
  const [acknowledgedEligibility, setAcknowledgedEligibility] = useState(false)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleInArray(key: 'categories' | 'ageGroups' | 'identityDocs' | 'declarations', value: string) {
    setForm((prev) => {
      const list = prev[key]
      return { ...prev, [key]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] }
    })
  }

  function setPrimaryPlatform(value: string) {
    update('primaryPlatform', form.primaryPlatform === value ? '' : value)
  }

  const isLast = step === STEPS.length - 1
  const canSubmit = form.displayName.trim().length >= 2
    && form.username.trim().length >= 3
    && form.categories.length > 0
    && form.reason.trim().length > 0
    && DECLARATIONS.every(d => form.declarations.includes(d))
    && form.signature.trim().length > 0
    && agreed

  async function handleSubmit() {
    if (!canSubmit) {
      setError('Please complete Display Name, Username, at least one Creator Category, your reason, and accept the terms.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { displayName, username, categories, profileLink, reason, ...rest } = form
      const res = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim(),
          niche: categories[0] ?? 'Other',
          socialLink: profileLink.trim() || undefined,
          reason: reason.trim(),
          details: { categories, profileLink: profileLink.trim(), ...rest },
        }),
      })
      if (!res.ok) {
        const { error: errMsg } = await res.json() as { error?: string }
        setError(errMsg ?? 'Submission failed. Please try again.')
        setSubmitting(false)
        return
      }
      onSubmit()
    }
    catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 space-y-2 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-3xl">
          ✨
        </div>
        <h2 className="text-2xl font-bold text-tm-primary">Creator Corner Application</h2>
        <p className="text-sm text-tm-secondary">Become a Verified Market Creator on Thoughts Market.</p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              'rounded-full px-3 py-1 text-2xs font-semibold transition-colors',
              index === step
                ? 'bg-primary text-white'
                : index < step
                  ? 'bg-primary/15 text-primary'
                  : 'bg-tm-elevated text-tm-secondary',
            )}
          >
            {index + 1}
            .
            {' '}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 rounded-2xl border border-tm-border bg-tm-surface/40 p-5 sm:p-6">
        {/* ── Step 0: Eligibility ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-tm-primary">Minimum Eligibility Requirements</h3>
            <p className="text-xs text-tm-secondary">To apply, you must meet ALL of the following:</p>
            <ul className="space-y-2">
              {ELIGIBILITY.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-tm-secondary">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <label className="
              flex cursor-pointer items-start gap-3 rounded-xl border border-tm-border bg-tm-elevated/50 p-4
            "
            >
              <input
                type="checkbox"
                checked={acknowledgedEligibility}
                onChange={e => setAcknowledgedEligibility(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-xs/relaxed text-tm-secondary">
                I confirm that I meet all of the eligibility requirements above.
              </span>
            </label>
          </div>
        )}

        {/* ── Step 1: Personal Information ── */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full Legal Name" required value={form.fullLegalName} onChange={v => update('fullLegalName', v)} placeholder="Jane Doe" />
            <TextField label="Display Name / Creator Name" required value={form.displayName} onChange={v => update('displayName', v)} placeholder="CryptoSage" />
            <TextField label="Username on Thoughts Market" required value={form.username} onChange={v => update('username', v.toLowerCase().replace(/[^a-z0-9._]/g, ''))} placeholder="yourhandle" />
            <TextField label="Email Address" required type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" />
            <TextField label="Phone Number" type="tel" value={form.phone} onChange={v => update('phone', v)} placeholder="+1 555 000 0000" />
            <TextField label="Country of Residence" value={form.country} onChange={v => update('country', v)} placeholder="United States" />
            <TextField label="Date of Birth" type="date" value={form.dob} onChange={v => update('dob', v)} />
            <TextField label="Preferred Language" value={form.language} onChange={v => update('language', v)} placeholder="English" />
          </div>
        )}

        {/* ── Step 2: Social Media Verification ── */}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="Primary Platform" required>
              <ChipGroup options={PLATFORMS} selected={form.primaryPlatform ? [form.primaryPlatform] : []} onToggle={setPrimaryPlatform} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Profile Link" required type="url" value={form.profileLink} onChange={v => update('profileLink', v)} placeholder="https://..." />
              <TextField label="Username / Handle" value={form.handle} onChange={v => update('handle', v)} placeholder="@handle" />
              <TextField label="Total Followers / Subscribers" value={form.totalFollowers} onChange={v => update('totalFollowers', v)} placeholder="e.g. 120,000" />
              <TextField label="Average Monthly Views" value={form.avgMonthlyViews} onChange={v => update('avgMonthlyViews', v)} placeholder="e.g. 500,000" />
              <TextField label="Average Engagement Rate" value={form.engagementRate} onChange={v => update('engagementRate', v)} placeholder="e.g. 4.5%" />
            </div>

            <div className="rounded-xl border border-tm-border bg-tm-elevated/30 p-4">
              <p className="mb-3 text-2xs font-bold tracking-wider text-tm-secondary/60 uppercase">Secondary Platform (optional)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Platform" value={form.secondaryPlatform} onChange={v => update('secondaryPlatform', v)} placeholder="YouTube" />
                <TextField label="Profile Link" value={form.secondaryLink} onChange={v => update('secondaryLink', v)} placeholder="https://..." />
                <TextField label="Followers" value={form.secondaryFollowers} onChange={v => update('secondaryFollowers', v)} placeholder="e.g. 40,000" />
              </div>
            </div>

            <div className="rounded-xl border border-tm-border bg-tm-elevated/30 p-4">
              <p className="mb-3 text-2xs font-bold tracking-wider text-tm-secondary/60 uppercase">Additional Platform (optional)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="Platform" value={form.additionalPlatform} onChange={v => update('additionalPlatform', v)} placeholder="TikTok" />
                <TextField label="Profile Link" value={form.additionalLink} onChange={v => update('additionalLink', v)} placeholder="https://..." />
                <TextField label="Followers" value={form.additionalFollowers} onChange={v => update('additionalFollowers', v)} placeholder="e.g. 25,000" />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Creator Profile ── */}
        {step === 3 && (
          <div className="space-y-4">
            <Field label="Creator Category" required>
              <ChipGroup multi options={CATEGORIES} selected={form.categories} onToggle={v => toggleInArray('categories', v)} />
            </Field>
            <Field label="Tell us about yourself">
              <textarea
                value={form.aboutYou}
                onChange={e => update('aboutYou', e.target.value)}
                rows={3}
                placeholder="Your background, expertise, and what makes you a credible voice..."
                className={cn(INPUT_CLASS, 'resize-none')}
              />
            </Field>
            <Field label="Why do you want to become a Creator?" required>
              <textarea
                value={form.reason}
                onChange={e => update('reason', e.target.value)}
                rows={3}
                placeholder="What markets you'd create and how you'd engage your audience..."
                className={cn(INPUT_CLASS, 'resize-none')}
              />
            </Field>
          </div>
        )}

        {/* ── Step 4: Community Data ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Audience Size Across All Platforms" value={form.audienceSize} onChange={v => update('audienceSize', v)} placeholder="e.g. 185,000" />
              <TextField label="Primary Audience Country" value={form.audienceCountry} onChange={v => update('audienceCountry', v)} placeholder="United States" />
              <TextField label="Estimated Monthly Reach" value={form.monthlyReach} onChange={v => update('monthlyReach', v)} placeholder="e.g. 2,000,000" />
            </div>
            <Field label="Audience Age Group">
              <ChipGroup multi options={AGE_GROUPS} selected={form.ageGroups} onToggle={v => toggleInArray('ageGroups', v)} />
            </Field>
            <Field label="Have you worked with brands before?">
              <ChipGroup options={['Yes', 'No']} selected={form.workedWithBrands ? [form.workedWithBrands] : []} onToggle={v => update('workedWithBrands', form.workedWithBrands === v ? '' : v)} />
            </Field>
            {form.workedWithBrands === 'Yes' && (
              <Field label="If yes, list major collaborations">
                <textarea
                  value={form.collaborations}
                  onChange={e => update('collaborations', e.target.value)}
                  rows={2}
                  placeholder="Brand names, campaigns..."
                  className={cn(INPUT_CLASS, 'resize-none')}
                />
              </Field>
            )}
          </div>
        )}

        {/* ── Step 5: Thoughts Market Activity + Terms + Submit ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Thoughts Market Username" value={form.tsUsername} onChange={v => update('tsUsername', v)} placeholder="yourhandle" />
              <TextField label="Account Age" value={form.accountAge} onChange={v => update('accountAge', v)} placeholder="e.g. 8 months" />
              <TextField label="Total Trading Volume" value={form.totalVolume} onChange={v => update('totalVolume', v)} placeholder="e.g. $12,400" />
              <TextField label="Total Markets Participated" value={form.totalMarkets} onChange={v => update('totalMarkets', v)} placeholder="e.g. 64" />
              <TextField label="Win Rate" value={form.winRate} onChange={v => update('winRate', v)} placeholder="e.g. 58%" />
              <TextField label="Creator Referral Code (if any)" value={form.referralCode} onChange={v => update('referralCode', v)} placeholder="CODE123" />
            </div>

          </div>
        )}

        {/* ── Step 6: Identity Verification ── */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-tm-primary">Identity Verification</h3>
            <p className="text-xs text-tm-secondary">
              Select the documents you can provide. Our Compliance Team will request secure uploads after your
              application is reviewed.
            </p>
            <div className="space-y-2">
              {IDENTITY_DOCS.map(doc => (
                <label
                  key={doc}
                  className="
                    flex cursor-pointer items-center gap-3 rounded-xl border border-tm-border bg-tm-surface p-3 text-sm
                    text-tm-secondary
                    hover:bg-tm-elevated
                  "
                >
                  <input
                    type="checkbox"
                    checked={form.identityDocs.includes(doc)}
                    onChange={() => toggleInArray('identityDocs', doc)}
                    className="accent-primary"
                  />
                  <span>{doc}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 7: Creator Declaration + Terms + Submit ── */}
        {step === 7 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-tm-primary">Creator Declaration</h3>
            <p className="text-xs text-tm-secondary">I certify that:</p>
            <div className="space-y-2">
              {DECLARATIONS.map(item => (
                <label
                  key={item}
                  className="
                    flex cursor-pointer items-start gap-3 rounded-xl border border-tm-border bg-tm-surface p-3
                    text-xs/relaxed text-tm-secondary
                    hover:bg-tm-elevated
                  "
                >
                  <input
                    type="checkbox"
                    checked={form.declarations.includes(item)}
                    onChange={() => toggleInArray('declarations', item)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Signature (type your full name)" required value={form.signature} onChange={v => update('signature', v)} placeholder="Jane Doe" />
              <TextField label="Date" type="date" value={form.signatureDate} onChange={v => update('signatureDate', v)} />
            </div>

            <label className="
              flex cursor-pointer items-start gap-3 rounded-xl border border-tm-border bg-tm-elevated/50 p-4
            "
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-xs/relaxed text-tm-secondary">
                I agree to the
                {' '}
                <span className="text-primary">Creator Corner Terms &amp; Conditions</span>
                {' '}
                and the Community Guidelines.
              </span>
            </label>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(s => Math.max(0, s - 1))}
            className="
              rounded-xl border border-tm-border bg-tm-surface px-5 py-3 text-sm font-semibold text-tm-secondary
              transition-colors
              hover:bg-tm-elevated hover:text-tm-primary
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            ← Back
          </button>

          {isLast
            ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="
                    flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold
                    text-white shadow-lg shadow-primary/25 transition-all duration-200
                    hover:-translate-y-px hover:shadow-xl hover:shadow-primary/35
                    disabled:cursor-not-allowed disabled:opacity-40
                    disabled:hover:translate-y-0
                  "
                >
                  {submitting
                    ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Submitting application...
                        </>
                      )
                    : '🚀 Submit Application'}
                </button>
              )
            : (
                <button
                  type="button"
                  disabled={step === 0 && !acknowledgedEligibility}
                  onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                  className="
                    flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25
                    transition-all duration-200
                    hover:-translate-y-px hover:shadow-xl hover:shadow-primary/35
                    disabled:cursor-not-allowed disabled:opacity-40
                    disabled:hover:translate-y-0
                  "
                >
                  Continue →
                </button>
              )}
        </div>
      </div>
    </div>
  )
}
