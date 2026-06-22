# AntigravityJS 🌌

A premium, lightweight, dependency-free Vanilla JS toast notification library designed for high visual fidelity, spring-physics kinetics, and organic liquid-gooey morphing stacks.

---

## Key Features

* 🧪 **Organic Gooey Stacking**: Integrates SVG blur and color matrix filter operations to merge stacking notifications together like fluid mercury droplets.
* 🛡️ **Dual-Layer Isolation**: Separation of the background capsules and the overlay content layer prevents text and icons from blurring, keeping text rendering crystal-sharp.
* 🌀 **Elastic Springs**: Physics-inspired entrance animations with elastic windups and rotational exit drifts.
* ⏳ **Smart Dynamic Extensions**: Enforces a minimum `5000ms` readable duration for temporary alerts, auto-extending timelines by `600ms` during mounting settle phases.
* ⏸️ **Hover-State Resuming**: Hovering over the container instantly pauses all active dismiss countdowns, resuming automatically upon mouse leave.
* 💓 **Custom Looping Heartbeats**: Periodically triggers idle keyframes (e.g. expanding neon-green ripples on Success toasts, swinging clappers on bells) every 4 seconds.

---

## File Deliverables

* **[antigravity.js](file:///c:/xampp/htdocs/sileo_copy/antigravity.js)**: Main ES6 class wrapper including auto-injections, coordinate stack updates, and queue/hover controllers.
* **[antigravity.css](file:///c:/xampp/htdocs/sileo_copy/antigravity.css)**: Performance-tuned CSS layout layers, keyframe animations, and customizable CSS variables.
* **[index.html](file:///c:/xampp/htdocs/sileo_copy/index.html)**: Interactive showcase page where users can configure positions, max toasts, gap size, gooey mode, and live duration.

---

## Quick Start

### 1. Import Files

```html
<!-- Stylesheet -->
<link rel="stylesheet" href="antigravity.css">

<!-- Script -->
<script src="antigravity.js"></script>
```

### 2. Instantiate Library

```javascript
const antigravity = new antigravityJS({
  position: 'bottom-right', // Options: 'bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'top-center'
  gooey: true,             // Enable/disable the liquid gooey blending filter
  maxToasts: 5,            // Max notification count visible concurrently
  gap: 16                  // Spacing between notifications in px
});
```

### 3. Display Notifications

```javascript
antigravity.show({
  title: 'Database Synchronized',
  message: 'Data successfully pushed to primary production nodes.',
  bootstrapContext: 'success', // Options: success, danger, warning, info, primary, dark, light
  duration: 5000,              // Display time in ms (0 for persistent/indefinite)
  onOpen: (toast) => console.log(`Toast #${toast.id} entered view`),
  onClose: (toast) => console.log(`Toast #${toast.id} started exit`)
});
```

---

## API & Parameter Specifications

### Configuration Options (`new antigravityJS(options)`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `position` | `string` | `'bottom-right'` | Placement boundary on the screen. |
| `gooey` | `boolean` | `true` | When true, enables fluid background morphing using SVG filter layers. |
| `maxToasts` | `number` | `5` | Maximum number of toasts shown. Additional toasts are placed in an internal queue. |
| `gap` | `number` | `16` | Vertical gap between stacked notifications in pixels. |

### Notification Parameters (`antigravity.show(params)`)

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `''` | Bold heading text at the top of the toast capsule. |
| `message` | `string` | `''` | Body/description details. Supports HTML layout tags. |
| `bootstrapContext` | `string` | `'info'` | Color palette mapping: `success`, `danger`, `warning`, `info`, `primary`, `dark`, or `light`. |
| `duration` | `number` | `5000` | Display duration. Set to `0` to keep the toast persistent until closed manually. |
| `onOpen` | `function` | `null` | Callback executed when the element enters the DOM. Passes the toast context. |
| `onClose` | `function` | `null` | Callback executed when the close button is clicked or timer expires. |

---

## Architectural Principle: Dual-Layer Isolation

Gooey effects rely on CSS blurs (`feGaussianBlur`) and color matrices (`feColorMatrix`). Applying these directly to blocks containing text will result in unreadable, blurred typography.

To bypass this, **AntigravityJS** maintains parallel layers:

```
[antigravity-container]
   ├── [antigravity-bg-layer] (Filtered / Blended)
   │      ├── [bg capsule #1]
   │      └── [bg capsule #2]
   └── [antigravity-content-layer] (Crisp / Unfiltered)
          ├── [content capsule #1] (Contains text, SVGs, buttons)
          └── [content capsule #2]
```

Both trees share identical dimensions and animation timelines, but utilize decoupled positioning pipelines to satisfy browser graphics engines:
1. **Background Layer (`.antigravity-bg-layer`)**: Positioned and moved using standard layout CSS properties (`left`, `top`, `bottom`). Because layout changes execute on the browser's main/layout thread, the browser **never** promotes individual background capsules to separate GPU-composited layers during transitions. This forces the SVG gooey filter to rasterize inline on every frame, eliminating transparent container lag or repaint glitches.
2. **Content Layer (`.antigravity-content-layer`)**: Translated using hardware-accelerated GPU `transform` coordinates (`translate()` and `scale()`) with `will-change` triggers for fluid, sub-pixel rendering.
3. Both layers stay in perfect lockstep alignment, synced automatically by sharing the exact same timing bezier curves (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`) and durations (`0.6s`).

---

## Custom Animation Design Rules

If you add custom SVG animations or hover colors inside the capsules, note that style selectors must target the text-color wrapper contexts instead of background classes:

* 🚫 **Incorrect**: `.antigravity-bg-success .antigravity-icon-wrapper` (matches nothing, background is in a separate subtree)
*  **Correct**: `.antigravity-text-success .antigravity-icon-wrapper` (resides in the content layer subtree)

---

## License

MIT License. Designed with 🌌 by Antigravity.
