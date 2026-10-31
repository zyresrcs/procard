const TRACKS = [
  { src: 'song1.mp3', title: 'Foreign',  artist: 'lungskull' },
  { src: 'song2.mp3', title: 'Too Much', artist: '' },
  { src: 'song3.mp3', title: 'Scars',    artist: 'novulent' },
];

const VIEWS = { namespace: 'l8z4-site', key: 'visits', base: 139 };

const LANGS = {
  en: { name: 'English',   enter: 'click to enter',        role: 'developer',     now: 'Now playing',     views: 'views',          prev: 'Previous',   play: 'Play / Pause',     next: 'Next',       volume: 'Volume',      language: 'Language' },
  es: { name: 'Español',   enter: 'click para entrar',     role: 'desarrollador', now: 'Ahora suena',     views: 'visitas',        prev: 'Anterior',   play: 'Reproducir / Pausa', next: 'Siguiente', volume: 'Volumen',     language: 'Idioma' },
  pt: { name: 'Português', enter: 'clique para entrar',    role: 'desenvolvedor', now: 'Tocando agora',   views: 'visualizações',  prev: 'Anterior',   play: 'Tocar / Pausar',   next: 'Próxima',    volume: 'Volume',      language: 'Idioma' },
  fr: { name: 'Français',  enter: 'cliquez pour entrer',   role: 'développeur',   now: 'En lecture',      views: 'vues',           prev: 'Précédent',  play: 'Lecture / Pause',  next: 'Suivant',    volume: 'Volume',      language: 'Langue' },
  de: { name: 'Deutsch',   enter: 'klicken zum Eintreten', role: 'Entwickler',    now: 'Spielt gerade',   views: 'Aufrufe',        prev: 'Zurück',     play: 'Wiedergabe / Pause', next: 'Weiter',   volume: 'Lautstärke',  language: 'Sprache' },
  it: { name: 'Italiano',  enter: 'clicca per entrare',    role: 'sviluppatore',  now: 'In riproduzione', views: 'visite',         prev: 'Precedente', play: 'Riproduci / Pausa', next: 'Successivo', volume: 'Volume',     language: 'Lingua' },
  ja: { name: '日本語',     enter: 'クリックして入る',          role: '開発者',         now: '再生中',           views: '閲覧数',          prev: '前へ',        play: '再生 / 一時停止',     next: '次へ',        volume: '音量',         language: '言語' },
  ko: { name: '한국어',     enter: '클릭하여 입장',            role: '개발자',         now: '재생 중',          views: '조회수',          prev: '이전',        play: '재생 / 일시정지',     next: '다음',        volume: '볼륨',         language: '언어' },
  ru: { name: 'Русский',   enter: 'нажмите, чтобы войти',  role: 'разработчик',   now: 'Сейчас играет',   views: 'просмотры',      prev: 'Назад',      play: 'Пуск / Пауза',     next: 'Далее',      volume: 'Громкость',   language: 'Язык' },
  zh: { name: '中文',       enter: '点击进入',                role: '开发者',         now: '正在播放',          views: '访问量',          prev: '上一首',       play: '播放 / 暂停',        next: '下一首',       volume: '音量',         language: '语言' },
};

const $ = (id) => document.getElementById(id);
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};

const langEl = $('lang'), langBtn = $('lang-btn'), langMenu = $('lang-menu'), langCode = $('lang-code');
let currentLang = 'en';

function applyLang(code) {
  if (!LANGS[code]) code = 'en';
  currentLang = code;
  const dict = LANGS[code];

  document.documentElement.lang = code;
  langCode.textContent = code.toUpperCase();

  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = dict[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', dict[el.dataset.i18nAria]));

  langMenu.querySelectorAll('li').forEach((li) => li.classList.toggle('active', li.dataset.code === code));
  store.set('l8z4_lang', code);
}

function buildLangMenu() {
  langMenu.innerHTML = Object.entries(LANGS)
    .map(([code, d]) => `<li role="menuitem" data-code="${code}">${d.name}<small>${code.toUpperCase()}</small></li>`)
    .join('');
}

function toggleLang(open) {
  const isOpen = open ?? !langEl.classList.contains('open');
  langEl.classList.toggle('open', isOpen);
  langBtn.setAttribute('aria-expanded', isOpen);
}

langBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLang(); });
langMenu.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  applyLang(li.dataset.code);
  toggleLang(false);
});
document.addEventListener('click', () => toggleLang(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleLang(false); });

buildLangMenu();
applyLang(store.get('l8z4_lang') || 'en');

const audio = $('audio');
const titleEl = $('title'), artistEl = $('artist'), countEl = $('count');
const fill = $('fill'), bar = $('bar'), curEl = $('cur'), durEl = $('dur');
const toast = $('toast'), toastText = $('toast-text'), volEl = $('vol');

const FADE_IN = 1800, FADE_OUT = 900;
let index = 0, master = 0.6, gain = 0;
let fadeId = 0, switchId = 0, endFading = false, started = false, toastTimer;

const applyVolume = () => { audio.volume = Math.max(0, Math.min(1, gain * master)); };
const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
const label = (t) => (t.artist ? `${t.title} — ${t.artist}` : t.title);

