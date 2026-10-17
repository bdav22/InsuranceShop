import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, CircleHelp, Clock3,
  Home as HomeIcon, LockKeyhole, Menu, Shield, ShieldCheck, Sparkles, CarFront,
  Building2, ArrowLeft, CheckCircle2, ClipboardCheck, HeartHandshake,
} from 'lucide-react';
import { getQuote, insuranceProducts, type InsuranceProduct, type QuoteLead } from '@/services/quoteService';

const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://uplift-insurance-quote-experience--bendavenport333.replit.app').replace(/\/$/, '');
const brandName = 'PolicyWell';
type ProductInfo = { name: string; title: string; description: string; intro: string; icon: typeof CarFront; facts: { key: string; label: string; type?: string; options?: string[]; placeholder?: string }[]; bullets: string[] };
const productInfo: Record<InsuranceProduct, ProductInfo> = {
  auto: { name: 'Auto', title: 'Auto insurance, with the details made clearer', description: 'Explore auto insurance options with a straightforward comparison journey. Share a few details about you and your vehicle to get started.', intro: 'A clearer road to auto coverage', icon: CarFront, facts: [
    { key: 'vehicleYear', label: 'Vehicle year', placeholder: 'e.g. 2021' }, { key: 'vehicleMakeModel', label: 'Vehicle make and model', placeholder: 'e.g. Subaru Outback' },
    { key: 'vehicleUse', label: 'How is the vehicle used?', type: 'select', options: ['Personal', 'Commute', 'Business', 'Rideshare'] }, { key: 'currentlyInsured', label: 'Currently have auto insurance?', type: 'select', options: ['Yes', 'No', 'Not sure'] },
   ], bullets: ['Tell us about your vehicle and the people who drive it.', 'Review your answers before checking comparison availability.', 'Comparison availability depends on a connected carrier service.'] },
  home: { name: 'Home', title: 'Home insurance, starting with what matters to you', description: 'Get oriented around home insurance with a clear, comfortable intake. Tell us a little about your home and what you are looking for.', intro: 'Feel more at home with your choices', icon: HomeIcon, facts: [
     { key: 'homeType', label: 'What type of home do you want to insure?', type: 'select', options: ['Single-family home', 'Condo', 'Townhouse', 'Other'] },
     { key: 'occupancy', label: 'How is the home occupied?', type: 'select', options: ['Primary residence', 'Seasonal', 'Rental property'] }, { key: 'yearBuilt', label: 'Approximate year built', placeholder: 'e.g. 1998' }, { key: 'roofYear', label: 'Approximate roof replacement year', placeholder: 'e.g. 2018' },
  ], bullets: ['Share basic information about the property.', 'Your contact details stay in this browser session.', 'We will be transparent if comparison service is not connected.'] },
  commercial: { name: 'Commercial', title: 'Commercial insurance, made easier to explore', description: 'Start a thoughtful commercial insurance comparison with a few details about your business and the protection you are seeking.', intro: 'Support for the work you’ve built', icon: Building2, facts: [
    { key: 'businessType', label: 'What kind of business do you run?', placeholder: 'e.g. independent bakery' }, { key: 'yearsInBusiness', label: 'Years in business', type: 'select', options: ['Just getting started', '1–3 years', '4–10 years', 'More than 10 years'] },
    { key: 'teamSize', label: 'How many people work there?', type: 'select', options: ['Just me', '2–5', '6–20', '21 or more'] }, { key: 'coverageInterest', label: 'What are you looking to protect?', type: 'select', options: ['Business property', 'Liability', 'Vehicles', 'Not sure yet'] },
  ], bullets: ['Describe your business in plain language.', 'Choose what you would like to explore.', 'No carrier estimates are shown until the service is connected.'] },
};
const pageSeo: Record<string, { title: string; description: string }> = {
  '/': { title: 'Compare Insurance Options | PolicyWell', description: 'Explore auto, home, and commercial insurance in a clearer, more human comparison experience. Start with a few details, at your own pace.' },
  '/auto-insurance': { title: 'Auto Insurance Comparison | PolicyWell', description: productInfo.auto.description },
  '/home-insurance': { title: 'Home Insurance Comparison | PolicyWell', description: productInfo.home.description },
  '/commercial-insurance': { title: 'Commercial Insurance Comparison | PolicyWell', description: productInfo.commercial.description },
};

