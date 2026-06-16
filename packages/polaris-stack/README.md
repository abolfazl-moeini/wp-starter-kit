# @wpsk/polaris-stack

Polaris Stack is a lightweight design foundation that separates **layout** (spacing, flow, grids) from **style** (colors, typography, themes).

## Install

Inside a wp-starter-kit project, Polaris is copied to `src/polaris/` by the `wpsk` installer (`--frontend-stack=polaris`).

As a workspace package:

```bash
import "@wpsk/polaris-stack/styles.css";
import { Button, Card, Stack, setPolarisTheme } from "@wpsk/polaris-stack";
```

## Theme switching

Themes use CSS custom properties on `:root` / `[data-theme="dark"]`. Switch without React re-renders:

```ts
import { setPolarisTheme } from "@wpsk/polaris-stack";

setPolarisTheme("dark");
```

For SSR-safe initial theme, use `createPolarisThemeInitScript()` in an inline `<script>` before hydration.

## Layout vs style

- Use `Stack`, `Cluster`, `Grid`, etc. for spacing and arrangement only.
- Use `Button`, `Card`, `Text`, `Heading` for visual appearance.
- Never pass layout props (`gap`, `mt`, `gridColumn`) to styled components — wrap them in layout primitives instead.

## Do not do this

```tsx
// Wrong — mixing layout into a styled component API
<Card mt="8" gridColumn="1 / 3">...</Card>

// Wrong — hardcoded colors in components
<div style={{ color: "#2563eb" }}>...</div>
```

## React and Preact

Write framework-neutral TSX. The host project selects Preact (`react` → `@preact/compat`) or real React via `package.json` aliases.
