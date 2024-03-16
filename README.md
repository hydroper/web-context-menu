# Web context menu

<p align="center">
  <a href="https://tsdocs.dev/docs/com.hydroper.webcontextmenu/latest/index.html">
    <img src="https://img.shields.io/badge/TypeDoc%20Documentation-gray">
  </a>
</p>

Fully skinnable context menu library for web applications.

## Status

This library is almost satisfactory, but it includes the following bugs:

* Bug: Actions only work when clicked with Enter
* Bug: Actions do not work when clicking with the device pointer
* Bug: Click on a list item closes the context menu modal

## Documentation

Refer to the [TypeDoc documentation](https://tsdocs.dev/docs/com.hydroper.webcontextmenu/latest/index.html) for full details.

### Getting started

```ts
import { ContextMenu, ContextMenuItem } from "com.hydroper.webcontextmenu";

const menu = new ContextMenu({
    items: [
        new ContextMenuItem({
            title: "Greet",
            action: () => {
                alert("Hello, world!");
            },
        }),
    ],
    // Place it "at" a [x, y] position or "below" an element.
    at: [100, 100],
});
```

### Shortcuts

Shortcuts are handled through the [`com.hydroper.webinputaction`](https://npmjs.com/package/com.hydroper.webinputaction) package.

### Skinning

Context menus created via the `ContextMenu` constructor contribute the following elements:

* `body > .context-menu-modal` — Consists of all displayed context menus, placed at absolute positions.
  * `.context-menu` — Represents a single context menu at an arbitrary position.
    * `.context-menu > button` — Represents a clickable item, possibly disabled.
      * `ul`
        * `.title` — Item title.
        * `.right`
          * `.shortcut` — Consists of the list shortcut combination in characters.
          * `.list` — Consists of the list indicator icon.