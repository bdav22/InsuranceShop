import "./_group.css";
import "./ComparisonFirst.css";
import { useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  Home as HomeIcon,
  LockKeyhole,
  Shield,
  Sparkles,
} from "lucide-react";

type Product = "auto" | "home" | "commercial";

const products: { id: Product; name: string; short: string; icon: typeof CarFront; path: string }[] = [
  { id: "auto", name: "Auto", short: "The way you get there", icon: CarFront, path: "/auto-insurance" },
  { id: "home", name: "Home", short: "The place you come back to", icon: HomeIcon, path: "/home-insurance" },
  { id: "commercial", name: "Business", short: "The work you’re building", icon: Building2, path: "/commercial-insurance" },
];

function ProductLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  );
}

function Brand() {
  return (
    <a className="pw-brand" href="/" aria-label="PolicyWell home" onClick={(event) => event.preventDefault()}>
      <span className="pw-brand-mark" aria-hidden="true"><Shield size={19} strokeWidth={2.2} /><i /></span>
      <span>Policy<span>Well</span></span>
    </a>
  );
}

function WayfinderArt() {
  return (
    <div className="pw-wayfinder" aria-label="Original illustration showing a home, car, and small business on a clear path">
      <div className="pw-art-orbit pw-art-orbit-one" />
      <div className="pw-art-orbit pw-art-orbit-two" />
      <div className="pw-art-sun" />
      <div className="pw-art-path"><span /><span /><span /></div>
      <div className="pw-art-note">
        <span className="pw-note-icon"><Sparkles size={16} /></span>
        <span><b>A clearer first step</b><small>Start with what matters to you</small></span>
      </div>
      <div className="pw-art-house">
        <div className="pw-house-roof" />
        <div className="pw-house-body">
          <span className="pw-house-window pw-window-left" />
          <span className="pw-house-window pw-window-right" />
          <span className="pw-house-door" />
        </div>
        <span className="pw-house-ground" />
      </div>
      <div className="pw-art-car"><CarFront size={52} strokeWidth={1.45} /></div>
      <div className="pw-art-business"><Building2 size={23} strokeWidth={1.8} /><span>YOUR<br />NEXT CHAPTER</span></div>
      <div className="pw-art-stamp"><Shield size={17} /><span>One step<br />at a time</span></div>
      <span className="pw-art-spark spark-one">✳</span>
      <span className="pw-art-spark spark-two">✳</span>
    </div>
  );
}

