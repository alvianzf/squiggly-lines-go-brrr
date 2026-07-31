# 🎨 Squiggly Lines Go Brrr

> _"We were so preoccupied with whether we could, we didn't stop to think if we should."_

Because your website absolutely, positively needed animated squiggly lines running in the background. Your users? They won't even notice. Your CPU? Oh, it'll notice.

## ℹ️ About Tailwind CSS

**TL;DR:** Tailwind is **recommended but not required**. 

The default colors use Tailwind classes (`text-red-500/20`), so if you use defaults, you'll need Tailwind. But you can totally pass your own CSS color classes instead. See the [colors section](#-about-colors-tailwind-not-actually-required) below for alternatives.

If you want to use the defaults (lazy mode activated), install Tailwind:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Not using Tailwind? No problem! Just pass your own color classes in the `colors` prop.

## 🤔 Why Does This Exist?

Great question! The answer is: ¯\\_(ツ)_/¯

But in all seriousness (just kidding, we're never serious), this is a highly customizable animated background component for React and Next.js that lets you render beautiful, performant (lol), eye-catching animated lines in various styles. Because static backgrounds are for quitters.

## ✨ Features

- 🐛 **Four Variants**: Worms, Beetles, Ants, and Thunder (yes, really)
- 🎨 **Customizable Colors**: Bring your own Tailwind classes (you DO have Tailwind, right?)
- 📏 **Adjustable Thickness**: From "barely there" to "THICC boi"
- ⚡ **Speed Control**: Fast like your burnout or slow like your CI/CD pipeline
- 🎯 **TypeScript**: Fully typed because we're not animals
- ⚛️ **React 18+ & 19**: Modern React with hooks (because class components are so 2018)
- 🔥 **Next.js Compatible**: Works with App Router and Server Components (we even added `"use client"` for you!)
- 🌙 **SSR Safe**: Won't explode when `window` doesn't exist

## 📦 Installation

```bash
npm install @alvianzf/squiggly-lines-go-brrr
# or
yarn add @alvianzf/squiggly-lines-go-brrr
# or
pnpm add @alvianzf/squiggly-lines-go-brrr
# or
bun add @alvianzf/squiggly-lines-go-brrr
```

### ⚠️ Peer Dependencies (AKA Things You Better Have Installed)

You'll need these installed (they're the only real requirements):

```bash
npm install react react-dom framer-motion
```

**React Version Compatibility:**

This package supports **both React 18 and React 19**:
- ✅ React 18.x (`^18.0.0`)
- ✅ React 19.x (`^19.0.0`)

**Framer Motion Compatibility:**
- ✅ Framer Motion 10.x (`^10.0.0`)
- ✅ Framer Motion 11.x (`^11.0.0`)

### 🔧 Installation Troubleshooting

**If you get peer dependency errors:**

The package is designed to work cleanly with both React 18 and 19. However, if you encounter peer dependency conflicts during installation, here are your options:

1. **Option 1 - Use `--legacy-peer-deps` (Quick Fix)**:
   ```bash
   npm install @alvianzf/squiggly-lines-go-brrr --legacy-peer-deps
   ```

2. **Option 2 - Use `--force` (Nuclear Option)**:
   ```bash
   npm install @alvianzf/squiggly-lines-go-brrr --force
   ```

3. **Option 3 - Check Your React Versions** (Recommended):
   Make sure your `react` and `react-dom` versions match:
   ```bash
   npm list react react-dom
   ```
   If they don't match (e.g., React 18 with React-DOM 19), update them to the same version:
   ```bash
   npm install react@18 react-dom@18
   # or
   npm install react@19 react-dom@19
   ```

