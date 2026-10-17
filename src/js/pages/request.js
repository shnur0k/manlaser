import { gsap } from '../lib/gsap.js';
import { env } from '../core/env.js';
import { formatPhone, phoneError } from '../lib/phone.js';
import { sendBooking } from '../lib/booking.js';
import { Sparks } from '../fx/sparks.js';
import { scrollTo } from '../core/scroll.js';
import config from '../../../config.js';

const DRAFT_KEY = 'ml-request-draft';
const CONTACT_LABEL = { call: 'звонок', telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp' };

/** Страница заявки «Запросить цену»: форма с проверкой телефона и анимацией успеха. Отправка — config.js → booking.send. */
export default function request(container) {
  const root = container.querySelector('[data-booking]');
  if (!root) return null;
  const form = root.querySelector('[data-booking-form]');
  const success = root.querySelector('[data-booking-success]');
  const phone = form.querySelector('[name="phone"]');
  const product = form.querySelector('[name="product"]');
  const cleanups = [];
  const on = (el, ev, fn, opts) => {
    el.addEventListener(ev, fn, opts);
    cleanups.push(() => el.removeEventListener(ev, fn, opts));
  };

  // предвыбор товара: /zapros/?product=man-c01
  const preset = new URLSearchParams(location.search).get('product');
  if (preset && [...product.options].some((o) => o.value === preset)) product.value = preset;

  // ---------- черновик (имя и телефон запоминаются в этом браузере) ----------
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (draft) ['name', 'phone'].forEach((k) => draft[k] && form.elements[k] && (form.elements[k].value = draft[k]));
  } catch {}
  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: form.elements.name.value, phone: phone.value }));
    } catch {}
  };

  const setError = (name, message) => {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    const err = form.querySelector(`#rq-${name}-error`);
    const input = form.elements[name];
    wrap?.classList.toggle('is-invalid', Boolean(message));
    if (input && input.setAttribute) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) err.textContent = message || '';
  };

  on(phone, 'input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatPhone(phone.value);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (form.querySelector('[data-field="phone"]').classList.contains('is-invalid')) setError('phone', phoneError(phone.value));
  });
  on(phone, 'focus', () => {
    if (!phone.value) phone.value = '+375 (';
  });
  on(phone, 'blur', () => {
    if (phone.value === '+375 (' || phone.value === '+375') phone.value = '';
    if (phone.value) setError('phone', phoneError(phone.value));
  });
  on(form, 'change', (e) => {
    if (e.target.name === 'consent' && e.target.checked) setError('consent', '');
    saveDraft();
  });
  on(form, 'input', saveDraft);

  // ---------- отправка ----------
  function validate() {
    const errors = {};
    const pe = phoneError(phone.value);
    if (pe) errors.phone = pe;
    if (!form.elements.consent.checked) errors.consent = 'Нужно согласие, чтобы мы могли связаться с вами';
    ['phone', 'consent'].forEach((k) => setError(k, errors[k]));
    return errors;
  }

  function collect() {
    const v = (n) => form.querySelector(`[name="${n}"]:checked`)?.value;
    return {
      subject: product.selectedOptions[0]?.textContent.trim() || '',
      name: form.elements.name.value.trim(),
      phone: phone.value.trim(),
      contact: v('contact'),
      contactLabel: CONTACT_LABEL[v('contact')],
      comment: form.elements.comment.value.trim(),
    };
  }

  let busy = false;
  on(form, 'submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const errors = validate();
    const first = Object.keys(errors)[0];
    if (first) {
      const el = form.querySelector(`[data-field="${first}"]`);
      if (!env.reducedMotion) gsap.fromTo(el, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
      scrollTo(el, { offset: -140 });
      (form.elements[first]?.focus ? form.elements[first] : el)?.focus?.({ preventScroll: true });
      return;
    }
    busy = true;
    form.classList.add('is-sending');
    const data = collect();
    const result = await sendBooking(data);
    busy = false;
    form.classList.remove('is-sending');
    showSuccess(data, result);
  });

  function showSuccess(data, result) {
    const who = data.name ? `${data.name}, спасибо!` : 'Спасибо!';
    const how = data.contact && data.contact !== 'call' ? `напишет в ${CONTACT_LABEL[data.contact]}` : 'перезвонит';
    success.querySelector('[data-success-text]').textContent = `${who} Менеджер ${how} по номеру ${data.phone} в рабочее время и уточнит детали.`;
    success.querySelector('[data-success-dev]').hidden = Boolean(result.sent) || Boolean(config.booking?.send);

    const showNow = () => {
      form.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      scrollTo(root, { offset: -120 });
      animateSuccess();
    };
    if (env.reducedMotion) return showNow();
    gsap.to(form, { opacity: 0, y: -20, duration: 0.45, ease: 'power2.in', onComplete: showNow });
  }

  function animateSuccess() {
    const ring = success.querySelector('.booking-success__ring');
    const check = success.querySelector('.booking-success__check');
    const kids = success.querySelectorAll('.booking-success__title, .booking-success__text, .booking-success__dev, .actions');
    if (env.reducedMotion) return;
    [ring, check].forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    const canvas = success.querySelector('[data-success-sparks]');
    const sparks = new Sparks(canvas, { gravity: 700 });
    cleanups.push(() => sparks.destroy());
    gsap
      .timeline()
      .to(ring, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' })
      .to(check, { strokeDashoffset: 0, duration: 0.45, ease: 'power3.out' }, '-=0.15')
      .add(() => {
        // искры из конца галочки
        sparks.resize();
        const r = check.getBoundingClientRect();
        const c = canvas.getBoundingClientRect();
        sparks.emit(r.right - c.left, r.top - c.top, 50, { spread: Math.PI, speed: [150, 700], life: [0.4, 1] });
      })
      .fromTo(kids, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out' }, '-=0.1');
  }

  on(root, 'click', (e) => {
    if (!e.target.closest('[data-booking-again]')) return;
    success.hidden = true;
    form.hidden = false;
    gsap.fromTo(form, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    form.elements.comment.value = '';
  });

  return () => cleanups.forEach((fn) => fn());
}
