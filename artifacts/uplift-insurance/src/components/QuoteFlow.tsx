import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleHelp,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  createIllustrativeQuotes,
  deleteCurrentLead,
  getCurrentLead,
  startLead,
  updateCurrentLead,
  type LeadContact,
  type LeadSession,
  type QuoteCollection,
} from "@workspace/api-client-react";
import type { InsuranceProduct } from "@/services/quoteService";

type Answers = Record<string, unknown>;
type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  placeholder?: string;
  options?: string[];
};
type FlowStep = {
  key: string;
  title: string;
  description: string;
  kind: "choice" | "multi" | "fields" | "vehicle" | "driver" | "contact" | "review";
  answerKey?: string;
  options?: string[];
  fields?: Field[];
  index?: number;
};
type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactConsent: boolean;
};

const blankContact: ContactDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  contactConsent: false,
};
const countOptions = ["1", "2", "3", "4+"];
const yesNoOptions = ["Yes", "No", "Not sure"];
const timeframeOptions = ["As soon as possible", "Within 30 days", "Just exploring"];
const coverageOptions = ["State or basic requirements", "Standard protection", "Higher limits", "Not sure yet"];

function readAttribution(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith("utm_") || key === "gclid" || key === "fbclid") values[key] = value.slice(0, 200);
  });
  return values;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    : [];
}

function countFrom(value: unknown): number {
  const count = Number.parseInt(String(value ?? "1"), 10);
  return Math.min(4, Math.max(1, Number.isFinite(count) ? count : 1));
}

