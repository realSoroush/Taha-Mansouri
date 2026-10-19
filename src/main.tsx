import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpLeft, ArrowDown, ArrowLeft, Menu, X, Compass, TrendingUp, Users, Fingerprint, ChartNoAxesCombined, Phone, MessageCircle, Send, Instagram, MoveUpRight, Plus } from 'lucide-react';
import '@fontsource-variable/vazirmatn';
import { content as c } from './content';
import './styles.css';
import './additions.css';
import { HeroVideo } from './HeroVideo';
import { LeadForm } from './LeadForm';
import { CoursesPage } from './CoursesPage';
import './course-pages.css';
import './theme.css';

const icons = { compass: Compass, growth: TrendingUp, team: Users, brand: Fingerprint, finance: ChartNoAxesCombined };
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isCourses = /^\/courses(?:\/|\/index\.html)?$/.test(window.location.pathname);
  const navHref = (href: string) => isCourses && href.startsWith('#') ? '/' + href : href;
  const phoneLink = `tel:${c.contact.phone}`;
  return <>
    <a className="skip-link" href="#main">رفتن به محتوای اصلی</a>
    <header className="header"><div className="container header-inner">
      <a href="/" className="brand" aria-label="طاها منصوری — ابتدای صفحه"><img className="brand-logo" src="/images/taha-brand.webp" alt="" width="64" height="64"/><span><strong>{c.brand.name}</strong><small>{c.brand.role}</small></span></a>
      <nav className="desktop-nav" aria-label="منوی اصلی">{c.navigation.map(n => <a key={n.href} href={navHref(n.href)}>{n.label}</a>)}</nav>
      <a className="button button-small header-cta" href={c.headerCta.href}>{c.headerCta.label}<ArrowUpLeft size={18}/></a>
      <button className="menu-toggle" aria-label={menuOpen ? 'بستن منو' : 'بازکردن منو'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
    </div>{menuOpen && <nav id="mobile-menu" className="mobile-nav" aria-label="منوی موبایل" onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false); }}>{c.navigation.map(n => <a key={n.href} href={navHref(n.href)} onClick={() => setMenuOpen(false)}>{n.label}</a>)}<a href={navHref("#course-waitlist")} onClick={() => setMenuOpen(false)}>{c.leadForm.navLabel}</a></nav>}</header>
    {isCourses ? <CoursesPage/> : <main id="main">
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><span/>{c.hero.eyebrow}</p><h1 id="hero-title">{c.hero.lines.map((line, i) => <span key={i} className={i === 1 ? 'accent' : ''}>{line}</span>)}</h1><p className="hero-description">{c.hero.description}</p><div className="hero-actions"><a href={c.hero.primaryHref} className="button">{c.hero.primaryCta}<ArrowUpLeft size={20}/></a><a href={c.hero.secondaryHref} className="text-link">{c.hero.secondaryCta}<ArrowDown size={18}/></a></div><p className="hero-note"><span className="note-line"/>{c.hero.note}</p></div>
        <div className="hero-visual has-video"><div className="portrait-frame"><HeroVideo/><span className="frame-corner"/><div className="portrait-caption"><span><strong>{c.brand.name}</strong><small lang="en" dir="ltr">{c.brand.english}</small></span><ArrowUpLeft size={32}/></div></div><div className="visual-note"><span className="mini-symbol" aria-hidden="true"><MoveUpRight size={25}/></span><span>{c.hero.signature}</span></div><span className="vertical-label" lang="en">A CLEARER WAY FORWARD</span></div>
      </section>
      <section className="principles container" aria-label="مسیرهای همراهی با طاها">{c.principles.map(p => <div className="principle" key={p.number}><span className="index">{p.number}</span><div><h2>{p.title}</h2><p>{p.text}</p></div></div>)}</section>
      <section id="about" className="about section surface-light"><div className="container about-layout"><div className="about-statement">{c.about.photo ? <img src={c.about.photo} alt={c.about.photoAlt} loading="lazy"/> : <><span className="quote-mark" aria-hidden="true">“</span><p>{c.about.quote}</p><span className="statement-signature">{c.brand.name}<img className="signature-logo" src="/images/taha-brand.webp" alt="" width="48" height="48" loading="lazy"/></span></>}</div><div className="about-copy"><p className="eyebrow">{c.about.eyebrow}</p><h2>{c.about.title}<br/><span className="accent">{c.about.accent}</span></h2><p>{c.about.description}</p><p>{c.about.secondParagraph}</p><a href={c.about.linkHref} className="text-link">{c.about.linkLabel}<ArrowUpLeft size={20}/></a></div></div></section>
      <section id="education" className="education course-highlight section surface-navy"><div className="container education-inner"><div><p className="eyebrow">{c.education.eyebrow}</p><h2>{c.education.title}</h2><p>{c.education.description}</p><div className="education-actions"><a className="button" href={c.education.href}>{c.education.cta}<ArrowUpLeft size={20}/></a><span className="pill">{c.education.badge}</span></div><small>{c.education.note}</small></div></div></section>
      <section className="audience section surface-light"><div className="container audience-layout"><div><p className="eyebrow">{c.audience.eyebrow}</p><h2>{c.audience.title}</h2><p className="section-intro">{c.audience.description}</p></div><div className="industry-list">{c.audience.items.map((item, i) => <div key={item}><span className="industry-number">۰{['۱','۲','۳','۴','۵','۶'][i] || i+1}</span><span>{item}</span><Plus size={16} aria-hidden="true"/></div>)}</div></div></section>
      <section id="services" className="section surface-navy"><div className="container"><div className="section-heading"><div><p className="eyebrow">{c.services.eyebrow}</p><h2>{c.services.title}<br/><span className="muted-title">{c.services.accent}</span></h2></div><p className="section-intro">{c.services.description}</p></div><div className="services-grid">{c.services.items.map((s, i) => { const Icon = icons[s.icon as keyof typeof icons] || Compass; return <article className={`service-card service-${i}`} key={s.title}><div className="service-top"><Icon size={28} strokeWidth={1.5}/><span dir="ltr">0{i+1}</span></div><h3>{s.title}</h3><p>{s.text}</p></article>; })}<div className="service-invite"><span className="invite-symbol" aria-hidden="true"><ArrowUpLeft size={48} strokeWidth={1}/></span><p>{c.services.footer}</p><a href="#contact" className="text-link">{c.contact.cta}<ArrowLeft size={18}/></a></div></div></div></section>
      <section id="process" className="process section surface-light"><div className="container"><div className="section-heading"><div><p className="eyebrow">{c.process.eyebrow}</p><h2>{c.process.title}</h2></div><span className="pill">{c.process.badge}</span></div><p className="process-description">{c.process.description}</p><div className="process-grid">{c.process.items.map((item,i) => <article key={item.title}><div className="step-number">{['۰۱','۰۲','۰۳'][i]}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>
      {c.work.visible && <section id="work" className="work section surface-light"><div className="container"><div className="section-heading"><div><p className="eyebrow">{c.work.eyebrow}</p><h2>{c.work.title}</h2></div><p className="section-intro">{c.work.description}</p></div><div className="work-grid">{c.work.items.map((w, i) => <article key={i}><div className="work-image">{w.image ? <img src={w.image} alt={w.alt} loading="lazy"/> : <><span className="work-monogram" aria-hidden="true">0{i+1}</span><span className="work-placeholder-label">جای تصویر پروژه</span></>}</div><div className="work-caption"><h3>{w.title}</h3><span>{w.text}</span></div></article>)}</div></div></section>}
      <LeadForm/>
      <section id="contact" className="contact section surface-light"><div className="container contact-layout"><div><p className="eyebrow">شروع همکاری</p><h2>{c.contact.heading}<br/>{c.contact.accent}</h2><p>{c.contact.description}</p><small>{c.contact.note}</small></div><div className="contact-links"><a className="call-link" href={phoneLink}><span>تماس برای هماهنگی</span><strong dir="ltr">{c.contact.display}</strong><Phone size={25}/></a><div className="messengers"><a href={c.contact.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={20}/>واتساپ<ArrowUpLeft size={17}/></a><a href={c.contact.telegram} target="_blank" rel="noopener noreferrer"><Send size={20}/>تلگرام<ArrowUpLeft size={17}/></a></div></div></div></section>
    </main>}
    <footer className="footer container"><div className="footer-top"><div><a href="/" className="brand"><img className="brand-logo" src="/images/taha-brand.webp" alt="" width="64" height="64"/><strong>{c.brand.name}</strong></a><p>{c.footer.text}</p></div><a className="instagram" href={c.contact.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={20}/> همراه ما در اینستاگرام<ArrowUpLeft size={18}/></a></div><div className="footer-bottom"><span>{c.footer.copyright}</span><span dir="ltr" lang="en">TAHA MANSOURI — EDUCATION & CONSULTING</span></div></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
