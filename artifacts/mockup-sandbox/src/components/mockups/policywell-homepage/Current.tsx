import { useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Check, CheckCircle2, ChevronRight,
  Building2, CarFront, Home as HomeIcon, LockKeyhole, Menu, Shield, ShieldCheck, Sparkles,
} from "lucide-react";
import "./_group.css";

type Product = "auto" | "home" | "commercial";
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

function Link({ href, onClick, ...props }: LinkProps) {
  return <a href={href} {...props} onClick={(event: MouseEvent<HTMLAnchorElement>) => { event.preventDefault(); onClick?.(event); }} />;
}

const insuranceProducts: Product[] = ["auto", "home", "commercial"];
const productInfo = {
  auto: { name: "Auto", icon: CarFront },
  home: { name: "Home", icon: HomeIcon },
  commercial: { name: "Commercial", icon: Building2 },
};

function withCampaign(path: string) {
  if (typeof window === "undefined") return path;
  const current = new URLSearchParams(window.location.search);
  const campaign = new URLSearchParams();
  current.forEach((value, key) => {
    if (key.startsWith("utm_") || key === "gclid" || key === "fbclid") campaign.set(key, value);
  });
  const query = campaign.toString();
  if (!query) return path;
  const [pathname, hash] = path.split("#", 2);
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${query}${hash ? `#${hash}` : ""}`;
}

function Brand() {
  return <Link href={withCampaign("/")} aria-label="PolicyWell home" className="brand" data-testid="link-brand"><span className="brand-mark"><Shield size={20} strokeWidth={2.5} /><span /></span><span>PolicyWell</span></Link>;
}

function Header({ minimal = false }: { minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner"><Brand />
    {!minimal && <><nav className={`main-nav ${open ? "nav-open" : ""}`} aria-label="Main navigation">
      <Link href={withCampaign("/auto-insurance")} data-testid="link-auto-nav">Auto</Link><Link href={withCampaign("/home-insurance")} data-testid="link-home-nav">Home</Link><Link href={withCampaign("/commercial-insurance")} data-testid="link-commercial-nav">Business</Link>
      <Link href={withCampaign("/#how-it-works")} data-testid="link-how-it-works" onClick={() => setOpen(false)}>How it works</Link>
    </nav><div className="header-right"><span className="header-reassurance"><LockKeyhole size={15} /> Your details stay with you</span><button className="menu-button" aria-label="Toggle navigation" aria-expanded={open} data-testid="button-menu" onClick={() => setOpen(!open)}><Menu size={21} /></button></div></>}
  </div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-inner"><Brand /><p>Clear choices. A little more peace of mind.</p><span>© {new Date().getFullYear()} PolicyWell</span></div><p className="footer-note">PolicyWell is an insurance comparison experience. Availability of quotes depends on connected insurance services. Submitting information here does not create coverage.</p></footer>;
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="eyebrow-pill"><span className="pill-dot" />{children}</span>;
}

function ProductTile({ product }: { product: Product }) {
  const info = productInfo[product];
  const Icon = info.icon;
  return <article className={`product-tile tile-${product}`} data-testid={`card-product-${product}`}><div className="tile-icon"><Icon size={25} strokeWidth={1.8} /></div><span className="tile-kicker">{info.name} insurance</span><h3>{product === "commercial" ? "For your business" : `For your ${product === "auto" ? "drive" : "home"}`}</h3><p>{product === "auto" ? "Explore the vehicle coverage that fits your everyday." : product === "home" ? "Explore protection for the place you call home." : "Explore protection for the work you’ve built."}</p><Link href={withCampaign(`/${product}-insurance`)} className="tile-link" data-testid={`link-product-${product}`}>Explore {info.name.toLowerCase()} insurance<ArrowUpRight size={17} /></Link></article>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="how-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><CheckCircle2 size={21} /></article>;
}

export function Current() {
  return <div className="min-h-screen">
    <Header />
    <main>
      <section className="home-hero"><div className="hero-inner">
        <div className="hero-copy"><Pill>A better way to compare</Pill><h1>Insurance that feels <em>easier.</em></h1><p className="hero-lede">A few thoughtful questions. A clearer view of what comes next. Find the kind of cover you’re looking for—without the guesswork.</p><div className="hero-actions"><a href="#products" data-testid="link-explore-products" className="button-primary">Explore your options<ArrowRight size={18} /></a><a href="#how-it-works" data-testid="link-home-how-it-works" className="text-link">How PolicyWell works <ChevronRight size={16} /></a></div><div className="hero-assurance"><span><Check size={15} /> No pressure to buy</span><span><LockKeyhole size={15} /> Your details stay in this session</span></div><p className="preview-disclosure">Quote comparison is a preview. Details entered here are not saved or sent.</p></div>
        <div className="hero-art" aria-label="Illustration of home, car, and business protection"><div className="sun-disc" /><div className="art-caption">A little more clarity<br />for the things you care for.</div><div className="art-home"><div className="house-roof" /><div className="house-body"><span className="window window-a" /><span className="window window-b" /><span className="door" /></div></div><div className="art-car"><CarFront size={60} strokeWidth={1.35} /></div><div className="art-shield"><ShieldCheck size={35} /></div><span className="orbit orbit-a" /><span className="orbit orbit-b" /></div>
      </div></section>
      <section id="products" className="product-section section-wrap"><div className="section-heading"><div><Pill>Choose a place to begin</Pill><h2>What would you like to protect?</h2></div><p>Start with one area. You can always come back to explore the others.</p></div><div className="product-grid">
        {insuranceProducts.map((key) => <ProductTile key={key} product={key} />)}
      </div></section>
      <section id="how-it-works" className="how-section"><div className="section-wrap how-layout"><div><Pill>Simple by design</Pill><h2>A good next step,<br /><em>not a big leap.</em></h2><p>Insurance decisions can feel like a lot. PolicyWell keeps the first steps clear and manageable.</p></div><div className="steps-list"><Step number="01" title="Choose what matters" copy="Pick auto, home, or commercial insurance and start with the details you know." /><Step number="02" title="Review as you go" copy="Answer a few short questions. You can check and edit every answer before submitting." /><Step number="03" title="Know what’s next" copy="We’ll tell you plainly when comparison options are ready—and when they’re not." /></div></div></section>
      <section className="closing-cta"><div className="closing-inner"><div><Sparkles size={22} /><h2>Start with one simple question.</h2><p>Which part of your world are you looking to protect?</p></div><a href="#products" className="button-light">Choose a product<ArrowRight size={18} /></a></div></section>
    </main>
    <Footer />
  </div>;
}
