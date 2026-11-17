import { useEffect, useState } from 'react';
import { BookOpen, ArrowUpLeft, Download, FileText } from 'lucide-react';
import course from './customer-objections.json';
import { content as c } from './content';

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
      <div><p className="eyebrow">راهنمای فروش · {course.author}</p><h1>{course.headline}</h1><p>{course.summary}</p></div>
      <aside id="purchase" className="product-panel" aria-label="خرید راهنما">
        <FileText size={30} aria-hidden="true"/><h2>{course.title}</h2>
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
            <p>پرداخت در زرین‌پال انجام می‌شود. کد پیگیری را برای دریافت فایل نگه دارید.</p>
          </> : <p>فروش آنلاین هنوز فعال نشده است.</p>}
          {state === 'start-error' && <p role="alert">اتصال به درگاه ممکن نشد. دوباره تلاش کنید.</p>}
          {previousOrder && orderPattern.test(previousOrder) && <a className="text-link" href={coursePath + '?order=' + previousOrder}>پیگیری آخرین خرید</a>}
        </>}
      </aside>
    </div>
    <section className="product-panel"><h2>موضوعات راهنما</h2><ul className="product-topics">{course.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></section>
    <section className="product-panel"><h2>نمونهٔ واقعی از راهنما</h2><p><strong>{course.sample.question}</strong></p><blockquote>{course.sample.answer}</blockquote><p>{course.sample.explanation} <small>— صفحهٔ ۶</small></p></section>
    <section className="product-panel"><h2>پرسش‌های متداول</h2>{course.faq.map(([question, answer], index) => <details key={question}><summary>{question}</summary><p>{index === 1 && !checkoutEnabled && paymentLink ? 'کد پیگیری زرین‌پال را نگه دارید. برای دریافت فایل پس از بررسی پرداخت، از بخش تماس پیگیری کنید.' : answer}</p></details>)}</section>
  </main>;
}


export function CourseReturn() {
  return <main id="main" className="container section course-return">
    <article className="product-panel course-return-card">
      <div className="course-return-icon"><FileText size={28} aria-hidden="true"/></div>
      <p className="eyebrow">راهنمای فروش · {course.author}</p>
      <h1>{course.title}</h1>
      <p className="course-return-meta">نسخهٔ PDF · {new Intl.NumberFormat('fa-IR').format(course.pages)} صفحه</p>
      <div className="course-return-notice">
        <h2>پیگیری خرید</h2>
        <p>اگر در زرین‌پال رسید موفق دریافت کردید، کد پیگیری را نگه دارید و برای دریافت فایل با ما تماس بگیرید. اگر پرداخت ناموفق بود، به صفحهٔ محصول برگردید.</p>
      </div>
      <div className="course-return-actions">
        <a className="button" href={c.contact.whatsapp}>پیگیری دریافت فایل <ArrowUpLeft size={18}/></a>
        <a className="text-link" href={coursePath}>بازگشت به صفحهٔ محصول</a>
      </div>
    </article>
  </main>;
}
