import { useEffect, useState } from 'react';
import { BookOpen, ArrowUpLeft, Download, Check, Sparkles } from 'lucide-react';
import course from './customer-objections.json';

export const coursePath = '/courses/' + course.slug + '/';
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

export function CourseCard() {
  return <article className="courses-status">
    <div className="courses-status-symbol" aria-hidden="true"><BookOpen size={48}/></div>
    <div><span className="pill">راهنمای PDF</span><h2>{course.title}</h2><p>{course.summary}</p>
      <p>{coursePrice}</p><a className="button" href={coursePath}>مشاهدهٔ راهنما <ArrowUpLeft size={18}/></a>
    </div>
  </article>;
}

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

  return <main id="main" className="container section courses-intro course-product">
    <a className="text-link" href="/courses/">بازگشت به فهرست دوره‌ها</a>
    <div className="product-hero">
      <div className="product-intro">
        <p className="eyebrow">راهنمای عملی فروش · {course.author}</p>
        <h1>{course.headline}</h1>
        <p>{course.summary}</p>
        <ul className="product-badges" aria-label="مشخصات راهنما"><li>{pageCount} صفحه</li><li>۸ موضوع فروش</li><li>فایل PDF</li></ul>
      </div>
      <aside id="purchase" className="product-panel" aria-label="خرید راهنما">
        <div className="product-author"><span className="product-author-mark" aria-hidden="true"><BookOpen size={24}/></span><div><strong>{course.author}</strong><p>نویسندهٔ راهنما</p></div></div>
        <h2>{course.title}</h2>
        <p>فایل PDF · {new Intl.NumberFormat('fa-IR').format(course.pages)} صفحه</p>
        <strong>{coursePrice}</strong>
        {validOrder ? <>
          <p role="status">{({ idle: 'در حال بررسی سفارش…', paid: 'پرداخت تأیید شد.', pending: 'پرداخت هنوز تأیید نشده است.', error: 'بررسی موقتاً در دسترس نیست. دوباره تلاش کنید.', notfound: 'سفارش در این مرورگر در دسترس نیست. از مرورگری که با آن خرید کردید استفاده کنید.' } as Record<string,string>)[state]}</p>
          {state === 'paid' ? <a className="button" href={api + '?action=download&order=' + validOrder}><Download size={17}/> دانلود PDF</a>
            : state !== 'notfound' && state !== 'idle' && <button className="button" disabled={busy} onClick={recover}>بررسی دوبارهٔ پرداخت</button>}
          <p>شماره سفارش: <bdi className="order-number">{validOrder}</bdi></p>
          {state === 'pending' && <a className="text-link" href={coursePath}>بازگشت به صفحهٔ خرید</a>}
        </> : <>
          {checkoutEnabled ? <button className="button" disabled={busy} onClick={start}>{busy ? 'در حال اتصال به درگاه…' : 'خرید و دانلود PDF'}</button> : paymentLink ? <>
            <a className="button" href={paymentLink}>پرداخت {coursePrice}<ArrowUpLeft size={18}/></a>
            <p>پرداخت در زرین‌پال انجام می‌شود. {externalDownloadEnabled ? 'پس از بازگشت به سایت، فایل را دانلود کنید.' : 'کد پیگیری را برای دریافت فایل نگه دارید.'}</p>
          </> : <p>فروش آنلاین هنوز فعال نشده است.</p>}
          {state === 'start-error' && <p role="alert">اتصال به درگاه ممکن نشد. دوباره تلاش کنید.</p>}
          {previousOrder && orderPattern.test(previousOrder) && <a className="text-link" href={coursePath + '?order=' + previousOrder}>پیگیری آخرین خرید</a>}
        </>}
      </aside>
    </div>
    <section className="product-panel product-use"><p className="eyebrow">برای مکالمهٔ بعدی فروش</p><h2>قبل از جواب، دلیل اعتراض را پیدا کن</h2>
      <p>این راهنما برای فروشنده‌ها و صاحبان کسب‌وکار است که حضوری، تلفنی یا در دایرکت با مشتری مردد روبه‌رو می‌شوند.</p>
      <ul><li><Check size={17}/> تفاوت محدودیت بودجه، تردید و مقایسهٔ قیمت را تشخیص بده.</li><li><Check size={17}/> از نمونه‌ها برای ساختن پاسخ متناسب با گفت‌وگوی خودت استفاده کن.</li><li><Check size={17}/> هنگام مواجهه با اعتراض، بخش مربوط را سریع پیدا کن.</li></ul>
    </section>
    <section className="product-panel"><h2>موضوعات راهنما</h2><ul className="product-topics">{course.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></section>
    <section className="product-panel"><h2>نمونهٔ واقعی از راهنما</h2><p><strong>{course.sample.question}</strong></p><blockquote>{course.sample.answer}</blockquote><p>{course.sample.explanation} <small>— صفحهٔ ۶</small></p></section>
    <section className="product-panel"><h2>پرسش‌های متداول</h2>{course.faq.map(([question, answer], index) => <details key={question}><summary>{question}</summary><p>{index === 1 && !checkoutEnabled && paymentLink ? (externalDownloadEnabled ? 'پس از بازگشت از زرین‌پال، روی «دانلود فایل PDF» بزنید و فایل را ذخیره کنید.' : 'کد پیگیری زرین‌پال را نگه دارید. برای دریافت فایل پس از بررسی پرداخت، از بخش تماس پیگیری کنید.') : answer}</p></details>)}</section>
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
        <a className="text-link" href={coursePath}>صفحهٔ محصول</a>
      </div>
      <div className="course-return-tip"><BookOpen size={20} aria-hidden="true"/><p><strong>یک شروع سریع</strong><br/>اگه زیاد می‌شنوی «گرونه»، از صفحهٔ ۶ شروع کن.</p></div>
    </article>
  </main>;
}