function getSteps(product: InsuranceProduct, answers: Answers): FlowStep[] {
  const common = [
    { key: "purchaseTimeframe", title: "When are you hoping to get coverage?", description: "A rough idea is fine.", kind: "choice" as const, answerKey: "purchaseTimeframe", options: timeframeOptions },
  ];
  if (product === "auto") {
    const vehicleCount = countFrom(answers.vehicleCount);
    const driverCount = countFrom(answers.driverCount);
    return [
      { key: "currentlyInsured", title: "Do you have auto insurance today?", description: "This helps set the context for your request.", kind: "choice", answerKey: "currentlyInsured", options: yesNoOptions },
      ...common,
      { key: "vehicleCount", title: "How many vehicles would you like to include?", description: "Choose the closest number. You can add up to four here.", kind: "choice", answerKey: "vehicleCount", options: countOptions },
      ...Array.from({ length: vehicleCount }, (_, index): FlowStep => ({
        key: `vehicle-${index}`,
        title: `Tell us about vehicle ${index + 1}.`,
        description: "An estimate is okay. We do not ask for a full driver's license number or Social Security number.",
        kind: "vehicle",
        index,
        fields: [
          { key: "year", label: "Model year", type: "number", placeholder: "2021" },
          { key: "make", label: "Make", placeholder: "Subaru" },
          { key: "model", label: "Model", placeholder: "Outback" },
          { key: "ownership", label: "Ownership", type: "select", options: ["Owned", "Financed", "Leased"] },
          { key: "annualMiles", label: "Approximate miles per year", type: "number", placeholder: "10,000" },
          { key: "primaryUse", label: "Primary use", type: "select", options: ["Personal", "Commuting", "Business", "Rideshare"] },
        ],
      })),
      { key: "driverCount", title: "How many drivers should be included?", description: "Include regular drivers in your household.", kind: "choice", answerKey: "driverCount", options: countOptions },
      ...Array.from({ length: driverCount }, (_, index): FlowStep => ({
        key: `driver-${index}`,
        title: `Tell us about driver ${index + 1}.`,
        description: "No full license number or Social Security number is requested.",
        kind: "driver",
        index,
        fields: [
          { key: "fullName", label: "Full name", placeholder: "Driver name" },
          { key: "dateOfBirth", label: "Date of birth", type: "date" },
          { key: "relationship", label: "Relationship to the applicant", type: "select", options: ["Applicant", "Spouse or partner", "Child", "Other"] },
          { key: "licenseState", label: "State where licensed", placeholder: "State abbreviation" },
          { key: "yearsLicensed", label: "Years licensed", type: "number", placeholder: "10" },
        ],
      })),
      { key: "claimsCount", title: "Any tickets or accidents in the last five years?", description: "Use your best estimate for everyone listed.", kind: "choice", answerKey: "claimsCount", options: ["None", "One", "Two", "Three or more", "Not sure"] },
      { key: "coverage", title: "What level of protection are you looking for?", description: "You can review exact coverage with a licensed professional later.", kind: "choice", answerKey: "coverage", options: coverageOptions },
      { key: "contact", title: "Where should PolicyWell send your request follow-up?", description: "We need a way to respond to this quote request. This is not marketing consent.", kind: "contact" },
      { key: "review", title: "Review your answers.", description: "Your answers are saved in PolicyWell. Sample options are illustrative only; no carrier is connected.", kind: "review" },
    ];
  }
  if (product === "home") {
    return [
      { key: "currentlyInsured", title: "Is the home insured today?", description: "Choose the closest answer.", kind: "choice", answerKey: "currentlyInsured", options: yesNoOptions },
      ...common,
      { key: "propertyType", title: "What kind of home are you looking to insure?", description: "Choose the closest match.", kind: "choice", answerKey: "propertyType", options: ["Single-family home", "Condo", "Townhouse", "Manufactured home", "Other"] },
      { key: "occupancy", title: "How is the home used?", description: "Choose the option that best describes the property.", kind: "choice", answerKey: "occupancy", options: ["Primary residence", "Seasonal home", "Rental property"] },
      { key: "yearBuilt", title: "About what year was the home built?", description: "An estimate is fine.", kind: "fields", fields: [{ key: "yearBuilt", label: "Year built", type: "number", placeholder: "1998" }] },
      { key: "roofYear", title: "About what year was the roof last replaced?", description: "Choose “Not sure” if you do not know.", kind: "fields", fields: [{ key: "roofYear", label: "Roof replacement year", type: "number", placeholder: "2018" }] },
      { key: "squareFeet", title: "How large is the home?", description: "Approximate square footage is enough.", kind: "fields", fields: [{ key: "squareFeet", label: "Interior square feet", type: "number", placeholder: "1,800" }] },
      { key: "claimsCount", title: "Any home insurance claims in the last five years?", description: "Choose the closest answer.", kind: "choice", answerKey: "claimsCount", options: ["None", "One", "Two", "Three or more", "Not sure"] },
      { key: "coverage", title: "What level of protection are you looking for?", description: "Coverage amounts are examples only until a real carrier service is connected.", kind: "choice", answerKey: "coverage", options: coverageOptions },
      { key: "contact", title: "Where should PolicyWell send your request follow-up?", description: "We need a way to respond to this quote request. This is not marketing consent.", kind: "contact" },
      { key: "review", title: "Review your answers.", description: "Your answers are saved in PolicyWell. Sample options are illustrative only; no carrier is connected.", kind: "review" },
    ];
  }
  return [
    { key: "businessType", title: "What does your business do?", description: "Use a few plain-language words.", kind: "fields", fields: [{ key: "businessType", label: "Business type", placeholder: "Independent bakery" }] },
    ...common,
    { key: "yearsInBusiness", title: "How long has the business been operating?", description: "Choose the closest match.", kind: "choice", answerKey: "yearsInBusiness", options: ["Not open yet", "Under 1 year", "1–3 years", "4–10 years", "More than 10 years"] },
    { key: "teamSize", title: "How many people work in the business?", description: "Include yourself if you work there.", kind: "choice", answerKey: "teamSize", options: ["Just me", "2–5", "6–20", "21–50", "More than 50"] },
    { key: "annualRevenue", title: "About how much annual revenue does the business have?", description: "A range is enough for this first step.", kind: "choice", answerKey: "annualRevenue", options: ["Under $100,000", "$100,000–$499,999", "$500,000–$999,999", "$1 million or more", "Not sure"] },
    { key: "coverageInterest", title: "What would you like to protect?", description: "Select all that apply.", kind: "multi", answerKey: "coverageInterest", options: ["General liability", "Business property", "Commercial auto", "Workers' compensation", "Professional liability", "Not sure yet"] },
    { key: "claimsCount", title: "Any business insurance claims in the last five years?", description: "Choose the closest answer.", kind: "choice", answerKey: "claimsCount", options: ["None", "One", "Two", "Three or more", "Not sure"] },
    { key: "contact", title: "Where should PolicyWell send your request follow-up?", description: "We need a way to respond to this quote request. This is not marketing consent.", kind: "contact" },
    { key: "review", title: "Review your answers.", description: "Your answers are saved in PolicyWell. Sample options are illustrative only; no carrier is connected.", kind: "review" },
  ];
}

