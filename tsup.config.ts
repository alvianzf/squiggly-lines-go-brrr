import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // tsup strips the source's "use client" directive, so put it back or the
  // Next.js App Router treats this as a server component and blows up on hooks.
  banner: { js: '"use client";' },
  external: ['react', 'react-dom', 'framer-motion'],
});
