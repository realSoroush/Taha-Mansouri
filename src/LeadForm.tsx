import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpLeft, CheckCircle2 } from 'lucide-react';
import { content as c } from './content';
import { formConfigured } from './config';
import { normalizeName, normalizePhone, submitCourseWaitlist } from './leads';

export function LeadForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const pending = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !formConfigured || state === 'success') return;
    const name = normalizeName(fullName);
    const normalizedPhone = normalizePhone(phone);
    const nextErrors = {
      name: name.length < 2 || name.length > 100 || !/\p{L}/u.test(name) ? c.leadForm.nameError : undefined,
      phone: normalizedPhone ? undefined : c.leadForm.phoneError,
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.phone || !normalizedPhone) return;
    pending.current = true;
    setState('pending');
    try {
      const payload = JSON.stringify([name, normalizedPhone]);
      if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
      await submitCourseWaitlist(name, normalizedPhone, attempt.current.id, website);
      setState('success');
      setFullName(''); setPhone('');
    } catch {
      // Keep inputs and request UUID: a timed-out request may already be committed.
      setState('error');
    } finally { pending.current = false; }
  }

  return <section id="course-waitlist" className="lead-section section surface-navy" aria-labelledby="lead-title">
    <div className="container lead-layout">
      <div><p className="eyebrow">{c.leadForm.eyebrow}</p><h2 id="lead-title">{c.leadForm.title}<br/><span className="accent">{c.leadForm.accent}</span></h2><p className="section-intro">{c.leadForm.description}</p></div>
      <div className="lead-card">
        {state === 'success' ? <div className="lead-success" role="status"><CheckCircle2 size={38}/><h3>{c.leadForm.successTitle}</h3><p>{c.leadForm.successText}</p></div> :
        <form onSubmit={handleSubmit} noValidate aria-busy={state === 'pending'}>
          <div className="lead-field"><label htmlFor="lead-name">{c.leadForm.nameLabel}</label><input id="lead-name" name="full_name" autoComplete="name" required minLength={2} maxLength={100} value={fullName} onChange={e => setFullName(e.target.value)} disabled={state === 'pending'} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'lead-name-error' : undefined} placeholder={c.leadForm.namePlaceholder}/>{errors.name && <p id="lead-name-error" className="field-error">{errors.name}</p>}</div>
          <div className="lead-field"><label htmlFor="lead-phone">{c.leadForm.phoneLabel}</label><input id="lead-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} disabled={state === 'pending'} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'lead-phone-error' : undefined} placeholder="0912 345 6789"/>{errors.phone && <p id="lead-phone-error" className="field-error">{errors.phone}</p>}</div>
          <div className="lead-trap" aria-hidden="true"><label htmlFor="lead-website">Website</label><input id="lead-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}/></div>
          <p className="lead-privacy">{c.leadForm.privacy}</p>
          <button className="button" type="submit" disabled={!formConfigured || state === 'pending'}>{state === 'pending' ? c.leadForm.pending : c.leadForm.submit}<ArrowUpLeft size={20}/></button>
          {!formConfigured && <p className="lead-message">{c.leadForm.unavailable}</p>}
          {state === 'error' && <p className="field-error lead-message" role="alert">{c.leadForm.error}</p>}
        </form>}
      </div>
    </div>
  </section>;
}