function withCampaign(path: string) {
  if (typeof window === 'undefined') return path;
  const current = new URLSearchParams(window.location.search);
  const campaign = new URLSearchParams();
  current.forEach((value, key) => {
    if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid') campaign.set(key, value);
  });
  const query = campaign.toString();
  if (!query) return path;
  const [pathname, hash] = path.split('#', 2);
  return `${pathname}${pathname.includes('?') ? '&' : '?'}${query}${hash ? `#${hash}` : ''}`;
}

function applySeo(path: string, noindex = false) {
  const quoteProduct = path.match(/^\/quote\/(auto|home|commercial)$/)?.[1] as InsuranceProduct | undefined;
  const seo = pageSeo[path] || (quoteProduct
    ? { title: `${productInfo[quoteProduct].name} insurance quote intake | PolicyWell`, description: `Complete a short ${productInfo[quoteProduct].name.toLowerCase()} insurance comparison request. Review your details before submitting; no policy is created.` }
    : { title: 'Your insurance quote | PolicyWell', description: 'Share a few details to explore your insurance options with PolicyWell.' });
  document.title = seo.title;
  const upsert = (selector: string, attr: string, key: string, value: string) => {
    let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
    if (!el) { el = document.createElement(selector.startsWith('link') ? 'link' : 'meta'); document.head.appendChild(el); }
    el.setAttribute(attr, key); el.setAttribute(selector.startsWith('link') ? 'href' : 'content', value);
  };
  upsert('meta[name="description"]', 'name', 'description', seo.description);
  upsert('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  upsert('link[rel="canonical"]', 'rel', 'canonical', `${SITE_ORIGIN}${path}`);
  upsert('meta[property="og:title"]', 'property', 'og:title', seo.title);
  upsert('meta[property="og:description"]', 'property', 'og:description', seo.description);
  upsert('meta[property="og:url"]', 'property', 'og:url', `${SITE_ORIGIN}${path}`);
  upsert('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsert('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
  upsert('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
  upsert('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary');
  upsert('meta[name="twitter:url"]', 'name', 'twitter:url', `${SITE_ORIGIN}${path}`);
}

function Brand() {
  return <Link href={withCampaign('/')} aria-label="PolicyWell home" className="brand" data-testid="link-brand"><span className="brand-mark"><Shield size={20} strokeWidth={2.5} /><span /></span><span>PolicyWell</span></Link>;
}
function Header({ minimal = false }: { minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner"><Brand />
    {!minimal && <><nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
      <Link href={withCampaign('/auto-insurance')} data-testid="link-auto-nav">Auto</Link><Link href={withCampaign('/home-insurance')} data-testid="link-home-nav">Home</Link><Link href={withCampaign('/commercial-insurance')} data-testid="link-commercial-nav">Business</Link>
      <a href={withCampaign('/#how-it-works')} data-testid="link-how-it-works" onClick={() => setOpen(false)}>How it works</a>
    </nav><div className="header-right"><span className="header-reassurance"><LockKeyhole size={15} /> Your details stay with you</span><button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} data-testid="button-menu" onClick={() => setOpen(!open)}><Menu size={21} /></button></div></>}
  </div></header>;
}
function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><Brand /><p>Clear choices. A little more peace of mind.</p><span>© {new Date().getFullYear()} PolicyWell</span></div><p className="footer-note">PolicyWell is an insurance comparison experience. Availability of quotes depends on connected insurance services. Submitting information here does not create coverage.</p></footer>;
}
function CTA({ product, text = 'Start a comparison', className = '' }: { product: InsuranceProduct; text?: string; className?: string }) {
  return <Link href={withCampaign(`/quote/${product}`)} className={`button-primary ${className}`} data-testid={`link-start-${product}`}>{text}<ArrowRight size={18} /></Link>;
}
function Pill({ children }: { children: ReactNode }) { return <span className="eyebrow-pill"><span className="pill-dot" />{children}</span>; }

function HomePage() {
  useEffect(() => applySeo('/'), []);
  return <><Header /><main>
    <section className="home-hero"><div className="hero-inner">
      <div className="hero-copy"><Pill>A better way to compare</Pill><h1>Insurance that feels <em>easier.</em></h1><p className="hero-lede">A few thoughtful questions. A clearer view of what comes next. Find the kind of cover you’re looking for—without the guesswork.</p><div className="hero-actions"><a href="#products" data-testid="link-explore-products" className="button-primary">Explore your options<ArrowRight size={18} /></a><a href="#how-it-works" data-testid="link-home-how-it-works" className="text-link">How PolicyWell works <ChevronRight size={16} /></a></div><div className="hero-assurance"><span><Check size={15} /> No pressure to buy</span><span><LockKeyhole size={15} /> Your details stay in this session</span></div><p className="preview-disclosure">Quote comparison is a preview. Details entered here are not saved or sent.</p></div>
      <div className="hero-art" aria-label="Illustration of home, car, and business protection"><div className="sun-disc" /><div className="art-caption">A little more clarity<br />for the things you care for.</div><div className="art-home"><div className="house-roof" /><div className="house-body"><span className="window window-a" /><span className="window window-b" /><span className="door" /></div></div><div className="art-car"><CarFront size={60} strokeWidth={1.35} /></div><div className="art-shield"><ShieldCheck size={35} /></div><span className="orbit orbit-a" /><span className="orbit orbit-b" /></div>
    </div></section>
    <section id="products" className="product-section section-wrap"><div className="section-heading"><div><Pill>Choose a place to begin</Pill><h2>What would you like to protect?</h2></div><p>Start with one area. You can always come back to explore the others.</p></div><div className="product-grid">
      {insuranceProducts.map((key) => <ProductTile key={key} product={key} />)}
    </div></section>
    <section id="how-it-works" className="how-section"><div className="section-wrap how-layout"><div><Pill>Simple by design</Pill><h2>A good next step,<br /><em>not a big leap.</em></h2><p>Insurance decisions can feel like a lot. PolicyWell keeps the first steps clear and manageable.</p></div><div className="steps-list"><Step number="01" title="Choose what matters" copy="Pick auto, home, or commercial insurance and start with the details you know." /><Step number="02" title="Review as you go" copy="Answer a few short questions. You can check and edit every answer before submitting." /><Step number="03" title="Know what’s next" copy="We’ll tell you plainly when comparison options are ready—and when they’re not." /></div></div></section>
    <section className="closing-cta"><div className="closing-inner"><div><Sparkles size={22} /><h2>Start with one simple question.</h2><p>Which part of your world are you looking to protect?</p></div><a href="#products" className="button-light">Choose a product<ArrowRight size={18} /></a></div></section>
  </main><Footer /></>;
}
function ProductTile({ product }: { product: InsuranceProduct }) {
  const info = productInfo[product]; const Icon = info.icon;
  return <article className={`product-tile tile-${product}`} data-testid={`card-product-${product}`}><div className="tile-icon"><Icon size={25} strokeWidth={1.8} /></div><span className="tile-kicker">{info.name} insurance</span><h3>{product === 'commercial' ? 'For your business' : `For your ${product === 'auto' ? 'drive' : 'home'}`}</h3><p>{product === 'auto' ? 'Explore the vehicle coverage that fits your everyday.' : product === 'home' ? 'Explore protection for the place you call home.' : 'Explore protection for the work you’ve built.'}</p><Link href={withCampaign(`/${product}-insurance`)} className="tile-link" data-testid={`link-product-${product}`}>Explore {info.name.toLowerCase()} insurance<ArrowUpRight size={17} /></Link></article>;
}
function Step({ number, title, copy }: { number: string; title: string; copy: string }) { return <article className="how-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><CheckCircle2 size={21} /></article>; }

function ProductLanding({ product }: { product: InsuranceProduct }) {
  const info = productInfo[product]; const Icon = info.icon;
  useEffect(() => applySeo(`/${product}-insurance`), [product]);
  return <><Header /><main>
    <div className={`product-hero product-hero-${product}`}><div className="product-hero-inner"><div className="product-hero-copy"><Pill>{info.name} insurance</Pill><h1>{info.title}</h1><p>{info.description}</p><CTA product={product} text="Start your questions" /><div className="inline-promise"><LockKeyhole size={16} /> Preview only: details stay in this browser and are not sent or saved.</div></div><div className="product-illustration"><span className="illustration-sun" /><div className="illustration-icon"><Icon size={76} strokeWidth={1.3} /></div><span className="illustration-note"><ShieldCheck size={18} /> Your next step, made clearer</span></div></div></div>
    <section className="section-wrap landing-content"><div className="landing-intro"><Pill>What to expect</Pill><h2>{info.intro}</h2><p>We believe a comparison should start with understanding—not pressure. Here’s how this experience works.</p></div><div className="landing-benefits">{info.bullets.map((bullet, i) => <div className="benefit" key={bullet}><span>0{i + 1}</span><p>{bullet}</p></div>)}</div></section>
    <section className="landing-questions"><div className="section-wrap question-layout"><div><Pill>A few details at a time</Pill><h2>Only what’s useful<br />to get started.</h2><p>We’ll ask for contact information and a handful of details about your {product === 'commercial' ? 'business' : ` ${product}`}. You can review it all before submitting.</p></div><div className="question-card"><div className="question-card-icon"><ClipboardCheck size={23} /></div><h3>Plain language, all the way through.</h3><p>No insurance shorthand required. If something isn’t clear, pause and take your time.</p><CTA product={product} text="Start your questions" /></div></div></section>
    <section className="faq-section section-wrap"><div className="faq-title"><CircleHelp size={21} /><h2>Before you begin</h2></div><details data-testid="details-policy-created"><summary>Does starting a comparison create an insurance policy?</summary><p>No. Providing information here does not bind coverage or create a policy. The current comparison service is not connected, and we’ll say so clearly after submission.</p></details><details data-testid="details-edit-answers"><summary>Can I change my answers?</summary><p>Yes. You’ll have a review step before submitting, and you can edit any answer you’ve entered.</p></details><details data-testid="details-information-handling"><summary>What happens to my details?</summary><p>Your answers are held in memory in this browsing session only. They are not saved to a database or transmitted to a carrier.</p></details></section>
  </main><Footer /></>;
}

type Contact = { firstName: string; lastName: string; email: string; phone: string; zip: string };
const emptyContact: Contact = { firstName: '', lastName: '', email: '', phone: '', zip: '' };
function QuotePage({ product: productParam }: { product: string }) {
  const product = insuranceProducts.includes(productParam as InsuranceProduct) ? productParam as InsuranceProduct : null;
  const [step, setStep] = useState(0); const [contact, setContact] = useState<Contact>(emptyContact);
  const [facts, setFacts] = useState<Record<string, string>>({}); const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const info = product ? productInfo[product] : null;
  useEffect(() => { applySeo(`/quote/${productParam}`, true); }, [productParam]);
  const utms = useMemo(() => {
    const params = new URLSearchParams(window.location.search); const values: Record<string, string> = {};
    params.forEach((value, key) => { if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid') values[key] = value; });
    return values;
  }, []);
  if (!product || !info) return <><Header minimal /><main className="not-found"><h1>That quote page isn’t available.</h1><Link href="/" className="button-primary">Return to PolicyWell</Link></main><Footer /></>;
  const validateStep = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 0) {
      (['firstName', 'lastName', 'email', 'phone', 'zip'] as const).forEach((key) => { if (!contact[key].trim()) nextErrors[key] = 'Please enter this information.'; });
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) nextErrors.email = 'Enter an email address in a format like name@example.com.';
      if (contact.phone && contact.phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Enter a phone number with at least 10 digits.';
      if (contact.zip && !/^\d{5}(?:-\d{4})?$/.test(contact.zip)) nextErrors.zip = 'Enter a 5-digit ZIP code.';
    } else if (step === 1) info.facts.forEach((fact) => { if (!facts[fact.key]?.trim()) nextErrors[fact.key] = 'Please answer this question.'; });
    setErrors(nextErrors); return Object.keys(nextErrors).length === 0;
  };
  const advance = () => { if (validateStep()) { setErrors({}); setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!validateStep()) return;
    setSubmitting(true);
    const applicationData: QuoteLead = { product, contact, details: { ...facts, ...utms } };
    try { const response = await getQuote(applicationData); setResult(response.message); setSubmissionError(false); setStep(3); }
    catch { setResult('We couldn’t prepare your request right now. Your answers are still only in this browser session. Please try again.'); setSubmissionError(true); setStep(3); }
    finally { setSubmitting(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  const setContactValue = (key: keyof Contact, value: string) => setContact({ ...contact, [key]: value });
  const setFact = (key: string, value: string) => setFacts({ ...facts, [key]: value });
  const input = (key: keyof Contact, label: string, type = 'text', placeholder = '') => <label className="field" key={key}><span>{label}</span><input data-testid={`input-${key}`} type={type} value={contact[key]} placeholder={placeholder} autoComplete={key === 'firstName' ? 'given-name' : key === 'lastName' ? 'family-name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'postal-code'} inputMode={key === 'zip' ? 'numeric' : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined} onChange={(e) => setContactValue(key, e.target.value)} />{errors[key] && <small role="alert" className="field-error" id={`error-${key}`}>{errors[key]}</small>}</label>;
  return <><Header minimal /><main className="quote-page"><div className="quote-topline"><Link href={withCampaign(`/${product}-insurance`)} className="back-link" data-testid="link-back-product"><ArrowLeft size={17} /> Back to {info.name.toLowerCase()} insurance</Link><span><LockKeyhole size={14} /> Your answers stay in this session</span></div>
    {step < 3 && <div className="quote-progress"><div className="progress-label"><span>{['Your contact details', `About your ${product === 'commercial' ? 'business' : product}`, 'Review your answers'][step]}</span><span>Step {step + 1} of 3</span></div><div className="progress-track"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div></div>}
     {step === 0 && <form className="form-panel" onSubmit={(event) => { event.preventDefault(); advance(); }}><Pill>{info.name} comparison</Pill><h1>Start your {info.name.toLowerCase()} insurance comparison.</h1><p className="form-intro">Enter a few details to preview what a future comparison could need. Nothing is sent or saved from this preview.</p><div className="form-grid">{input('firstName', 'First name', 'text', 'Your first name')}{input('lastName', 'Last name', 'text', 'Your last name')}{input('email', 'Email address', 'email', 'you@example.com')}{input('phone', 'Phone number', 'tel', '(555) 555-5555')}{input('zip', 'ZIP code', 'text', '5-digit ZIP')}</div><div className="form-actions"><button type="submit" className="button-primary" data-testid="button-continue-contact">Continue<ArrowRight size={17} /></button></div></form>}
     {step === 1 && <form className="form-panel" onSubmit={(event) => { event.preventDefault(); advance(); }}><Pill>{info.name} details</Pill><h1>A little about your {product === 'commercial' ? 'commercial insurance needs' : `${product} insurance`}.</h1><p className="form-intro">A few quick details help make your request more relevant. It’s okay to estimate.</p><div className="form-grid">{info.facts.map((fact) => <label className="field" key={fact.key}><span>{fact.label}</span>{fact.options ? <select data-testid={`select-${fact.key}`} value={facts[fact.key] || ''} onChange={(e) => setFact(fact.key, e.target.value)} aria-invalid={!!errors[fact.key]} aria-describedby={errors[fact.key] ? `error-${fact.key}` : undefined}><option value="">Choose an answer</option>{fact.options.map((o) => <option key={o}>{o}</option>)}</select> : <input data-testid={`input-${fact.key}`} value={facts[fact.key] || ''} placeholder={fact.placeholder} aria-invalid={!!errors[fact.key]} aria-describedby={errors[fact.key] ? `error-${fact.key}` : undefined} onChange={(e) => setFact(fact.key, e.target.value)} />}{errors[fact.key] && <small role="alert" className="field-error" id={`error-${fact.key}`}>{errors[fact.key]}</small>}</label>)}</div><div className="form-actions spread"><button type="button" className="button-secondary" data-testid="button-back-details" onClick={() => setStep(0)}><ArrowLeft size={17} /> Back</button><button type="submit" className="button-primary" data-testid="button-review-answers">Review answers<ArrowRight size={17} /></button></div></form>}
    {step === 2 && <section className="form-panel"><Pill>One last look</Pill><h1>Review your {info.name.toLowerCase()} insurance answers.</h1><p className="form-intro">Make sure everything looks right. You can edit any section before checking availability.</p><div className="review-group"><div className="review-heading"><h2>Your contact details</h2><button data-testid="button-edit-contact" onClick={() => setStep(0)}>Edit</button></div><dl>{[['Name', `${contact.firstName} ${contact.lastName}`], ['Email', contact.email], ['Phone', contact.phone], ['ZIP code', contact.zip]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div><div className="review-group"><div className="review-heading"><h2>{info.name} details</h2><button data-testid="button-edit-facts" onClick={() => setStep(1)}>Edit</button></div><dl>{info.facts.map((fact) => <div key={fact.key}><dt>{fact.label}</dt><dd>{facts[fact.key]}</dd></div>)}</dl></div><div className="privacy-callout"><LockKeyhole size={18} /><p>Your information is held in memory only. It is not submitted, saved, or sent to an insurance company.</p></div><form onSubmit={submit} className="form-actions spread"><button type="button" className="button-secondary" data-testid="button-back-review" onClick={() => setStep(1)}><ArrowLeft size={17} /> Back</button><button className="button-primary" data-testid="button-submit-quote" disabled={submitting}>{submitting ? 'Checking…' : 'Check quote availability'}<ArrowRight size={17} /></button></form></section>}
    {step === 3 && <section className="pending-panel" data-testid="status-pending" aria-live="polite"><div className="pending-icon"><Clock3 size={33} /></div><Pill>{submissionError ? 'Could not check status' : 'Quote status'}</Pill><h1>{submissionError ? `${info.name} insurance details are still here.` : <>{info.name} insurance details are ready.<br /><em>Comparison is not connected yet.</em></>}</h1><p className="pending-message">{result}</p><div className="connection-note"><HeartHandshake size={20} /><div><strong>What this means</strong><p>No premium, insurer options, or coverage decision has been created. This preview does not send information, purchase insurance, or bind a policy.</p></div></div><div className="review-group pending-review"><div className="review-heading"><h2>Your answers</h2><button data-testid="button-edit-submitted" onClick={() => setStep(0)}>Edit answers</button></div><dl>{[['Name', `${contact.firstName} ${contact.lastName}`], ['Email', contact.email], ['Phone', contact.phone], ['ZIP code', contact.zip], ...info.facts.map((f) => [f.label, facts[f.key]])].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div><div className="pending-actions">{submissionError && <button className="button-primary" data-testid="button-retry-submit" onClick={() => setStep(2)}>Try again<ArrowRight size={17} /></button>}<Link href={withCampaign(`/${product}-insurance`)} className="button-secondary" data-testid="link-return-product">Return to {info.name.toLowerCase()} insurance</Link><Link href={withCampaign('/')} className="text-link" data-testid="link-return-home">Explore another product <ArrowRight size={16} /></Link></div><p className="session-note"><BadgeCheck size={15} /> Your details are only held for this session. Leaving this page clears them.</p></section>}
  </main><Footer /></>;
}

function NotFound() {
  const [location] = useLocation();
  useEffect(() => { document.title = 'Page not found | PolicyWell'; const meta = document.querySelector('meta[name="robots"]'); meta?.setAttribute('content', 'noindex, nofollow'); document.head.querySelector('link[rel="canonical"]')?.remove(); }, [location]);
  return <><Header /><main className="not-found"><Pill>Page not found</Pill><h1>Let’s find a clearer path.</h1><p>That page has moved, but your next step is easy to find.</p><Link href="/" className="button-primary">Go to PolicyWell<ArrowRight size={17} /></Link></main><Footer /></>;
}
function App() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return <Switch>
    <Route path="/" component={HomePage} />
    <Route path="/auto-insurance"><ProductLanding product="auto" /></Route>
    <Route path="/home-insurance"><ProductLanding product="home" /></Route>
    <Route path="/commercial-insurance"><ProductLanding product="commercial" /></Route>
    <Route path="/quote/:product">{(params) => <QuotePage product={params.product} />}</Route>
    <Route component={NotFound} />
  </Switch>;
}
export default App;