**Still having issues?** Open an issue on [GitHub](https://github.com/alvianzf/squiggly-lines-go-brrr/issues) and we'll pretend to look at it.

### 🎨 About Colors (Tailwind Not Actually Required!)

**Plot twist:** Despite us yelling about Tailwind, you don't *actually* need it! 

The `colors` prop accepts **any CSS class names** that set text color. The component uses `stroke="currentColor"` on SVG paths, which inherits from the text color of the applied class.

**Your options:**

1. **Use Tailwind classes** (the default and easiest):
   ```tsx
   colors={['text-purple-500/30', 'text-pink-500/30']}
   ```

2. **Use your own CSS classes** (for non-Tailwind users):
   ```css
   .squiggly-purple { color: rgba(168, 85, 247, 0.3); }
   .squiggly-pink { color: rgba(236, 72, 153, 0.3); }
   ```
   ```tsx
   colors={['squiggly-purple', 'squiggly-pink']}
   ```

3. **Use inline styles** (if you're feeling rebellious):
   Just note that the `colors` prop expects class names, not inline styles. So stick with options 1 or 2.

**Bottom line:** Tailwind makes it easy (just use `text-color-500/30` classes), but you can totally use your own CSS classes if you prefer. We won't judge. Much.

## 🚀 Usage

### Basic Usage (Boring Mode)

```tsx
import { SquigglyBackground } from '@alvianzf/squiggly-lines-go-brrr';

function App() {
  return (
    <div>
      <SquigglyBackground />
      {/* Your actual content here */}
    </div>
  );
}
```

Congratulations! You now have 50 animated worms crawling across your website. Your users will be... confused? Impressed? Who knows!

### Advanced Usage (Chaos Mode)

```tsx
import { SquigglyBackground } from '@alvianzf/squiggly-lines-go-brrr';

function App() {
  return (
    <div>
      <SquigglyBackground
        variant="thunder"
        count={100}
        colors={[
          'text-purple-500/30',
          'text-pink-500/30',
          'text-cyan-500/30',
          'text-yellow-500/30'
        ]}
        minStrokeWidth={1}
        maxStrokeWidth={4}
        minDuration={3}
        maxDuration={8}
        backgroundColor="#0a0a0a"
      />
      {/* Your content, now with 300% more pizzazz */}
    </div>
  );
}
```

### Next.js App Router Usage

```tsx
// app/layout.tsx
import { SquigglyBackground } from '@alvianzf/squiggly-lines-go-brrr';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SquigglyBackground variant="beetles" count={75} />
        {children}
      </body>
    </html>
  );
}
```

The `"use client"` directive is already included. We're not monsters.

## 🎛️ API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'worms' \| 'beetles' \| 'ants' \| 'thunder'` | `'worms'` | Choose your animation style. Each one is equally extra. |
| `count` | `number` | `50` | How many lines to render. More = prettier. More = slower. Choose wisely. |
| `colors` | `string[]` | `['text-red-500/20', 'text-slate-400/30']` | Array of CSS color class names. Tailwind classes work great, but any classes that set `color` CSS property will work. The component uses `stroke="currentColor"`. |
| `minStrokeWidth` | `number` | `1` | Minimum line thickness in pixels. For the subtle among us. |
| `maxStrokeWidth` | `number` | `3` | Maximum line thickness in pixels. For the bold and brash. |
| `minDuration` | `number` | `5` | Minimum animation duration in seconds. Lower = more frantic. |
| `maxDuration` | `number` | `10` | Maximum animation duration in seconds. Higher = more chill. |
| `className` | `string` | `''` | Additional CSS classes because you're never satisfied. |
| `backgroundColor` | `string` | `'var(--bg-primary)'` | Background color. Defaults to a CSS variable that probably doesn't exist in your project. |

### Variants Explained

- **worms** 🐛: Smooth, organic curves. The original. The classic. The "I saw this on Dribbble" special.
- **beetles** 🪲: Sharp, angular paths. For when you want your background to have _edge_.
- **ants** 🐜: Short, frantic segments. Anxiety-inducing or charming? You decide!
- **thunder** ⚡: Sharp zigzags. Embrace your inner Zeus. Zap zap!

## 🎨 Tailwind Setup

Make sure your `tailwind.config.js` includes the package in the `content` array:

```js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@alvianzf/squiggly-lines-go-brrr/dist/**/*.{js,mjs}', // Add this!
  ],
  // ... rest of your config
};
```

Otherwise, your colors won't work and you'll be sad. We'll be sad too. Everyone will be sad.

## 🤓 TypeScript Support

Fully typed because we're professionals (citation needed). Import the types if you need them:

```tsx
import type { SquigglyBackgroundProps, AnimationVariant } from '@alvianzf/squiggly-lines-go-brrr';
```

## ⚡ Performance

Look, let's be real here. This renders animated SVG paths with Framer Motion. It's not going to win any performance awards. But it _looks cool_, and isn't that what really matters?

Some tips:
- Keep `count` reasonable (50-100 is fine, 500 is asking for trouble)
- Use semi-transparent colors (`/10`, `/20`, `/30`)
- Test on actual devices, not just your $3000 MacBook Pro
- Maybe don't use this on a page that renders 10,000 items in a list

## 🐛 Troubleshooting

**Colors aren't showing up!**
- Did you install Tailwind? Did you update your `tailwind.config.js`? Do you even have a `tailwind.config.js`?

**Next.js throws a hydration error!**
- Shouldn't happen™️. The component checks for `window` before rendering. If it does happen, file an issue and we'll pretend to look at it.

**My site is slow now!**
- Yeah, that's the cost of beauty. Try reducing the `count` prop or increasing `minDuration`/`maxDuration`.

**Can I use this in production?**
- You _can_ do anything if you're brave enough. Should you? That's between you and your engineering manager.

## 📄 License

MIT - Do whatever you want with this. We're not liable if your product manager makes you remove it after seeing the performance impact.

## 🙏 Contributing

PRs welcome! Found a bug? Want to add another variant? Think the comments aren't sarcastic enough? Let's hear it!

## 💖 Credits

Built with:
- React (obviously)
- Framer Motion (for the smooth animations)
- TypeScript (for the type safety we claim to have)
- Tears and coffee (for the developer experience)

---

Made with ❤️ (and questionable decisions) by [@alvianzf](https://github.com/alvianzf)

_Remember: With great power comes great responsibility. Use squiggly lines responsibly._
