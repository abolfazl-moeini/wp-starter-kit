# Polaris Stack starter page

Copy-pasteable admin page using only Polaris primitives and components.

## Setup

```ts
import "@wpdev/polaris-stack/styles.css";
import {
  Alert,
  Badge,
  Button,
  Card,
  Heading,
  Stack,
  Text,
  setPolarisTheme,
  createPolarisThemeInitScript,
} from "@wpdev/polaris-stack";
```

Inject before CSS in `<head>` to avoid FOUC:

```ts
const themeInit = createPolarisThemeInitScript({ defaultTheme: "system" });
```

## Starter page

```tsx
function PolarisStarterPage() {
  return (
    <div className="ps-scope">
      <Stack gap="6">
        <Stack gap="2">
          <Heading level={1} size="xl">
            Polaris demo
          </Heading>
          <Text tone="muted">
            Layout primitives + tokenized style. No custom CSS required.
          </Text>
          <Badge tone="info">v2</Badge>
        </Stack>

        <Alert tone="info">
          Override <code>--ps-color-primary</code> to rebrand. Never hardcode
          hex values on components.
        </Alert>

        <Card elevation={2}>
          <Stack gap="4">
            <Heading level={2}>Actions</Heading>
            <Stack gap="2">
              <Button variant="solid">Primary</Button>
              <Button variant="soft">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </Stack>
          </Stack>
        </Card>

        <Button
          variant="ghost"
          onClick={() =>
            setPolarisTheme(
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark",
            )
          }
        >
          Toggle dark mode
        </Button>
      </Stack>
    </div>
  );
}
```

## Themes

```ts
setPolarisTheme("light" | "dark" | "system" | "brand" | "hc");
```

| Theme    | Role                                               |
| -------- | -------------------------------------------------- |
| `light`  | Default `:root` tokens                             |
| `dark`   | Dark palette via `[data-theme="dark"]`             |
| `system` | Resolves to light/dark from `prefers-color-scheme` |
| `brand`  | Sample branded palette (token-only swap)           |
| `hc`     | High-contrast                                      |

Themes never change layout structure — only `--ps-*` tokens.

## Layout gallery (layout ≠ style)

```tsx
import {
  Card,
  Cluster,
  Grid,
  Heading,
  Sidebar,
  Stack,
  Switcher,
  Text,
} from "@wpdev/polaris-stack";

function LayoutGallery() {
  return (
    <div className="ps-scope">
      <Stack gap="6">
        <Stack gap="2">
          <Heading level={2}>Layouts</Heading>
          <Text tone="muted">
            Spacing lives on Stack / Grid — never on Card / Button.
          </Text>
        </Stack>
        <Grid gap="3" min="12rem">
          <Card>
            <Text>Cell</Text>
          </Card>
        </Grid>
        <Sidebar gap="3" sideWidth="10rem">
          <Card>
            <Text>Side</Text>
          </Card>
          <Card>
            <Text>Main</Text>
          </Card>
        </Sidebar>
        <Switcher gap="3" threshold="24rem">
          <Card>
            <Text>A</Text>
          </Card>
          <Card>
            <Text>B</Text>
          </Card>
        </Switcher>
        <Cluster gap="2">
          <Text>tags wrap here</Text>
        </Cluster>
      </Stack>
    </div>
  );
}
```

## Dark mode toggle (inline script + button)

For WordPress admin, output the init script early:

```php
<script><?php echo createPolarisThemeInitScript(); // via bundled JS build ?></script>
```

Then wire a header button with `setPolarisTheme("dark" | "light" | "system")`.

`subscribePolarisTheme` re-notifies when the OS theme changes and the stored preference is `"system"`.
