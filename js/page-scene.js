// Puts the live pixel scene at the top of a page: tints the page by the hour, picks ink for the
// text over the sky, mirrors for right-to-left, and follows the system light/dark switch.
import { createScene, timeOf } from './scene.js';
import { isRtl } from './i18n.js';

export function mountScene(canvas, { scene = 'room', time = timeOf(), weather = 'clear', hello = null, maxScale } = {}) {
  document.body.dataset.time = time;
  const ground = () => getComputedStyle(document.body).getPropertyValue('--ground').trim();
  const now = new Date();
  const sc = createScene(canvas, { scene, time, weather, ground: ground(), seed: 11, clock: { h: now.getHours(), m: now.getMinutes() }, maxScale });
  if (isRtl()) canvas.classList.add('flip');

  const retone = () => requestAnimationFrame(() => {
    const over = hello && getComputedStyle(hello).position === 'absolute';
    const yMax = over ? Math.ceil((hello.offsetTop + hello.offsetHeight) * canvas.height / canvas.clientHeight) : 40;
    document.body.dataset.tone = sc.tone(yMax);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { sc.set({ ground: ground() }, { animate: false }); retone(); });
  addEventListener('resize', retone);
  retone();

  return {
    set(patch) {
      if (patch.time) document.body.dataset.time = patch.time;
      sc.set({ ...patch, ground: ground() });
      retone();
    },
    progress: share => sc.progress(share),
    resting: () => sc.resting(),
    retone,
  };
}
