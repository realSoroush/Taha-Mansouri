import { ArrowUpLeft, ArrowRight, BookOpen, Bell, MessageCircle } from 'lucide-react';
import { content as c } from './content';

export function CoursesPage() {
  const p = c.coursesPage;
  return <main id="main" className="courses-page">
    <section className="container section courses-intro" aria-labelledby="courses-title">
      <nav className="breadcrumb" aria-label="مسیر صفحه"><a href="/">{p.breadcrumb}</a><span aria-hidden="true">/</span><span aria-current="page">{p.title}</span></nav>
      <p className="eyebrow">{p.eyebrow}</p>
      <h1 id="courses-title">{p.title}<br/><span className="accent">{p.accent}</span></h1>
      <p className="section-intro">{p.description}</p>
      <div className="courses-status">
        <div className="courses-status-symbol" aria-hidden="true"><BookOpen size={48} strokeWidth={1.2}/></div>
        <div><span className="pill">{p.status}</span><h2>{p.emptyTitle}</h2><p>{p.emptyText}</p>
          <a className="button" href="/#course-waitlist"><Bell size={19}/>{c.leadForm.navLabel}<ArrowUpLeft size={18}/></a>
        </div>
      </div>
      <div className="courses-help"><div><h2>{p.question}</h2><a className="text-link" href={c.contact.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/>{p.contactCta}<ArrowUpLeft size={17}/></a></div><a className="text-link" href="/"><ArrowRight size={18}/>{p.back}</a></div>
    </section>
  </main>;
}
