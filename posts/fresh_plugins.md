---
title: Using Fresh Plugins
publish_date: 2023-03-20
abstract: A thorough explanation for yet another obscure Fresh feature, plugins!
---

> Featured on **Deno News** [issue #57](https://deno.news/archive/5819)!

As you may or may not know, Fresh is the `next-gen` web framework. Even though
it is relatively new, it has gained a lot of popularity, with an astonishing
`10k` stars on [GitHub](https://github.com/denoland/fresh). The main features
are its just-in-time rendering on the edge, island based client hydration and no
build step.

As a regular Fresh user, one thing I've learned is that to get the most out of
Fresh, `types` are your best friend. Since all types are `documented`, one can
explore them and learn a lot. This is for example the case of `plugins`.

If you have used `Fresh` + `twind` before, you may have noticed that in the
`main.ts` file, the `start` function takes a `plugins` array:

```ts
/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";

await start(manifest, { plugins: [twindPlugin(twindConfig)] });
```

## What is a plugin?

As explained in the highly technical
[documentation](https://fresh.deno.dev/docs/concepts/plugins):

> Plugins can dynamically add new functionality to Fresh without exposing
> significant complexity to the user. Users can add plugins by importing and
> initializing them in their main.ts file:

This basically means that `Fresh` offers us developers a way to hook custom
`JavaScript` and `CSS` to our site. Cool!

## Usecases

If you are developing your website, you may have encountered one of the
following problems:

> Why do I have to use the special non-standard `_app.tsx`?

> I want to add global styles without adding them to the `static` folder.

> How do I add custom JavaScript in Fresh? Where are `script` tags?

The answer to all of those problems is: Write your own plugin!

## Injecting CSS

Let's create a really simple plugin that adds smooth scrolling to our website.

```ts
import { Plugin } from "$fresh/server.ts";

const CUSTOM_STYLE_ID = "__JBL_INJECT";

export const smooth: Plugin = {
  name: "smooth",
  render: ({ render }) => {
    render();
    return {
      // ...
      styles: [{
        cssText: "html {scroll-behavior: smooth;}",
        id: CUSTOM_STYLE_ID,
      }],
    };
  },
};
```

This as simple as it gets. We just export an Object of type `Plugin` that
returns a `render` function that itself calls the `ctx` destructured render
function and returns an array named `styles`.

Each of those objects of the `styles` array will be injected into the `head` of
our site, with the `id` set to the specified one. After adding it to the
`plugins` array in `main.ts`, the generated `head` would look like this,
provided that you are using the `twind` plugin:

```jsx
<style id="__FRSH_TWIND">...</style>
<style id="__JBL_INJECT">html {scroll-behavior: smooth;}</style>
```

## Injecting JavaScript

Now that the main structure of a `plugin` is clear, let's write one that appends
a `link` to the head so that our site has a `site.webmanifest`!

The structure of a `script` plugin looks like this. Basically whatever you pass
as `state` gets passed as an argument to the `script` that you specify in the
`entrypoint` key. The `state` parameter must be `JSON-serializable`, to pass it
as a prop in the client, and the `script` itself must export `default` a
function that takes that paremeter.

```ts
export interface PluginRenderScripts {
  /** The "key" of the entrypoint (as specified in `Plugin.entrypoints`) for the
   * script that should be loaded. The script must be an ES module that exports
   * a default function.
   *
   * The default function is invoked with the `state` argument specified below.
   */
  entrypoint: string;
  /** The state argument that is passed to the default export invocation of the
   * entrypoint's default export. The state must be JSON-serializable.
   */
  state: unknown;
}
```

Let's code the `injected` JavaScript function, which just appends an `Element`
of type `type` with props `props` to the `head` of the site.

```ts
export default function append({ type, ...props }) {
  const elem = document.createElement(type);
  for (const [key, value] of Object.entries(props)) {
    elem[key] = value;
  }
  document.head.append(elem);
}
```

Now comes the tricky part. We need to tell `Fresh` which `key` associates with
which `source`, so we do that in the `entrypoints` object to later refer in the
`entrypoint` key.

```ts
import { Plugin } from "$fresh/server.ts";

export const inject: Plugin = {
  name: "inject",
  entrypoints: {
    manifest:
      `data:application/javascript,export default function e({type:e,...t}){let n=document.createElement(e);for(let[a,f]of Object.entries(t))n[a]=f;document.head.append(n)};`,
  },
  // ...
};
```

As you have realized, the code has been `minimized` and put as a data `URI` with
MIME type `application/javascript`, so it can be used as a script.

The next step is to call the `render` function and return our `scripts`, with
the `entrypoint` key being the one pointing to our `script` source in the
`entrypoints` object, and `state` with the arguments to our `append` function.

```ts
import { Plugin } from "$fresh/server.ts";

export const inject: Plugin = {
  name: "inject",
  entrypoints: {
    manifest:
      `data:application/javascript,export default function e({type:e,...t}){let n=document.createElement(e);for(let[a,f]of Object.entries(t))n[a]=f;document.head.append(n)};`,
  },
  render: ({ render }) => {
    render();
    return {
      scripts: [{
        entrypoint: "manifest",
        state: {
          type: "link",
          rel: "manifest",
          href: "/site.webmanifest",
        },
      }],
      // ...
    };
  },
};
```

And that's it! Provided you have a valid `site.webmanifest` file in the `static`
directory, your document `head` should now have this, and the `script` tag with
the `__FRSH_STATE` id will have your provided `state` too! This is because
`Fresh` passes the `props` as `JSON`.

```jsx
<link rel="manifest" href="/site.webmanifest">
```

## Wrapping up

`Plugins` allow us to avoid having to create a separate file in the `static`
directory, then reference it from the non-standard `_app.tsx` file in order for
our website to have extra functionality. Now your `main.ts` should look like
this:

```ts
/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import twindPlugin from "$fresh/plugins/twind.ts";
import twindConfig from "./twind.config.ts";
import { inject, smooth } from "./plugins.ts";

await start(manifest, { plugins: [twindPlugin(twindConfig), inject, smooth] });
```

Another interesting use case for `plugins` is registering a `serviceWorker`, but
that will be left as an exercise to the reader.