function fadeTo(target, ms) {
  const id = ++fadeId, from = gain, t0 = performance.now();
  return new Promise((resolve) => {
    (function step(now) {
      if (id !== fadeId) return resolve();
      const t = Math.min((now - t0) / ms, 1);
      gain = from + (target - from) * t;
      applyVolume();
      t < 1 ? requestAnimationFrame(step) : resolve();
    })(t0);
  });
}

function setPlayingUI(on) {
  document.body.classList.toggle('playing', on);
  $('i-play').toggleAttribute('hidden', on);
  $('i-pause').toggleAttribute('hidden', !on);
}

function showToast() {
  toastText.textContent = label(TRACKS[index]);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function updateInfo() {
  const t = TRACKS[index];
  titleEl.classList.add('fading');
  artistEl.classList.add('fading');
  setTimeout(() => {
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    countEl.textContent = `${index + 1} / ${TRACKS.length}`;
    titleEl.classList.remove('fading');
    artistEl.classList.remove('fading');
  }, 350);
}

async function go(i) {
  const mine = ++switchId;
  if (started && !audio.paused) await fadeTo(0, FADE_OUT);
  if (mine !== switchId) return;

  index = (i + TRACKS.length) % TRACKS.length;
  endFading = false;
  started = true;

  audio.src = TRACKS[index].src;
  gain = 0;
  applyVolume();
  updateInfo();
  fill.style.width = '0%';
  curEl.textContent = '0:00';
  durEl.textContent = '0:00';

  try { await audio.play(); setPlayingUI(true); }
  catch { setPlayingUI(false); return; }

  showToast();
  fadeTo(1, FADE_IN);
}

async function togglePlay() {
  if (!started) return go(index);
  if (audio.paused) {
    await audio.play();
    setPlayingUI(true);
    fadeTo(1, 600);
  } else {
    setPlayingUI(false);
    await fadeTo(0, 400);
    audio.pause();
  }
}

$('play').addEventListener('click', togglePlay);
$('next').addEventListener('click', () => go(index + 1));
$('prev').addEventListener('click', () => go(audio.currentTime > 4 ? index : index - 1));

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  curEl.textContent = fmt(audio.currentTime);
  durEl.textContent = fmt(audio.duration);

  if (!endFading && !audio.paused && audio.duration - audio.currentTime < 1.6) {
    endFading = true;
    fadeTo(0, 1500);
  }
});
audio.addEventListener('ended', () => go(index + 1));

bar.addEventListener('click', (e) => {
  if (!audio.duration) return;
  const r = bar.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration;
});

const paintVolume = () => volEl.style.setProperty('--v', `${volEl.value}%`);
volEl.addEventListener('input', () => { master = volEl.value / 100; applyVolume(); paintVolume(); });
paintVolume();

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && started) { e.preventDefault(); togglePlay(); }
});

$('enter').addEventListener('click', () => {
  $('enter').classList.add('hide');
  document.body.classList.add('entered');
  setTimeout(() => document.body.classList.add('ready'), 3500);
  go(0);
});

const viewsEl = $('views-count');

async function requestCount(hit) {
  const { namespace: ns, key } = VIEWS;
  const endpoints = [
    { url: `https://abacus.jasoncameron.dev/${hit ? 'hit' : 'get'}/${ns}/${key}`, read: (d) => d.value },
    { url: `https://api.counterapi.dev/v1/${ns}/${key}${hit ? '/up' : ''}`,         read: (d) => d.count },
  ];
  for (const { url, read } of endpoints) {
    try {
      const res = await fetch(url);
      if (res.status === 404 && !hit) return 0;
      if (!res.ok) continue;
      const n = Number(read(await res.json()));
      if (Number.isFinite(n)) return n;
    } catch {}
  }
  return null;
}

function countUp(el, to, ms = 1400) {
  const t0 = performance.now();
  (function step(now) {
    const t = Math.min((now - t0) / ms, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  })(t0);
}

(async function initViews() {
  const visited = store.get('l8z4_visited') === '1';
  let value = await requestCount(!visited);

  if (value === null) {
    const local = Number(store.get('l8z4_local') || 0) + (visited ? 0 : 1);
    store.set('l8z4_local', local);
    value = local;
  }
  store.set('l8z4_visited', '1');
  countUp(viewsEl, VIEWS.base + value);
})();

document.addEventListener('pointerdown', (e) => {
  const target = e.target.closest('.fx');
  if (!target) return;
  const r = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${e.clientX - r.left}px`;
  ripple.style.top = `${e.clientY - r.top}px`;
  target.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const cursor = $('cursor');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;

  document.body.classList.add('has-cursor');

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    document.body.classList.add('cursor-on');
  });
  document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
  document.addEventListener('mousedown', () => cursor.classList.add('down'));
  document.addEventListener('mouseup',   () => cursor.classList.remove('down'));
  document.addEventListener('mouseover', (e) => {
    cursor.classList.toggle('hover', !!e.target.closest('a, button, li, .bar, input, #enter'));
  });

  (function loop() {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
}

/* 
source by : l8z4 
discord : https://discord.gg/cs7Jhuqaxd 
*/