function campaignSuffix() {
  const values = readAttribution();
  const query = new URLSearchParams(values).toString();
  return query ? `?${query}` : "";
}

export function StartQuoteForm({
  defaultProduct = "auto",
  allowProductChoice = true,
  onStarted,
}: {
  defaultProduct?: InsuranceProduct;
  allowProductChoice?: boolean;
  onStarted?: (lead: LeadSession) => void;
}) {
  const [, setLocation] = useLocation();
  const [product, setProduct] = useState<InsuranceProduct>(defaultProduct);
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a five-digit ZIP code to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const lead = await startLead({ product, zip, attribution: readAttribution() });
      if (onStarted) onStarted(lead);
      else setLocation(`/quote/${product}${campaignSuffix()}`);
    } catch {
      setError("We couldn’t save your start just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="start-quote-card" onSubmit={submit}>
    <div className="start-quote-heading"><span>Your starting point</span><small>01 / 02</small></div>
    {allowProductChoice && <fieldset className="product-choice-group">
      <legend>What are you looking to protect?</legend>
      <div className="product-choice-grid">
        {([
          ["auto", "Auto", "The way you get there"],
          ["home", "Home", "The place you come back to"],
          ["commercial", "Business", "The work you’re building"],
        ] as const).map(([value, label, detail]) => (
          <button type="button" key={value} className={`product-choice ${product === value ? "is-selected" : ""}`} aria-pressed={product === value} onClick={() => setProduct(value)}>
            <span className="product-choice-icon">{value === "auto" ? "↗" : value === "home" ? "⌂" : "▦"}</span>
            <strong>{label}</strong><small>{detail}</small>
            {product === value && <Check size={16} className="product-choice-check" />}
          </button>
        ))}
      </div>
    </fieldset>}
    <label className="zip-start-label" htmlFor="start-zip">Your ZIP code</label>
    <div className="zip-start-row">
      <input id="start-zip" value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="Enter 5-digit ZIP" inputMode="numeric" autoComplete="postal-code" aria-invalid={!!error} />
      <button type="submit" className="button-primary" disabled={busy}>{busy ? "Saving…" : "See next step"}<ArrowRight size={17} /></button>
    </div>
    {error && <p className="start-error" role="alert">{error}</p>}
    <p className="start-quote-disclosure"><LockKeyhole size={14} /> Starting saves your ZIP and answers to PolicyWell so you can continue. No carrier is connected yet.</p>
  </form>;
}

function fieldValue(answers: Answers, field: Field, step: FlowStep): unknown {
  if (step.kind === "vehicle" || step.kind === "driver") {
    const values = list(answers[step.kind === "vehicle" ? "vehicles" : "drivers"]);
    return values[step.index ?? 0]?.[field.key] ?? "";
  }
  return answers[field.key] ?? "";
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(String).filter(Boolean).join(", ");
  return value === undefined || value === null || value === "" ? "Not provided" : String(value);
}

function stepSummaries(product: InsuranceProduct, answers: Answers, contact: ContactDraft, zip: string) {
  const entries: [string, string][] = [["ZIP code", zip]];
  for (const [key, value] of Object.entries(answers)) {
    if (key === "zip" || key === "vehicles" || key === "drivers") continue;
    if (key === "vehicleCount" || key === "driverCount") continue;
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
    entries.push([label, displayValue(value)]);
  }
  if (product === "auto") {
    list(answers.vehicles).forEach((vehicle, index) => entries.push([
      `Vehicle ${index + 1}`,
      [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).map(String).join(" ") || "Not provided",
    ]));
    list(answers.drivers).forEach((driver, index) => entries.push([
      `Driver ${index + 1}`,
      [driver.fullName, driver.dateOfBirth].filter(Boolean).map(String).join(" · ") || "Not provided",
    ]));
  }
  entries.push(["Contact", [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Not provided"]);
  entries.push(["Email", contact.email || "Not provided"]);
  entries.push(["Phone", contact.phone || "Not provided"]);
  return entries;
}

export function QuoteFlow({ product: productParam }: { product: string }) {
  const product = (["auto", "home", "commercial"].includes(productParam) ? productParam : null) as InsuranceProduct | null;
  const [, setLocation] = useLocation();
  const [lead, setLead] = useState<LeadSession | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<ContactDraft>(blankContact);
  const [zip, setZip] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const steps = useMemo(() => product ? getSteps(product, answers) : [], [product, answers]);
  const step = steps[stepIndex];

  useEffect(() => {
    document.title = product ? `${product[0].toUpperCase()}${product.slice(1)} insurance quote | PolicyWell` : "Quote request | PolicyWell";
    const robots = document.querySelector('meta[name="robots"]');
    robots?.setAttribute("content", "noindex, nofollow");
    let active = true;
    getCurrentLead().then((saved) => {
      if (!active || !product || saved.product !== product) return;
      setLead(saved);
      setZip(saved.zip);
      setAnswers(saved.answers);
      if (saved.contact) setContact(saved.contact);
      if (saved.progressPercent === 100) {
        setLocation(`/quote/${product}/results`);
        return;
      }
      const savedSteps = getSteps(product, saved.answers);
      const index = savedSteps.findIndex((item) => item.key === saved.currentStep);
      setStepIndex(index >= 0 ? index : 0);
    }).catch(() => {
      // A missing session is the normal first-visit state.
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [product, setLocation]);

  if (!product) return <main className="not-found"><h1>That quote page isn’t available.</h1><Link href="/" className="button-primary">Return to PolicyWell</Link></main>;
  if (loading) return <main className="quote-page"><div className="form-panel" aria-live="polite"><p>Checking for a saved quote request…</p></div></main>;

  const begin = (started: LeadSession) => {
    setLead(started);
    setZip(started.zip);
    setAnswers(started.answers);
    setStepIndex(0);
    setLoading(false);
  };

  const writeAnswer = (key: string, value: unknown) => {
    setAnswers((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const writeRecordField = (kind: "vehicle" | "driver", index: number, key: string, value: string) => {
    const listKey = kind === "vehicle" ? "vehicles" : "drivers";
    setAnswers((previous) => {
      const existing = list(previous[listKey]);
      const next = Array.from({ length: Math.max(existing.length, index + 1) }, (_, itemIndex) => existing[itemIndex] ?? {});
      next[index] = { ...next[index], [key]: value };
      return { ...previous, [listKey]: next };
    });
    setFieldErrors((previous) => ({ ...previous, [`${kind}-${index}-${key}`]: "" }));
  };

  function validate(stepToValidate: FlowStep) {
    const errors: Record<string, string> = {};
    if (stepToValidate.kind === "choice") {
      if (!answers[stepToValidate.answerKey ?? ""]) errors.answer = "Choose one option to continue.";
    } else if (stepToValidate.kind === "multi") {
      if (!Array.isArray(answers[stepToValidate.answerKey ?? ""]) || !(answers[stepToValidate.answerKey ?? ""] as unknown[]).length) errors.answer = "Choose at least one option.";
    } else if (stepToValidate.kind === "fields" || stepToValidate.kind === "vehicle" || stepToValidate.kind === "driver") {
      stepToValidate.fields?.forEach((field) => {
        if (!String(fieldValue(answers, field, stepToValidate) ?? "").trim()) errors[field.key] = "Please enter this information.";
      });
    } else if (stepToValidate.kind === "contact") {
      if (!contact.firstName.trim()) errors.firstName = "Enter your first name.";
      if (!contact.lastName.trim()) errors.lastName = "Enter your last name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = "Enter an email address in a format like name@example.com.";
      if (contact.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a phone number with at least 10 digits.";
      if (!contact.contactConsent) errors.contactConsent = "Please agree to the quote-request contact notice.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveProgress(nextIndex: number, nextKey: string) {
    if (!lead) return;
    const progressPercent = Math.min(95, Math.round((nextIndex / Math.max(steps.length, 1)) * 95));
    await updateCurrentLead({
      currentStep: nextKey,
      progressPercent,
      answers: { ...answers, zip: lead.zip },
      contact: contact.contactConsent ? contact : null,
    });
  }

  async function next() {
    if (!step || !validate(step)) return;
    if (step.kind === "review") {
      if (!lead || !contact.contactConsent) {
        setError("Complete the contact step and consent before continuing.");
        return;
      }
      setSaving(true);
      setError("");
      try {
        await updateCurrentLead({
          currentStep: "results",
          progressPercent: 100,
          answers: { ...answers, zip: lead.zip },
          contact,
        });
        setLocation(`/quote/${product}/results`);
      } catch {
        setError("We couldn’t finish saving your request. Your answers are still here—please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (step.kind === "choice" && step.answerKey === "vehicleCount") {
      const count = countFrom(answers.vehicleCount);
      const existing = list(answers.vehicles);
      setAnswers((previous) => ({ ...previous, vehicles: Array.from({ length: count }, (_, index) => existing[index] ?? {}) }));
    }
    if (step.kind === "choice" && step.answerKey === "driverCount") {
      const count = countFrom(answers.driverCount);
      const existing = list(answers.drivers);
      setAnswers((previous) => ({ ...previous, drivers: Array.from({ length: count }, (_, index) => existing[index] ?? {}) }));
    }
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    const nextStep = steps[nextIndex];
    if (!nextStep) return;
    setSaving(true);
    setError("");
    try {
      if (lead) await saveProgress(nextIndex + 1, nextStep.key);
      setStepIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn’t save this step. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function goBack() {
    if (stepIndex <= 0) return;
    const previousIndex = stepIndex - 1;
    try {
      if (lead && steps[previousIndex]) await saveProgress(previousIndex + 1, steps[previousIndex].key);
      setStepIndex(previousIndex);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We couldn’t save your changes before going back. Please try again.");
    }
  }

  async function removeSavedLead() {
    if (!window.confirm("Delete this saved quote request and all of its answers? This cannot be undone.")) return;
    try {
      await deleteCurrentLead();
      setLead(null);
      setAnswers({});
      setContact(blankContact);
      setZip("");
      setStepIndex(0);
      setLocation("/");
    } catch {
      setError("We couldn’t delete this request just now. Please try again.");
    }
  }

  const setField = (field: Field, value: string) => {
    if (step.kind === "vehicle" || step.kind === "driver") {
      writeRecordField(step.kind, step.index ?? 0, field.key, value);
    } else {
      writeAnswer(field.key, value);
    }
  };

  const renderField = (field: Field) => {
    const value = fieldValue(answers, field, step);
    const recordErrorKey = step.kind === "vehicle" || step.kind === "driver" ? `${step.kind}-${step.index ?? 0}-${field.key}` : field.key;
    const errorKey = fieldErrors[recordErrorKey] ?? fieldErrors[field.key];
    const common = {
      id: `${step.key}-${field.key}`,
      "aria-invalid": !!errorKey,
      "aria-describedby": errorKey ? `${step.key}-${field.key}-error` : undefined,
    };
    return <label className="field flow-field" key={field.key}><span>{field.label}</span>
      {field.options ? <select {...common} value={String(value ?? "")} onChange={(event) => setField(field, event.target.value)}><option value="">Choose an answer</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> :
        <input {...common} type={field.type ?? "text"} value={String(value ?? "")} placeholder={field.placeholder} inputMode={field.type === "number" ? "numeric" : undefined} onChange={(event) => setField(field, event.target.value)} />}
      {errorKey && <small id={`${step.key}-${field.key}-error`} className="field-error" role="alert">{errorKey}</small>}
    </label>;
  };

  const currentAnswer = step?.answerKey ? answers[step.answerKey] : undefined;
  return <><main className="quote-page flow-page">
    <div className="quote-topline">
      <Link href={`/${product}-insurance`} className="back-link"><ArrowLeft size={17} /> Back to {product === "commercial" ? "business" : product} insurance</Link>
      <span><LockKeyhole size={14} /> Your progress is saved as you go</span>
    </div>
    {!lead ? <section className="flow-start">
      <span className="eyebrow-pill"><span className="pill-dot" /> {product === "commercial" ? "Business" : product} insurance</span>
      <h1>Let’s start with your ZIP code.</h1>
      <p>We’ll save your progress in PolicyWell so you can continue later. No carrier receives your answers at this stage.</p>
      <StartQuoteForm defaultProduct={product} allowProductChoice={false} onStarted={begin} />
      <Link href="/" className="text-link"><ArrowLeft size={15} /> Choose a different starting point</Link>
    </section> : <div className="flow-content">
      <div className="quote-progress">
        <div className="progress-label"><span>{step?.title ?? "Your quote request"}</span><span>Step {stepIndex + 1} of {steps.length}</span></div>
        <div className="progress-track"><span style={{ width: `${Math.max(2, Math.round((stepIndex / Math.max(steps.length - 1, 1)) * 100))}%` }} /></div>
      </div>
      <section className="form-panel flow-card" aria-live="polite">
        <div className="flow-step-header"><span className="eyebrow-pill"><span className="pill-dot" /> {product === "commercial" ? "Business" : product} insurance</span><button className="flow-delete" type="button" onClick={removeSavedLead}><Trash2 size={15} /> Delete my saved answers</button></div>
        <h1>{step?.title}</h1><p className="form-intro">{step?.description}</p>
        {step?.kind === "choice" && <div className="flow-choice-grid">
          {step.options?.map((option) => {
            const selected = String(currentAnswer ?? "") === option;
            return <button type="button" key={option} className={`flow-choice ${selected ? "is-selected" : ""}`} aria-pressed={selected} onClick={() => writeAnswer(step.answerKey ?? "", option)}>
              <span>{option}</span>{selected && <Check size={18} />}
            </button>;
          })}
          {fieldErrors.answer && <small className="field-error" role="alert">{fieldErrors.answer}</small>}
        </div>}
        {step?.kind === "multi" && <div className="flow-choice-grid">
          {step.options?.map((option) => {
            const chosen = Array.isArray(currentAnswer) ? currentAnswer.includes(option) : false;
            return <button type="button" key={option} className={`flow-choice ${chosen ? "is-selected" : ""}`} aria-pressed={chosen} onClick={() => {
              const existing = Array.isArray(currentAnswer) ? currentAnswer as string[] : [];
              writeAnswer(step.answerKey ?? "", chosen ? existing.filter((item) => item !== option) : [...existing, option]);
            }}><span>{option}</span>{chosen && <Check size={18} />}</button>;
          })}
          {fieldErrors.answer && <small className="field-error" role="alert">{fieldErrors.answer}</small>}
        </div>}
        {(step?.kind === "fields" || step?.kind === "vehicle" || step?.kind === "driver") && <div className="form-grid flow-fields">{step.fields?.map(renderField)}</div>}
        {step?.kind === "contact" && <div className="form-grid flow-fields">
          {([
            ["firstName", "First name", "text", "Given name"],
            ["lastName", "Last name", "text", "Family name"],
            ["email", "Email address", "email", "you@example.com"],
            ["phone", "Phone number", "tel", "(555) 555-5555"],
          ] as const).map(([key, label, type, autoComplete]) => <label className="field flow-field" key={key} htmlFor={`contact-${key}`}>
            <span>{label}</span><input id={`contact-${key}`} type={type} autoComplete={autoComplete} value={contact[key]} aria-invalid={!!fieldErrors[key]} onChange={(event) => { setContact((previous) => ({ ...previous, [key]: event.target.value })); setFieldErrors((previous) => ({ ...previous, [key]: "" })); }} />
            {fieldErrors[key] && <small className="field-error" role="alert">{fieldErrors[key]}</small>}
          </label>)}
          <label className="contact-consent"><input type="checkbox" checked={contact.contactConsent} onChange={(event) => { setContact((previous) => ({ ...previous, contactConsent: event.target.checked })); setFieldErrors((previous) => ({ ...previous, contactConsent: "" })); }} /><span>I agree PolicyWell may use these details to respond to this quote request. This does not sign me up for marketing messages.</span></label>
          {fieldErrors.contactConsent && <small className="field-error consent-error" role="alert">{fieldErrors.contactConsent}</small>}
          <p className="privacy-callout flow-privacy"><LockKeyhole size={17} /><span>Your contact details are saved with this request. They are not sent to a carrier; no live carrier service is connected yet.</span></p>
        </div>}
        {step?.kind === "review" && <div className="review-group flow-review"><dl>
          {stepSummaries(product, answers, contact, lead.zip).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl><div className="privacy-callout flow-privacy"><CircleHelp size={18} /><span>Next you’ll see fictional sample options, clearly marked as illustrative. They are not real carrier quotes and cannot be purchased or bound.</span></div></div>}
        {error && <p className="flow-error" role="alert">{error}</p>}
        <div className="form-actions spread flow-actions">
          <button type="button" className="button-secondary" onClick={goBack} disabled={saving || stepIndex === 0}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="button-primary" onClick={next} disabled={saving}>{saving ? "Saving…" : step?.kind === "review" ? "View sample options" : "Continue"}<ArrowRight size={17} /></button>
        </div>
      </section>
    </div>}
  </main></>;
}

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function QuoteResultsPage({ product: productParam }: { product: string }) {
  const product = (["auto", "home", "commercial"].includes(productParam) ? productParam : null) as InsuranceProduct | null;
  const [, setLocation] = useLocation();
  const [lead, setLead] = useState<LeadSession | null>(null);
  const [quotes, setQuotes] = useState<QuoteCollection | null>(null);
  const [sort, setSort] = useState<"monthly" | "dueToday" | "sixMonthTotal">("monthly");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Illustrative sample options | PolicyWell";
    document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex, nofollow");
    let active = true;
    getCurrentLead().then(async (saved) => {
      if (!active) return;
      if (!product || saved.product !== product || saved.progressPercent < 100) {
        setLocation(`/quote/${product ?? "auto"}`);
        return;
      }
      setLead(saved);
      const response = await createIllustrativeQuotes();
      if (active) setQuotes(response);
    }).catch(() => {
      if (active) setError("We couldn’t load the sample options. Return to your saved request and try again.");
    });
    return () => { active = false; };
  }, [product, setLocation]);

  async function removeSavedLead() {
    if (!window.confirm("Delete this saved quote request and all of its answers? This cannot be undone.")) return;
    try {
      await deleteCurrentLead();
      setLocation("/");
    } catch {
      setError("We couldn’t delete this request just now. Please try again.");
    }
  }

  if (!product) return <main className="not-found"><h1>That results page isn’t available.</h1><Link href="/" className="button-primary">Return to PolicyWell</Link></main>;
  if (error) return <main className="quote-page"><section className="form-panel"><h1>Sample options aren’t available.</h1><p className="flow-error" role="alert">{error}</p><Link href={`/quote/${product}`} className="button-primary">Return to your answers<ArrowRight size={16} /></Link></section></main>;
  if (!quotes || !lead) return <main className="quote-page"><section className="form-panel" aria-live="polite"><p>Preparing illustrative sample options…</p></section></main>;
  const sorted = [...quotes.options].sort((a, b) => a[sort] - b[sort]);
  const productLabel = product === "commercial" ? "business" : product;

  return <><main className="results-page">
    <header className="results-header"><Link href="/" className="brand"><span className="brand-mark"><ShieldCheck size={19} /></span><span>PolicyWell</span></Link><button type="button" className="button-secondary results-delete" onClick={removeSavedLead}><Trash2 size={15} /> Delete saved request</button></header>
    <section className="results-intro"><span className="eyebrow-pill"><span className="pill-dot" /> Sample comparison preview</span><h1>Example options for your {productLabel} request.</h1><p>These fictional examples show how a comparison screen could work. No insurer reviewed your details.</p></section>
    <div className="sample-warning"><ShieldCheck size={21} /><div><strong>Illustrative only — not an insurance quote.</strong><p>{quotes.disclaimer} No policy can be purchased or bound from this page.</p></div></div>
    <div className="results-controls"><label>Show prices as<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="monthly">Monthly sample</option><option value="dueToday">Due today sample</option><option value="sixMonthTotal">Six-month sample total</option></select></label><span>{lead.zip} · {productLabel} request</span></div>
    <section className="sample-results-list" aria-label="Illustrative sample options">
      {sorted.map((option, index) => <article className="sample-quote-card" key={option.id}>
        <div className="sample-quote-top"><div><span className="sample-carrier-mark">S{String.fromCharCode(65 + index)}</span><div><span className="sample-label">FICTIONAL SAMPLE</span><h2>{option.carrierName}</h2><p>{option.tier}</p></div></div><div className="sample-price"><strong>{dollars(option[sort])}</strong><span>{sort === "monthly" ? "/ month sample" : sort === "dueToday" ? "due today sample" : "six-month sample"}</span></div></div>
        <ul className="sample-highlights">{option.highlights.map((highlight) => <li key={highlight}><Check size={15} />{highlight}</li>)}</ul>
        <div className="sample-card-actions"><button className="button-secondary" type="button" onClick={() => setExpanded(expanded === option.id ? null : option.id)} aria-expanded={expanded === option.id}>Example details <ChevronDown size={15} /></button><button className="button-primary" type="button" onClick={() => setChosen(option.id)}>{chosen === option.id ? "Sample selected" : "Choose this sample"}<ArrowRight size={16} /></button></div>
        {expanded === option.id && <dl className="sample-coverage">{Object.entries(option.coverage).map(([label, value]) => <div key={label}><dt>{label.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl>}
        {chosen === option.id && <div className="sample-followup" role="status"><BadgeCheck size={18} /><span>This is a display-only selection. No carrier has been contacted and no policy, payment, or binding action is available.</span></div>}
      </article>)}
    </section>
    <div className="results-bottom-actions"><Link href={`/quote/${product}`} className="button-secondary"><ArrowLeft size={16} /> Review or change answers</Link><p>Answers are stored in PolicyWell so you can return to this request. You can delete them at any time from this page.</p></div>
  </main></>;
}