export function ComparisonFirst() {
  const [selected, setSelected] = useState<Product>("auto");
  const [zip, setZip] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "notice" | "">("");

  function submitZip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip.trim())) {
      setMessage("Enter a 5-digit ZIP code to continue.");
      setMessageType("error");
      return;
    }
    setMessage("This preview isn’t connected to carrier comparisons yet. No information was sent or saved.");
    setMessageType("notice");
  }

  function updateZip(value: string) {
    setZip(value.replace(/\D/g, "").slice(0, 5));
    if (messageType) {
      setMessage("");
      setMessageType("");
    }
  }

  return (
    <div className="pw-compare">
      <header className="pw-header">
        <div className="pw-header-inner">
          <Brand />
          <nav className="pw-nav" aria-label="Insurance products">
            {products.map((product) => <ProductLink key={product.id} href={product.path}>{product.name}</ProductLink>)}
            <a href="#how-it-works">How it works</a>
          </nav>
          <a className="pw-header-cta" href="#start">Start here <ArrowRight size={16} /></a>
        </div>
      </header>

      <main>
        <section className="pw-hero" id="start">
          <div className="pw-hero-inner">
            <div className="pw-hero-copy">
              <div className="pw-kicker"><span className="pw-kicker-dot" /> A steadier way to start</div>
              <h1>Find your<br /><em>way forward.</em></h1>
              <p className="pw-hero-lede">A clearer first step toward insurance for the things you care for. Choose a place to begin, then enter your ZIP.</p>
              <div className="pw-start-card">
                <div className="pw-card-heading">
                  <div>
                    <span className="pw-step-label">YOUR STARTING POINT</span>
                    <h2>What are you looking to protect?</h2>
                  </div>
                  <span className="pw-step-count">01 <i>/ 02</i></span>
                </div>
                <div className="pw-product-picker" role="group" aria-label="Choose an insurance type">
                  {products.map((product) => {
                    const Icon = product.icon;
                    const active = selected === product.id;
                    return (
                      <button
                        className={`pw-product-choice ${active ? "is-selected" : ""}`}
                        key={product.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setSelected(product.id);
                          if (messageType === "notice") {
                            setMessage("");
                            setMessageType("");
                          }
                        }}
                      >
                        <span className="pw-choice-icon"><Icon size={19} strokeWidth={1.8} /></span>
                        <span className="pw-choice-copy"><b>{product.name}</b><small>{product.short}</small></span>
                        <span className="pw-choice-check" aria-hidden="true">{active && <Check size={13} strokeWidth={2.8} />}</span>
                      </button>
                    );
                  })}
                </div>
                <form className="pw-zip-form" onSubmit={submitZip} noValidate>
                  <label htmlFor="pw-zip">Your ZIP code</label>
                  <div className="pw-zip-row">
                    <div className="pw-zip-field">
                      <span className="pw-zip-pin" aria-hidden="true"><span /></span>
                      <input
                        id="pw-zip"
                        name="zip"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        placeholder="Enter 5-digit ZIP"
                        value={zip}
                        aria-invalid={messageType === "error"}
                        aria-describedby="pw-zip-message pw-privacy-note"
                        onChange={(event) => updateZip(event.target.value)}
                      />
                    </div>
                    <button className="pw-submit" type="submit">See next step <ArrowRight size={17} /></button>
                  </div>
                  <p id="pw-zip-message" className={`pw-form-message ${messageType ? `is-${messageType}` : ""}`} role="status" aria-live="polite">
                    {message || "\u00a0"}
                  </p>
                  <div className="pw-privacy-note" id="pw-privacy-note"><LockKeyhole size={13} /> Preview only. Your details stay on this page.</div>
                </form>
              </div>
              <p className="pw-quiet-disclaimer">No quote or comparison is created here. This is a local preview, and nothing you enter is sent or saved.</p>
            </div>
            <WayfinderArt />
          </div>
          <div className="pw-hero-footer">
            <span><span className="pw-footer-mark">01</span> Clear choices, at your pace</span>
            <a href="#products">Meet the three starting points <ArrowDownRight size={15} /></a>
          </div>
        </section>

        <section className="pw-products" id="products">
          <div className="pw-section-top">
            <div><span className="pw-overline">A place to begin</span><h2>One world. Three good starting points.</h2></div>
            <p>You don’t have to figure it all out at once. Start with what’s on your mind today.</p>
          </div>
          <div className="pw-product-list">
            {products.map((product, index) => {
              const Icon = product.icon;
              const descriptions: Record<Product, string> = {
                auto: "For the miles, the daily drives, and the plans that take you somewhere new.",
                home: "For the familiar corners, the people, and the things that make it yours.",
                commercial: "For the livelihood, the late nights, and the ideas you’re bringing to life.",
              };
              return (
                <article className={`pw-product-row pw-row-${product.id}`} key={product.id}>
                  <span className="pw-product-index">0{index + 1}</span>
                  <span className="pw-row-icon"><Icon size={24} strokeWidth={1.7} /></span>
                  <div className="pw-row-copy"><h3>{product.name}</h3><p>{descriptions[product.id]}</p></div>
                  <ProductLink href={product.path}><span className="pw-row-link">Explore {product.name.toLowerCase()} <ArrowUpRight size={17} /></span></ProductLink>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pw-process" id="how-it-works">
          <div className="pw-process-inner">
            <div className="pw-process-intro">
              <span className="pw-overline">No fog, no fine print</span>
              <h2>Know what’s happening<br />at every step.</h2>
              <p>Insurance can feel like a maze. PolicyWell is designed to make the next turn easier to see.</p>
              <a href="#start" className="pw-process-link">Choose where to start <ArrowRight size={16} /></a>
            </div>
            <div className="pw-steps">
              <article className="pw-step">
                <span className="pw-step-number">01</span>
                <div><h3>Pick what matters</h3><p>Start with auto, home, or business—whichever feels most useful today.</p></div>
                <Check size={18} />
              </article>
              <article className="pw-step">
                <span className="pw-step-number">02</span>
                <div><h3>See the next step</h3><p>We’ll explain what information is needed before you choose to continue.</p></div>
                <Check size={18} />
              </article>
              <article className="pw-step">
                <span className="pw-step-number">03</span>
                <div><h3>Stay in the know</h3><p>Comparison options depend on connected carriers. We’ll say plainly when they’re available.</p></div>
                <Check size={18} />
              </article>
            </div>
          </div>
        </section>

        <section className="pw-honesty">
          <div className="pw-honesty-mark"><CircleHelp size={24} strokeWidth={1.7} /></div>
          <div className="pw-honesty-copy"><span className="pw-overline">A note on this preview</span><h2>Clear about what’s here—and what isn’t.</h2><p>The carrier comparison service is not connected in this preview. The ZIP form only checks your entry locally; it won’t generate a quote, create a comparison, or save a lead.</p></div>
          <a href="#start" className="pw-honesty-link">Back to the start <ChevronDown size={15} /></a>
        </section>
      </main>

      <footer className="pw-footer">
        <div className="pw-footer-main">
          <Brand />
          <p>Clear choices. A little more peace of mind.</p>
          <span>© {new Date().getFullYear()} PolicyWell</span>
        </div>
        <div className="pw-footer-bottom">
          <span>PolicyWell is an insurance comparison experience. Availability of options depends on connected insurance services.</span>
          <span>Preview only · Details entered are not saved or sent</span>
        </div>
      </footer>
    </div>
  );
}
