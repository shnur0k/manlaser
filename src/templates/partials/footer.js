import { esc, t, each } from '../lib.js';
import { icon } from '../icons.js';
import { button, messengerLinks, phoneLink, equipmentNote } from '../components.js';

export function footer(ctx) {
  const { site } = ctx;
  const services = site.nav.find((n) => n.section === 'services');
  const year = new Date().getFullYear();

  return `<footer class="site-footer">
    <div class="container">
      <div class="site-footer__top">
        <div class="site-footer__claim">
          <p class="site-footer__bridge" data-split>Лазерная очистка и <em class="accent">антикор</em> в Пружанах</p>
          <div class="actions">
            ${button({ label: 'Записаться на обработку', href: '/zapis/' })}
            ${button({ label: 'Калькулятор', href: '/uslugi/kalkulyator/', variant: 'ghost', iconName: 'arrow-right' })}
          </div>
        </div>
        <div class="site-footer__contacts">
          ${phoneLink(site.contacts.services, { extra: 'phone-link--lg' })}
          <a class="site-footer__mail" href="mailto:${esc(site.email)}">${icon('mail')}<span>${esc(site.email)}</span></a>
          ${messengerLinks(ctx.contact, { variant: 'pill' })}
        </div>
      </div>

      <div class="site-footer__grid">
        <div class="site-footer__col">
          <h2 class="site-footer__h">Услуги</h2>
          <ul>${each(services.items, (i) => `<li><a href="${esc(i.url)}">${esc(i.label)}</a></li>`)}
            <li><a href="/uslugi/kalkulyator/">Калькулятор стоимости</a></li>
            <li><a href="/zapis/">Запись на обработку</a></li></ul>
        </div>
        <div class="site-footer__col">
          <h2 class="site-footer__h">Компания</h2>
          <ul>
            <li><a href="/raboty/">Работы и отзывы</a></li>
            <li><a href="/o-nas/">О компании</a></li>
            <li><a href="/o-nas/#faq">Частые вопросы</a></li>
            <li><a href="/blog/">Блог</a></li>
          </ul>
        </div>
        <div class="site-footer__col site-footer__col--wide">
          <h2 class="site-footer__h">Адрес</h2>
          <p class="site-footer__line">${icon('pin')}<span>${esc(site.address.full)}</span></p>
          <p class="site-footer__line">${icon('clock')}<span>${esc(site.hours.text)}</span></p>
          <a class="link-arrow" href="/kontakty/#map">Как проехать ${icon('arrow-right')}</a>
        </div>
      </div>

      ${equipmentNote(ctx, 'site-footer__note')}

      <a class="site-footer__giant" href="/" aria-label="manlaser — на главную" tabindex="-1">${ctx.logoWord}</a>

      <div class="site-footer__bottom">
        <span>© ${year} manlaser</span>
        <span class="site-footer__req">${t(site.requisites)}</span>
      </div>
    </div>
  </footer>`;
}
