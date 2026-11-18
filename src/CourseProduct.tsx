import { useEffect, useState } from 'react';
import { BookOpen, ArrowUpLeft, Download, Check, Sparkles, ChevronDown, FileText, Layers3, MessageSquareQuote } from 'lucide-react';
import course from './customer-objections.json';
import { coursePath } from './course-paths';
import { content } from './content';

export const coursePrice = new Intl.NumberFormat('fa-IR').format(course.priceToman) + ' تومان';
const api = '/api/course-purchase';
const orderKey = 'taha-customer-objections-order';
export const courseReturnPath = coursePath + 'return/';
function externalCheckout() {
  try {
    const url = new URL(import.meta.env.VITE_COURSE_PAYMENT_LINK ?? '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
const paymentLink = externalCheckout();
const checkoutEnabled = import.meta.env.VITE_COURSE_CHECKOUT_ENABLED === 'true';
const externalDownloadEnabled = import.meta.env.VITE_COURSE_EXTERNAL_DOWNLOAD_ENABLED === 'true';
const pageCount = new Intl.NumberFormat('fa-IR').format(course.pages);
const orderPattern = /^[a-f0-9-]{36}$/;

async function call(action: string, order?: string, method = 'GET') {
  const query = new URLSearchParams({ action, ...(order ? { order } : {}) });
  const response = await fetch(api + '?' + query, { method, cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function savedOrder() {
  try { return localStorage.getItem(orderKey); } catch { return null; }
}

const sections = [
  ['overview', 'معرفی'],
  ['topics', 'سرفصل‌ها'],
  ['sample', 'نمونهٔ پاسخ'],
  ['faq', 'سؤالات متداول'],
];
const takeaways = [
  'بفهمی «گرونه» یعنی محدودیت بودجه یا مقایسه با رقیب.',
  'وقتی مشتری می‌گه «بذار فکر کنم»، دلیل تردیدش رو پیدا کنی.',
  'با سؤال مناسب، نیاز مشتری رو روشن کنی و اعتمادش رو جلب کنی.',
  'در دایرکت و پیام، گفت‌وگو رو بعد از اولین مخالفت ادامه بدی.',
];
const authorPhoto = '/images/taha-course-author.webp';

export function CourseProduct() {
  const order = new URLSearchParams(location.search).get('order');
  const validOrder = order && orderPattern.test(order) ? order : null;
  const previousOrder = savedOrder();
  const [state, setState] = useState('idle');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!validOrder) return;
    let active = true;
    call('status', validOrder).then(data => {
      if (active) setState(data.paid ? 'paid' : 'pending');
    }).catch(error => {
      if (active) setState(error instanceof Error && error.message === '404' ? 'notfound' : 'error');
    });
    return () => { active = false; };
  }, [validOrder]);

  async function start() {
    setBusy(true);
    setState('idle');
    try {
      const data = await call('start', undefined, 'POST');
      const url = new URL(data.gateway);
      if (url.origin !== 'https://www.zarinpal.com' || !url.pathname.startsWith('/pg/StartPay/') || !orderPattern.test(data.order)) throw new Error();
      try { localStorage.setItem(orderKey, data.order); } catch { /* Cookie still authorizes the callback result. */ }
      location.assign(url.href);
    } catch { setState('start-error'); setBusy(false); }
  }

  async function recover() {
    if (!validOrder) return;
    setBusy(true);
    try { setState((await call('recover', validOrder, 'POST')).paid ? 'paid' : 'pending'); }
    catch (error) { setState(error instanceof Error && error.message === '404' ? 'notfound' : 'error'); }
    finally { setBusy(false); }
  }

  const purchaseAvailable = !validOrder && (checkoutEnabled || Boolean(paymentLink));

  return <main id="main" className="course-product" aria-labelledby="product-title">
    <div className="product-shell">
      <div className="product-masthead">
        <span><BookOpen size={19} aria-hidden="true"/> مجموعهٔ آموزش فروش</span>
        <a href="/" aria-label="بازگشت به صفحهٔ اصلی">صفحهٔ اصلی <ArrowUpLeft size={15} aria-hidden="true"/></a>
      </div>
      <div className="product-layout">
        <section className="product-intro">
          <p className="product-kicker">راهنمای عملی فروش <span aria-hidden="true"/> {course.author}</p>
          <h1 id="product-title">{course.title}</h1>
          <p className="product-hook">{course.headline}</p>
          <p className="product-summary">{course.summary}</p>
          <ul className="product-badges" aria-label="مشخصات راهنما">
            <li><FileText size={16} aria-hidden="true"/> فایل PDF</li>
            <li>{pageCount} صفحه</li>
            <li>{new Intl.NumberFormat('fa-IR').format(course.objectionCount)} اعتراض رایج</li>
          </ul>
        </section>

        <aside className="product-sidebar" aria-label="خرید و مشخصات راهنما">
          <section id="purchase" className="product-buy" aria-labelledby="purchase-title">
            <div className="product-cover">
              <img src={authorPhoto} alt="" width="640" height="640"/>
              <div className="product-cover-copy">
                <span className="product-cover-format"><BookOpen size={15} aria-hidden="true"/> راهنمای فروش</span>
                <span className="product-cover-number">{new Intl.NumberFormat('fa-IR').format(course.objectionCount)}</span>
                <span className="product-cover-caption">اعتراض رایج مشتری</span>
              </div>
            </div>
            <div className="product-price">
              <h2 id="purchase-title">نسخهٔ دیجیتال</h2>
              <strong>{coursePrice}</strong>
            </div>
            {validOrder ? <>
              <p role="status">{({ idle: 'در حال بررسی سفارش…', paid: 'پرداخت تأیید شد.', pending: 'پرداخت هنوز تأیید نشده است.', error: 'بررسی موقتاً در دسترس نیست. دوباره تلاش کنید.', notfound: 'سفارش در این مرورگر در دسترس نیست. از مرورگری که با آن خرید کردید استفاده کنید.' } as Record<string,string>)[state]}</p>
              {state === 'paid' ? <a className="button" href={api + '?action=download&order=' + validOrder}><Download size={17}/> دانلود PDF</a>
                : state !== 'notfound' && state !== 'idle' && <button className="button" disabled={busy} onClick={recover}>بررسی دوبارهٔ پرداخت</button>}
              <p>شماره سفارش: <bdi className="order-number">{validOrder}</bdi></p>
              {state === 'pending' && <a className="text-link" href={coursePath}>بازگشت به صفحهٔ خرید</a>}
            </> : <>
              {checkoutEnabled ? <button className="button" disabled={busy} onClick={start}>{busy ? 'در حال اتصال به درگاه…' : 'خرید راهنمای PDF'}<ArrowUpLeft size={18} aria-hidden="true"/></button> : paymentLink ? <>
                <a className="button" href={paymentLink}>خرید راهنمای PDF <ArrowUpLeft size={18} aria-hidden="true"/></a>
                <p className="product-payment-note">پرداخت با زرین‌پال{externalDownloadEnabled ? ' · دانلود پس از پرداخت' : ' · کد پیگیری را برای دریافت فایل نگه دارید'}</p>
              </> : <p>فروش آنلاین هنوز فعال نشده است.</p>}
              {state === 'start-error' && <p role="alert">اتصال به درگاه ممکن نشد. دوباره تلاش کنید.</p>}
              {previousOrder && orderPattern.test(previousOrder) && <a className="text-link" href={coursePath + '?order=' + previousOrder}>پیگیری آخرین خرید</a>}
            </>}
          </section>
          <section className="product-author-card">
            <img src={authorPhoto} alt="" width="48" height="48"/>
            <div><h2>{course.author}</h2><p>نویسندهٔ راهنما و مدرس کسب‌وکار</p></div>
          </section>
          <section className="product-facts">
            <h2>در این راهنما</h2>
            <ul>
              <li><MessageSquareQuote size={18} aria-hidden="true"/> نمونهٔ پاسخ برای اعتراض‌های مشتری</li>
              <li><Layers3 size={18} aria-hidden="true"/> {new Intl.NumberFormat('fa-IR').format(course.topics.length)} موضوع از قیمت تا فروش آنلاین</li>
              <li><FileText size={18} aria-hidden="true"/> فایل قابل مطالعه روی موبایل و کامپیوتر</li>
            </ul>
          </section>
        </aside>

        <div className="product-content">
          <nav className="product-jumps" aria-label="بخش‌های صفحهٔ محصول">
            {sections.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
          </nav>
          <section id="overview" className="product-section">
            <h2>این راهنما کجا به کارت می‌آد؟</h2>
            <p>اگر حضوری، تلفنی یا در دایرکت می‌فروشی، می‌تونی قبل از مکالمهٔ بعدی سراغ همان اعتراضی بری که بیشتر می‌شنوی و تمرین کنی چطور جوابش رو بدی.</p>
            <ul className="product-takeaways">{takeaways.map(item => <li key={item}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul>
          </section>
          <section id="topics" className="product-section">
            <h2>سرفصل‌های راهنما</h2>
            <ol className="product-topics">{course.topics.map((topic, i) => <li key={topic}><span aria-hidden="true">{new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2 }).format(i + 1)}</span>{topic}</li>)}</ol>
          </section>
          <section id="sample" className="product-section product-sample">
            <p className="product-kicker"><MessageSquareQuote size={18} aria-hidden="true"/> نمونه‌ای از صفحهٔ {new Intl.NumberFormat('fa-IR').format(course.sample.page)}</p>
            <h2>{course.sample.question}</h2>
            <blockquote>{course.sample.answer}</blockquote>
            <p>{course.sample.explanation}</p>
          </section>
          <section id="faq" className="product-section">
            <h2>سؤالات متداول</h2>
            <div className="product-faq">{course.faq.map(([question, answer], index) => <details key={question}>
              <summary>{question}<ChevronDown size={18} aria-hidden="true"/></summary>
              <p>{index === 1 && !checkoutEnabled && paymentLink ? (externalDownloadEnabled ? 'پس از بازگشت از زرین‌پال، روی «دانلود فایل PDF» بزنید و فایل را ذخیره کنید.' : 'کد پیگیری زرین‌پال را نگه دارید. برای دریافت فایل پس از بررسی پرداخت، از بخش تماس پیگیری کنید.') : answer}</p>
            </details>)}</div>
          </section>
          {purchaseAvailable && <div className="product-next"><p>برای مکالمهٔ بعدی فروش آماده‌ای؟</p><a className="button" href="#purchase">رفتن به بخش خرید <ArrowUpLeft size={17} aria-hidden="true"/></a></div>}
        </div>
      </div>
    </div>
  </main>;
}


export function CourseReturn() {
  return <main id="main" className="container section course-return">
    <article className="product-panel course-return-card">
      <div className="course-return-icon"><Sparkles size={30} aria-hidden="true"/></div>
      <p className="eyebrow">راهنمای فروش · {course.author}</p>
      <h1>راهنمای تو آماده است!</h1>
      <p className="course-return-meta">{course.title} · {pageCount} صفحه · PDF</p>
      <p className="course-return-lead">برای گفت‌وگوی بعدی فروش آماده‌ای؟ فایل را ذخیره کن و از اعتراضی شروع کن که بیشتر از همه می‌شنوی.</p>
      <div className="course-return-actions">
        {externalDownloadEnabled
          ? <a className="button" href={api + '?action=external-download'}><Download size={20} aria-hidden="true"/> دانلود فایل PDF</a>
          : <p role="status">دانلود از این صفحه هنوز فعال نشده است.</p>}
        <a className="button" style={{ background: "#25D366", color: "#08351b", borderColor: "#25D366" }} href={content.contact.whatsapp} target="_blank" rel="noopener noreferrer"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.04 0C5.47 0 .12 5.35.12 11.92c0 2.1.55 4.16 1.59 5.97L.02 24l6.25-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.57 0 11.92-5.35 11.92-11.92 0-3.18-1.24-6.17-3.45-8.43Zm-8.48 18.34a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.86 9.86 0 0 1-1.52-5.29c0-5.46 4.44-9.9 9.9-9.9a9.83 9.83 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.46-4.44 9.9-9.91 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"/></svg> پشتیبانی در واتساپ</a>
        <a className="text-link" href={coursePath}>صفحهٔ محصول</a>
      </div>
      {new URLSearchParams(location.search).get('download') === 'unavailable' && <p role="alert">دانلود موقتاً در دسترس نیست. کمی بعد دوباره تلاش کن.</p>}
      <p style={{ lineHeight: 1.9, marginTop: 20 }}>اگر نتوانستید فایل را دریافت کنید، به پشتیبانی واتساپ پیام بدهید تا فایل برایتان ارسال شود.</p>
      <div className="course-return-tip"><BookOpen size={20} aria-hidden="true"/><p><strong>یک شروع سریع</strong><br/>اگه زیاد می‌شنوی «گرونه»، از صفحهٔ ۶ شروع کن.</p></div>
    </article>
  </main>;
}
