---
title: What is Deno?
publish_date: 2023-02-10
abstract: Exploring Deno, a fabulous state-of-the-art TypeScript runtime which seems capable of dethroning Node
---

As their website, also known as [dotland](https://deno.land/manual/introduction)
says, Deno (/ˈdiːnoʊ/, pronounced dee-no) is a JavaScript, TypeScript, and
WebAssembly runtime with secure defaults and a great developer experience.

```ts
"node".split("").sort().join("");
```

# Installing Deno

Using Shell (MacOS and Linux)

```sh
$ curl -fsSL https://deno.land/x/install/install.sh | sh
```

Using PowerShell (Windows)

```powershell
$ irm "https://deno.land/install.ps1" | iex
```

Build and install from source using Cargo

```sh
$ cargo install deno --locked
```

# About Deno

## The basics

Deno has a wide variety of features which greatly enhance the Developer
Experience, which is key to Deno. These include `TypeScript` support out of the
box for instance. You can avoid the hassle of installing `tsc`, `typescript` and
all the paraphernalia related to `package.json` and `npm` in general.

```
$ deno run https://deno.land/std@0.176.0/examples/welcome.ts
Welcome to Deno!
```

We just started and we can see some key Deno concepts already. For instance, we
can use `URL` imports, including those directly pointing to `TypeScript`
sources, the way to exeute code is with the `run` subcommand, which means there
are more subcommands, and that the version is pinned in the URL to the version
`@0.176.0`.

## Context

Deno is built on top of `Rust`, `v8` and `Tokio`. These are the programming
language, engine and event loop, respectively. Since Deno is
[open source](https://github.com/denoland/deno), we can play with its internals.

It was created by [Ryan Dahl](https://github.com/ry), creator of `node` too. In
his speech
[10 things I regret about node](https://www.youtube.com/watch?v=M3BM9TB-8yA),
which in fact are `7`, he explains node's design caveats. Some include allowing
a private company to control the module ecosystem (`npm`, owned by `Microsoft`)
and not following any standard.

# Key features

## Security

Deno is `secure` by default, which means that it doesn't have any `dangerous`
permission granted by default.

The permission system uses flags such as `--allow-net` and `--allow-read`, for
instance. This allows for a granular permission experience.

If we do not grant a permission to a process, we get this prompt requesting the
permission with some extra information.

```sh
$ deno run test.ts
   ┌ Deno requests net access to "example.com".
   ├ Requested by `fetch()` API
   ├ Run again with --allow-net to bypass this prompt.
   └ Allow? [y/n] (y = yes, allow; n = no, deny) >
```

## Compatibility

Deno is completely `Web` compatible. This means that web-standard APIs such as
`fetch`, `WebSocket` and `Blob` are perfectly implemented in Deno, and they can
be run in the server. This greatly improves the developer experience because one
as a developer must not remember runtime-specific APIs.

```ts
type ApiResponse<T extends "admin" | "user"> = T extends "admin"
  ? { salary: number }
  : { tier: "free" | "premium" };

const res = await fetch("https://api.example.dev/admin/whoami", {
  headers: {
    "Authorization": `Bearer ${Deno.env.get("AUTH_TOKEN")}`,
  },
});

const raw = new TextDecoder().decode(await res.arrayBuffer());

const data: ApiResponse<"admin"> = JSON.parse(raw);

console.log(data.salary);
```

In this code snippet there is a trivial conditional type `ApiResponse`, and also
an API call to get some data. This code (once transpiled to `JavaScript`) will
run perfectly on the client. To run it on the server this is not necessary. Web
APIs such as `fetch` and `TextDecoder` are used.

## New standards

Deno also supports top-level `await` without tedious configuration. This avoids
the use of legacy `IIFEs` (Immediately Invoked Function Expressions), which
clutter the code and add unnecessary boilerplate. This also means that other
modules, when importing, wait for the whole module to be evaluated.

```ts
// Without top-level await support
(async function () {
  const data = await doSomething({ admin: false });
  console.log(data);
})();

// With top-level await support
const data = await doSomething({ admin: false });
console.log(data);
```

# Deno vs Node

## Node setup

### Installing the required packages

Let's create a `TypeScript` project with `node`:

```sh
# Create default package.json
$ npm init -y

# Install TypeScript as a dev dependency
$ npm install -D typescript

# Install types for node
$ npm install -D @types/node

# Create tsconfig.json file with defaults
$ npx tsc --init

# Edit the tsconfig.json to use newer options
$ nvim tsconfig.json
```

### Setting up the tsconfig.json

By default the generated `tsconfig.json` by `tsc` uses old presets, we must
update them. I suggest you look at all the available options and choose your
prefered ones.

```json
{
  "compilerOptions": {
    "target": "es2022", // latest target
    "module": "es2022", // use import/export instead of require
    "lib": ["es6", "dom"], // enable `es6` + `dom` APIs
    "allowJs": true, // import .js files too
    "outDir": "dist", // place transpiled code in `dist/`
    "rootDir": "src", // get our sources from `src/`
    "strict": true, // enable strict mode
    "noImplicitAny": true, // prohibit `any`
    "esModuleInterop": true // enable cjs imports
  }
}
```

### Setting up a file watcher

Due to the nature of `TypeScript`, it must be transpiled to `JavaScript` before
running it. It is extremely tedious to run `npx tsc` every time, so we will do
that automatically. This will automatically transpile and run on every file
change.

```sh
# Install file watcher + transpiler
$ npm i -D nodemon ts-node
```

Now we need to edit `package.json` to add the script.

```json
{
  "scripts": {
    "watch": "nodemon --watch \"src/**\" --ext \"ts,json\" --ignore \"dist/**\" --exec \"ts-node src/index.ts\""
  }
}
```

And lastly execute the script we just created.

```sh
# Start the watcher
$ npm run watch
```

### Time to write some code

```sh
$ mkdir src
$ nvim src/index.ts
```

```ts
console.log("Hello from Node!");
```

Now the console should yield:

```
Hello from Node!
```

If you are not familiar with setting up `TypeScript`, this setup can become
unpleasant and quite tedious, just to get your code transpiling correctly.

### Something to consider

Some new `tsconfig.json` setups require some trickery and tweaks to get
everything running smoothly. Take for instance this code:

```ts
import doSomething from "../../utils";

console.log(await doSomething({ admin: false }));
```

The `transpiled` code is the same, but `node` cannot resolve the import!

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...' imported from '...'
```

To fix this, we have to import out `TypeScript` sources from `.js` files. Not
ideal in my opinion.

```ts
import doSomething from "../../utils.js";

console.log(await doSomething({ admin: false }));
```

## Deno setup

### Running TypeScript

Let's create a `main.ts` file and add some `TypeScript`:

```ts
console.log("Hello from Deno!");
```

And done. Is this a world record?

```
$ deno run main.ts
Hello from Deno!
```

### Setting up the watcher

Let's create a Deno configuration file, `deno.jsonc`. The `.jsonc` extension
stands for JSON with comments.

Deno provides a `builtin` watcher, under the `--watch` flag.

```json
{
  // user-defined scripts
  "tasks": {
    "dev": "deno run --watch main.ts"
  }
}
```

Let's run the `watcher`:

```
$ deno task dev
```

# Deno's toolchain

These are some of the most useful deno subcommands. You can check the manual
directly [here](https://deno.land/manual/tools), it is worth checking out!

## Init

Even though Deno doesn't need more than a file to start, this subcommand
scaffolds a project with `testing`, `benchmarks` and file `watching`.

```sh
$ deno init
✅ Project initialized

Run these commands to get started

  # Run the program
  deno run main.ts

  # Run the program and watch for file changes
  deno task dev

  # Run the tests
  deno test

  # Run the benchmarks
  deno bench
```

## Bench

Deno has a built-in benchmark runner that you can use to check the `performance`
of JavaScript or TypeScript code.

We first set up benchmarks with the `Deno.bench` API:

```ts
import { add } from "./main.ts";

Deno.bench(function addBig() {
  add(2 ** 32, 2 ** 32);
});
```

And then we get the results:

```sh
$ deno bench
Check file:///Users/javii/Code/demo/main_bench.ts
cpu: Intel(R) Core(TM) i7-8650U CPU @ 1.90GHz
runtime: deno 1.30.2 (x86_64-apple-darwin)

file:///Users/javii/Code/demo/main_bench.ts
benchmark      time (avg)             (min … max)       p75       p99      p995
------------------------------------------------- -----------------------------
addBig       6.64 ns/iter    (5.62 ns … 75.78 ns)   6.83 ns  14.11 ns  14.93 ns
```

## Bundle

This will output a single JavaScript file for Deno's consumption, which includes
all dependencies of the specified input.

```sh
$ deno bundle https://deno.land/std@0.173.0/examples/colors.ts colors.bundle.js
Bundle https://deno.land/std@0.173.0/examples/colors.ts
Download https://deno.land/std@0.173.0/examples/colors.ts
Download https://deno.land/std@0.173.0/fmt/colors.ts
Emit "colors.bundle.js" (9.83KB)
```

After that, we can consume the JavaScript from the generated `self-contained`
module.

```ts
import { green } from "./colors.bundle.js";

console.log(green("I am green!"));
```

## Compile

This subcommand generates a `self-contained` executable. It is imperative for
flags to be set at compile time, or else they won't work. You can also specify
the target arch with the `--arch` flag.

```sh
$ deno compile --allow-read --allow-net https://deno.land/std/http/file_server.ts
```

Then we just run the executable. This is a great way to distribute code.

```sh
$ ./file_server -help
```

## Doc

Deno is also capable of generating documentation. It transforms the `JSDoc`
present in source files to build it up. Only `exported` members have
documentation generated.

```ts
/**
 * Adds x and y.
 * @param {number} x
 * @param {number} y
 * @returns {number} Sum of x and y
 */
export function add(x: number, y: number): number {
  return x + y;
}
```

This would be the example output for the `add` function:

```
$ deno doc add.ts
function add(x: number, y: number): number
  Adds x and y. @param {number} x @param {number} y @returns {number} Sum of x and y
```

## Fmt

Deno ships with an `opinionated` formatter, which used to be even more
opinionated. It is as easy as running the subcommand, zero configuration is
needed. The benefit of this formatter is that it maintains a consistent style
across codebases. To ignore some code, add the `deno-fmt-ignore` comment above.
This formatter supports `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.json` and
`.jsonc`.

```sh
$ deno fmt
/Users/javii/Code/demo/main.ts
Checked 4 files
```

Configuration can be set under the `fmt` field of the `deno.jsonc` config file.
This is an example configuration with all possible options:

```json
{
  "fmt": {
    "files": {
      "include": ["src/"],
      "exclude": ["src/testdata/"]
    },
    "options": {
      "useTabs": true,
      "lineWidth": 80,
      "indentWidth": 4,
      "singleQuote": true,
      "proseWrap": "preserve"
    }
  }
}
```

## Lint

Deno also ships with a `JavaScript` and `TypeScript` linter. All the available
rules are listed [here](https://lint.deno.land/).

```ts
$ deno lint
(no-explicit-any) `any` type is not allowed
export const fn = (b: any) => b + 1;
                      ^^^
    at /Users/javii/Code/demo/main.ts:1:23

    hint: Use a specific type other than `any`
    help: for further information visit https://lint.deno.land/#no-explicit-any

Found 1 problem
Checked 3 files
```

## Task

We have already used this subcommand, and it provides a way to run custom
commands. First we need to define them in a `tasks` property in the `deno.jsonc`
configuration file.

```json
{
  "tasks": {
    "data": "deno task collect && deno task analyze",
    "collect": "deno run --allow-read=. --allow-write=. scripts/collect.js",
    "analyze": "deno run --allow-read=. scripts/analyze.js"
  }
}
```

Now we can run the defined task as follows:

```sh
$ deno task collect
```

## Test

Deno also ships with a builtin `test` runner to make unit tests. This command
has two steps, similar to the `bench` subcommand. We first register the `test`.

```ts
import { assertEquals } from "https://deno.land/std@0.173.0/testing/asserts.ts";

Deno.test("url test", () => {
  const url = new URL("./foo.js", "https://deno.land/");
  assertEquals(url.href, "https://deno.land/foo.js");
});
```

After that, we can generate the `report`:

```sh
$ deno test url_test.ts
running 1 test from file:///dev/url_test.js
test url test ... ok (2ms)

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out (9ms)
```

# Extras

Deno still has two aces up its sleeve. A `next-gen` web framework, and a great
place to `deploy` your Deno code!

## Fresh

Fresh is a `next-gen` framework. It does just-in-time rendering on the edge!
This means that the server serving the data is as closest as possible to the
localization of the request.
[This blog post](https://deno.com/blog/the-future-of-web-is-on-the-edge)
explains it in depth, and is worth a read.

### The basics

Besides that, it uses island-based client `hydration`. It is a fancy way of
saying that only certain parts of your website have `JavaScript` shipped to the
client, in order to minify waiting time.

Another important characteristic is that it uses file-system routing à la
`Next.js`. File structure directly resembles the available endpoints!

It also gives you the option of using `twind` for the styling, which is
recommended. It uses `preact` instead of `react` as well.

Starting a new fresh project is as easy as excuting two commands:

```sh
# Scaffold the project and install dependencies
$ deno run -A -r https://fresh.deno.dev my-fresh-app
```

```sh
# Start the server on http://localhost:8000/
deno task start
```

## Project structure

This is the file structure created:

```sh
$ tree
.
├── README.md
├── components
│   └── Button.tsx
├── deno.json
├── dev.ts
├── fresh.gen.ts
├── import_map.json
├── islands
│   └── Counter.tsx
├── main.ts
├── routes
│   ├── [name].tsx
│   ├── api
│   │   └── joke.ts
│   └── index.tsx
├── static
│   ├── favicon.ico
│   └── logo.svg
└── twind.config.ts
```

## Key parts

The important folders are `components/`, `islands/` and `routes/`.

### Components

The `components/` folder is where normal components are placed. These components
have no `JavaScript`. If they did have it, it will get stripped out. This is an
example of a button. Extra functionality is included under the `$fresh` module.

```ts
import { JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";

export function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class="px-2 py-1 border(gray-100 2) hover:bg-gray-200"
    />
  );
}
```

### Islands

The `islands/` folder is where components with `JavaScript` get placed. These
components ship `JavaScript` to the client, in order to make the website
interactive. Due to this, they are heavier in size. Components with `JavaScript`
must be inside this directory.

```ts
import { useState } from "preact/hooks";
import { Button } from "../components/Button.tsx";

export default function Counter(props: { start: number }) {
  const [count, setCount] = useState(props.start);
  return (
    <div class="flex gap-2 w-full">
      <p class="flex-grow-1 font-bold text-xl">{count}</p>
      <Button onClick={() => setCount(count - 1)}>-1</Button>
      <Button onClick={() => setCount(count + 1)}>+1</Button>
    </div>
  );
}
```

### Routes

The `index.tsx` file is the main entry point. It must export a `component`.

```ts
import { Counter } from "../islands/Countex.tsx";

export default function Home() {
  return (
    <div>
      <Counter />
    </div>
  );
}
```

## Deploy

Deploy is a distributed system that allows you to run `JavaScript`, `TypeScript`
and `WebAssembly` close to users, at the edge, worldwide.

Deploy also provides the latest and greatest in web technologies in a `globally`
scalable way.

It also supports `CI/CD` thanks to
[deployctl](https://deno.land/x/deploy/deployctl.ts).

```yaml
job:
  permissions:
    id-token: write
    contents: read
  steps:
    - name: Deploy to Deno Deploy
      uses: denoland/deployctl@v1
      with:
        project: awesome-fresh-site
        entrypoint: main.ts
```

# Wrapping up

Deno is a great tool, and it is in a really early phase yet. The best is yet to
come!
