# @stakesense/react-widget

React components for embedding [stakesense](https://github.com/mikejohnkurkeyerian-eng/stakesense) validator scores in your app. Companion to the framework-agnostic [widget.js](../../web/public/widget.js) drop-in.

```bash
npm install @stakesense/react-widget
```

## Usage

```tsx
import { ValidatorScore, TopValidators } from "@stakesense/react-widget";

export default function StakingPage() {
  return (
    <>
      <ValidatorScore votePubkey="5AC692spnjbegP7ttCXJEzUe8S81sLYsqJd8Ae6Zv1xU" />
      <TopValidators count={5} sort="composite" />
    </>
  );
}
```

## Props

### `<ValidatorScore />`

| Prop | Type | Default |
|---|---|---|
| `votePubkey` | string (required) | — |
| `apiBase` | string | `https://stakesense.onrender.com` |
| `theme` | `"light" \| "dark"` | `"light"` |
| `size` | `"full" \| "compact"` | `"full"` |
| `className` | string | — |

### `<TopValidators />`

| Prop | Type | Default |
|---|---|---|
| `count` | number | `5` |
| `sort` | `"composite" \| "downtime" \| "mev_tax" \| "decentralization"` | `"composite"` |
| `apiBase` | string | `https://stakesense.onrender.com` |
| `theme` | `"light" \| "dark"` | `"light"` |

## License

MIT — same as the rest of stakesense. Data is CC-BY 4.0.
