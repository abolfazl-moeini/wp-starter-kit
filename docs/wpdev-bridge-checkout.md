# WPDev Bridge + Checkout reference (Polaris)

Phase 2 of [`integrate.md`](../integrate.md): how a starter-kit module entry
uses `@wpdev/wpdev-bridge` against a live WPDev checkout page without rewriting
the PHP markup.

## Prerequisites

- WPDev + `wpdev-examples` checkout active
- Page already localizes `wpdev_checkout` (ajaxurl, late_ajaxurl, baseurl, nonce)
- Optional: Polarish `frontendStack: polaris`

## Entry sketch

`src/Modules/CheckoutShell/assets/entries/view.tsx`:

```tsx
import { render } from "preact";
import "@wpdev/polaris-stack/styles.css";
import { Alert, Card, Heading, Stack, Text } from "@wpdev/polaris-stack";
import {
  createCheckoutAjax,
  hasData,
  readWpdevFeatureConfig,
  getWpdevHooks,
} from "@wpdev/wpdev-bridge";

function CheckoutShellStatus(props: {
  message: string;
  tone?: "info" | "danger";
}) {
  return (
    <div className="ps-scope">
      <Stack gap="3">
        <Card>
          <Stack gap="2">
            <Heading level={3}>Checkout bridge</Heading>
            <Alert tone={props.tone || "info"}>{props.message}</Alert>
          </Stack>
        </Card>
      </Stack>
    </div>
  );
}

async function refreshOrderSummary(root: Element) {
  const config = readWpdevFeatureConfig();
  const ajax = createCheckoutAjax(config.checkout, config.ajax);
  const hooks = getWpdevHooks();

  try {
    const res = await ajax.post("wpdev_create_order", {
      // Prefer values already on the legacy Vue checkout instance when present.
      products: (window as any).wpdev_checkout?.products || [],
      membership_id: (window as any).wpdev_checkout?.membership_id,
    });

    if (!hasData(res) || !(res.data as any)?.order) {
      render(
        <CheckoutShellStatus
          tone="danger"
          message={res.message || "Order create failed"}
        />,
        root,
      );
      return;
    }

    hooks.doAction("wpdev_on_create_order", null, res.data);

    render(
      <CheckoutShellStatus message="Order summary refreshed via @wpdev/wpdev-bridge" />,
      root,
    );
  } catch (err: any) {
    render(
      <CheckoutShellStatus
        tone="danger"
        message={err?.message || "Request failed"}
      />,
      root,
    );
  }
}

function mountAll() {
  document.querySelectorAll("[data-wpdev-checkout-shell]").forEach((el) => {
    refreshOrderSummary(el);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountAll);
} else {
  mountAll();
}
```

## PHP mount point

Keep the existing checkout form. Add only a scoped shell root (do not wrap the
whole registration page in `.ps-scope`):

```php
echo '<div data-wpdev-checkout-shell></div>';
```

Enqueue the built bundle **after** `wpdev-checkout` so `wpdev_checkout` is
localized.

## Contract checklist

| Concern   | Rule                                                         |
| --------- | ------------------------------------------------------------ |
| Nonce     | `_wpnonce` = `wpdev_checkout.nonce` (not `wpdev-ajax-nonce`) |
| Transport | light (`ajaxurl`); `wpdev_validate_form` → `late_ajaxurl`    |
| Envelope  | always guard with `hasData(res)` before `res.data.order`     |
| Hooks     | `getWpdevHooks().doAction('wpdev_on_create_order', …)`       |
| Polaris   | wrap only the shell root in `.ps-scope`                      |

## Legacy checkout alignment

`wpdev-examples` checkout `request()` now normalizes envelopes the same way
(`normalize_ajax_envelope`) so bare light-ajax `1` responses no longer reach
`results.data.order` unchecked.
