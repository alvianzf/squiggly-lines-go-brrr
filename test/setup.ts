import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * jsdom ships no matchMedia, and framer-motion's useReducedMotion needs it.
 * Default every test to "user has expressed no preference"; the reduced-motion
 * test installs its own stub before importing the component.
 */
export function stubMatchMedia(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

stubMatchMedia(false);

afterEach(cleanup);
