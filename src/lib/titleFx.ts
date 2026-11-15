import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import type { TitleFx } from '../themes/types';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

/**
 * Plays the theme's title reveal and the staggered entrance of `.reveal` elements inside `root`.
 * Returns a cleanup function.
 */
export function playSceneIntro(root: HTMLElement, fx: TitleFx, reduced: boolean): () => void {
  if (reduced) return () => {};
  const title = root.querySelector<HTMLElement>('.sc-title');
  const delay = 0.55;
  const ctx = gsap.context(() => {
    if (title) {
      if (fx === 'scramble') {
        const text = title.textContent ?? '';
        gsap.fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.2, delay });
        gsap.to(title, {
          duration: 1.4, delay,
          scrambleText: { text, chars: '01░▒▓<>/\\|#', revealDelay: 0.3, speed: 0.6 },
        });
      } else {
        const split = SplitText.create(title, { type: 'words,chars', charsClass: 'sc-char' });
        const chars = split.chars;
        switch (fx) {
          case 'ember':
            gsap.from(chars, {
              opacity: 0, y: 24, filter: 'blur(10px)', textShadow: '0 0 40px rgba(255,190,90,1)',
              duration: 1.1, delay, stagger: { each: 0.06, from: 'random' }, ease: 'power3.out',
            });
            break;
          case 'brush':
            gsap.from(chars, {
              opacity: 0, scale: 1.6, filter: 'blur(12px)', duration: 1.2, delay, stagger: 0.16, ease: 'power2.out',
            });
            break;
          case 'pop':
            gsap.from(chars, {
              opacity: 0, scale: 0, y: 30, rotation: () => gsap.utils.random(-25, 25),
              duration: 0.8, delay, stagger: 0.06, ease: 'back.out(2.6)',
            });
            break;
          case 'type':
            gsap.from(chars, { opacity: 0, duration: 0.01, delay, stagger: 0.07, ease: 'none' });
            break;
          default:
            gsap.from(chars, {
              opacity: 0, yPercent: 80, rotateX: -60, transformOrigin: '50% 100%',
              duration: 0.9, delay, stagger: 0.035, ease: 'power3.out',
            });
        }
      }
    }
    gsap.from(root.querySelectorAll('.reveal'), {
      opacity: 0, y: 22, duration: 0.8, delay: delay + 0.2, stagger: 0.07, ease: 'power3.out', clearProps: 'all',
    });
  }, root);
  return () => ctx.revert();
}
