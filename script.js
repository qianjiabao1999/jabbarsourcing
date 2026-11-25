const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

if (menuButton && navigation) {
  const narrow = window.matchMedia('(max-width: 620px)');
  const labels = document.documentElement.lang.startsWith('zh')
    ? ['打开导航', '关闭导航'] : ['Open navigation', 'Close navigation'];
  menuButton.setAttribute('aria-controls', navigation.id || (navigation.id = 'legal-navigation'));
  function setOpen(open, restoreFocus = false) {
    navigation.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', labels[open ? 1 : 0]);
    if (restoreFocus) menuButton.focus();
  }
  setOpen(false);
  menuButton.addEventListener('click', () => setOpen(!navigation.classList.contains('open')));
  navigation.addEventListener('click', e => { if (e.target.closest('a[href]')) setOpen(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !e.defaultPrevented && navigation.classList.contains('open')) {
      e.preventDefault();
      setOpen(false, true);
    }
  });
  function dismissOutside(e) {
    if (!menuButton.contains(e.target) && !navigation.contains(e.target) && navigation.classList.contains('open')) setOpen(false);
  }
  document.addEventListener('click', dismissOutside);
  document.addEventListener('focusin', dismissOutside);
  const resized = () => { if (!narrow.matches) setOpen(false); };
  if (narrow.addEventListener) narrow.addEventListener('change', resized);
  else narrow.addListener(resized);
  window.addEventListener('pagehide', () => setOpen(false));
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

document.querySelector('#contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = form.get('name');
  const email = form.get('email');
  const message = form.get('message');
  const subject = encodeURIComponent(`Sourcing enquiry from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nProject details:\n${message}`);
  window.location.href = `mailto:qianjiabao1999@gmail.com?subject=${subject}&body=${body}`;
});

const yearNode = document.querySelector('#year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}
