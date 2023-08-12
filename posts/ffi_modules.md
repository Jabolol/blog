---
title: FFI-Dependent Module Publishing
publish_date: 2023-07-17
abstract: Discover how to ease the process of publishing FFI-dependent modules
---

> Featured on **Deno 1.36**
> [release notes](https://deno.news/archive/deno-august-update-more-flexible-security-in-136#community-showcase)!

Publishing modules on [`dotland`](https://deno.land/x), Deno's third party
module registry, is fairly straightforward. Create a public repository on
GitHub, choose a name for your module, set up a webhook and start releasing! It
will automatically be reflected on the registry.

Nonetheless, some setups are more complex than others, and it is not always a
piece of cake! Let's take for example publishing and distributing FFI-dependent
modules, which rely on non-portable libraries; an effective cross-platform
workflow is needed.

The aim of this blog post is to simplify the whole process of developing and
publishing FFI-dependent modules by offering a comprehensive and detailed
walkthrough.

For this guide, we will develop a high performance HTTP framework, using C and
TypeScript, built for speed, leveraging the use of FFI to create an efficient
routing system. The finished library, `turbo`, is hosted on
[`Github`](https://github.com/Jabolol/turbo) and on
[`dotland`](https://deno.land/x/turbo).

# Project setup

Since our project has two main parts, the C native backend and the TypeScript
wrapper, we will use a typical C project setup, likewise:

```sh
$ tree
.
├── LICENSE            # The project's license file
├── Makefile           # Makefile for building the C backend
├── README.md          # Project's README file with documentation
├── deno.json          # Deno configuration file
├── include            # Folder containing C header files
│    └── turbo.h       # Header file for the C backend
├── main.ts            # TypeScript file containing the main wrapper logic
├── mod.ts             # TypeScript module file for exporting functionality
├── sources            # Folder containing C source files
│    └── main.c        # Main C backend source file
└── types.ts           # TypeScript file containing type definitions
```

## Basic functionality

### Makefile setup

In order to ensure that everything is working, we will create a simple "hello
world" function, which we will call from our TypeScript wrapper. This will
execute the low level C code from our high level TypeScript abstraction!.

Let's create our `Makefile`. First of all, we define the flags for the C
compiler

```makefile
CC := gcc
CFLAGS := -Wall -Werror -fPIC
DEPFLAGS = -MMD -MP
```

We also define the `sources` and the `library` directory.

```makefile
SRC_DIR := sources
LIB_DIR := .
```

Now, we define the object files, being `sources/*.c` -> `sources/*.o`, and the
dependencies.

```makefile
SRCS := $(wildcard $(SRC_DIR)/*.c)
OBJS := $(patsubst $(SRC_DIR)/%.c,%.o,$(SRCS))
DEPS := $(patsubst %.o,%.d,$(OBJS))
```

After that, we check the platform and update the `extension` and `name` of the
library. We will name Linux and macOS libraries `libturbo.so` and
`libturbo.dylib`, respectively. On Windows, it will be `turbo.dll`.

```makefile
LIB_NAME := libturbo

ifeq ($(OS), Windows_NT)
	LIB_NAME = turbo
	LIB_EXT := dll
	LIB_LDFLAGS := -shared
else
	ifeq ($(shell uname),Darwin)
		LIB_EXT := dylib
		LIB_LDFLAGS := -dynamiclib
	else
		LIB_EXT := so
		LIB_LDFLAGS := -shared
	endif
endif
```

Lastly, let's define the recipes. The first one executes the matching recipe
defined below.

```makefile
.PHONY: all
all: $(LIB_DIR)/$(LIB_NAME).$(LIB_EXT)
```

The second one compiles individual C source files into object files, utilizing
dependency files.

```makefile
%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) $(DEPFLAGS) -c $< -o $@

-include $(DEPS)
```

The third one links the object files to create the final shared library.

```makefile
$(LIB_DIR)/$(LIB_NAME).$(LIB_EXT): $(OBJS)
	$(CC) $(CFLAGS) $(LIB_LDFLAGS) $^ -o $@
```

And finally, the last recipe is a cleanup task to remove all object files,
dependency files, and the generated shared library.

```makefile
.PHONY: clean
clean:
	@rm -f $(OBJS) $(DEPS) $(LIB_DIR)/$(LIB_NAME).$(LIB_EXT)
```

### C setup

Now, let's create a simple function that just prints "hello world" in
`sources/main.c`

```c
#include <stdio.h>

void hello(void)
{
    printf("Hello, World!\n");
}
```

### TypeScript setup

Time to call our native C code from TypeScript. I am currently on a `macOS`, so
my library name will be `libturbo.dylib`. Change it according to your platform.
Let's edit `main.ts`:

First of all, we load the dynamic library and get the exported symbols.

```ts
const libturbo = Deno.dlopen("./libturbo.dylib", {
  hello: { parameters: [], result: "void" },
});
```

Then, we call the exported `hello` function.

```ts
libturbo.symbols.hello();
```

Finally, we close the dynamic library to free up resources.

```ts
libturbo.close();
```

In order to run this, we need to compile our library and then run the TypeScript
code as follows:

```sh
$ make && deno run --unstable --allow-ffi main.ts
gcc -Wall -Werror -fPIC -MMD -MP -c sources/main.c -o main.o
gcc -Wall -Werror -fPIC -dynamiclib main.o -o libturbo.dylib
Hello, World!
```

To clean the project root run:

```sh
$ make clean
```

## Main C functionality

In order to take advantage of C's speed, we will store all the routes in a
binary search tree, which allows for efficient search and retrieval of routes
based on HTTP methods and paths.

First, let's define the structure of a node in `include/turbo.h`. This will
serve as the fundamental building block of our binary search tree. The `node_t`
struct encapsulates the necessary information to represent a single node in the
routing tree. Don't forget to add an include `guard`!

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct node {
    const char *method; /**< HTTP method */
    const char *path;   /**< The path to match */
    int32_t index;      /**< JavaScript array offset location */
    struct node *left;  /**< Pointer to the left child node */
    struct node *right; /**< Pointer to the right child node */
} node_t;
```

Second, let's define how routes should look like in TypeScript in `types.ts`. A
single route is an array with a handler function, a union with supported HTTP
methods and the relative path.

```ts
type Route = [
  (r: Request) => Response,
  "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  `/${string}`,
];
```

We also define the handler for a not found route, as a fallback.

```ts
type NotFound = [(r: Request) => Response];
```

And finally the expected route type.

```ts
export type Routes = [NotFound, ...Route[]];
```

We need a way to pass data around from our TypeScript wrapper to our C backend,
right? A way to do so is by creating a simple JSON parser in C, and passing the
string around. Bear in mind the parser expects the array in the specified
format, and will fail otherwise. This function parses the JSON string into nodes
and constructs a binary tree from it.

### Parsing the routes

Let's edit `sources/main.c`. We initialize the variables needed for parsing,
including pointers and counters. We will traverse the JSON string to identify
individual route elements and create corresponding nodes in the binary search
tree.

```c
node_t *_open(char *data)
{
    node_t *root = NULL;
    int64_t level = 0, index = 0, cursor = 0, length = 0;
    const char *temp = ++data;
```

Within the function, we perform an initial pass through the JSON string to
determine the total number of route elements. We will use this to know how much
memory to allocate, since we will use a memory pool.

```c
while (*temp)
    if (*++temp == '[')
        ++length;
```

After determining the number of route elements, we allocate memory for the
binary search tree using `malloc`. The root variable will hold the pointer to
the root node, and we ensure that all memory locations are initialized to zero
using `memset`. We add one more element to hold a `null` pointer at the end.

```c
if (!((root = malloc(sizeof *root * ++length))))
    return NULL;

memset(root, 0, sizeof *root * length);
```

As we traverse the JSON string again, we employ a switch statement to handle
different characters. In this part of the function, we are identifying
individual components of each route element, such as the HTTP method, path, and
the corresponding JavaScript array offset location.

```c
while (*data) {
    switch (*data) {
```

Depending on the amount of encountered `brackets`, we can know how deep we are
in the JSON, assuming the input is valid JSON.

```c
case '[': level++; break;
case ']': level--; break;
```

On the event of finding a `quote`, we will change it for a `null` terminator, so
that the quote is not part of the `path` in the node.

```c
case '"': *data = '\0'; break;
```

When we find a `comma`, it indicates the end of a route element within the JSON
array.

```c
case ',': {
```

If the level is zero, we are not inside a route, so we have completed parsing a
complete route element. We need to prepare for the next route element and update
the necessary pointers and counters.

```c
if (level == 0) {
    cursor = 0;
    index++;
    (root + index - 1)->index = index;
}
```

If the level is one, we are inside a route, and we need to extract and store the
relevant information for the current route element. The JSON parser will
populate the binary search tree's nodes with the HTTP method, path, and
corresponding JavaScript array offset location.

```c
        if (level == 1) {
            *(const char **) ((char *) (root + index - 1)
                + (sizeof(const char *) * cursor++)) = data + 2;
        }
    }
}
```

We increment the pointer to the data to continue traversing the string.

```c
    ++data;
}
```

Finally, we build the binary tree from the memory pool of adjacent nodes.

```c
    return _tree(root, index);
}
```

These routes would produce this output:

```ts
const routes: Routes = [
  [({ url }) => new Response(`:: ${url} not found`, { status: 404 })],
  [() => new Response("hello world!", { status: 200 }), "GET", "/hello"],
  [() => new Response("invalid request", { status: 400 }), "POST", "/invalid"],
];
```

```json
[[null], [null, "GET", "/hello"], [null, "POST", "/invalid"]]
```

Now that the parsing is done, we have a memory pool with the adjacent nodes.
Let's build a binary tree from them.

### Building the binary tree

First, we initialize a pointer `current` to the `root` node, and we loop through
the nodes starting from the second element because the first element is already
considered as the root.

```c
node_t *_tree(node_t *root, int32_t total)
{
    int32_t cmp = 0;
    node_t *current = root;

    for (int32_t i = 1; (root + i)->method; i++) {
        while (1) {
```

If the `path` of the current node is lexicographically less than the `path` of
the `current` node, we move to the left child if it exists; otherwise, we create
a left child for the `current` node and break out of the inner loop.

```c
if (cmp < 0) {
    if (current->left) {
        current = current->left;
    } else {
        current->left = root + i;
        break;
    }
```

If the `path` of the current node is lexicographically greater than the `path`
of the `current` node, we move to the right child if it exists; otherwise, we
create a right child for the `current` node and break out of the inner loop.

```c
} else if (cmp > 0) {
    if (current->right) {
        current = current->right;
    } else {
        current->right = root + i;
        break;
    }
```

If the `path` of the current node is equal to the `path` of the `current` node,
it means we have found a duplicate path, and we break out of the inner loop.
This is not implemented yet.

```c
        } else {
            // TODO(jabolo): Implement multiple methods for a route.
            break;
        }
    }
}
```

Finally, we return the `root` pointer, which now represents the root of the
constructed binary search tree.

```c
    return root;
}
```

Now that we have our binary tree, we have to be able to retrieve the handler
given a `path` and `method`.

### Finding the handler

First, we initialize the necessary pointer and offset variables, such as the
`subpath` and if a `query` is present.

```c
int32_t _find(const node_t *root, const char *method, const char *path)
{
    int32_t cmp = 0;
    const node_t *current = root;
    const char *subpath = strchr(path + 8, '/');
    char *query = strchr(path + 8, '?');
```

If the `query` pointer is not null, we put a `null` terminator to ignore it.
This is not yet implemented.

```c
// TODO(jabolo): Implement query string parsing.
if (query)
    *query = '\0';
```

Then we compare the `subpath` and the `current` node path lexicographically
while there's a node.

```c
while (current) {
    cmp = strcmp(subpath, current->path);
```

If the `subpath` of the current node is lexicographically smaller than the
`path`, we move to the left child.

```c
if (cmp < 0) {
    current = current->left;
```

If the `subpath` of the current node is lexicographically greater than the
`path`, we move to the right child.

```c
} else if (cmp > 0) {
    current = current->right;
```

If both are equal, we found the relative index, and we return the index of the
`routes` array in the TypeScript world.

```c
    } else {
        return current->index;
    }
}
```

If no match is found, the function returns 0, which serves as a fallback for the
not found handler.

```c
    return 0;
}
```

### Freeing up resources

Since we used an adjacent memory pool, we traded some readability for ease of
clean up. We just need to `free` the root, and all nodes will be freed up too!

```c
void _free(node_t *root)
{
    free(root);
}
```

## Main TypeScript functionality

Now that the underlying C implementation is done, we need to create TypeScript
wrappers to offer a seamless interoperability.

Let's create a `deno.json` file to store some metadata for our release system.
Replace the `github` property with your repository.

```json
{
  "name": "turbo",
  "version": "0.0.1",
  "github": "https://github.com/Jabolol/turbo",
  "lock": false
}
```

### Loading the library

In order to use the symbols, we first have to open the library. We will create a
platform-agnostic function later, but for the moment, we will hard-code it. Edit
`main.ts` and update the library argument to match the one of your argument.

First, we export the symbols for the library:

```ts
export const _symbols = {
  _open: { parameters: ["buffer"], result: "pointer" },
  _find: { parameters: ["pointer", "buffer", "buffer"], result: "i32" },
  _free: { parameters: ["pointer"], result: "void" },
} as const;
```

Now, in `types.ts`, let's create a type that represents the library.

```ts
import { _symbols } from "./main.ts";
export type LibTurbo = Deno.DynamicLibrary<typeof _symbols>;
```

After that, let's add an object with the supported platforms to `main.ts` as
follows:

```ts
const extensions: { [k in typeof Deno.build.os]?: string } = {
  darwin: "dylib",
  linux: "so",
  windows: "dll",
};
```

We will need to add some `imports`. First, the symbol `dlopen` from
[`plug`](https://deno.land/x/plug), a superb FFI helper. It allows us to
download shared objects from a URL, featuring out of the box name-guessing!
Then, the `config` from our `deno.json` configuration file. Lastly, the required
`types` from `types.ts`:

```ts
import { dlopen } from "https://deno.land/x/plug@1.0.2/mod.ts";
import { type LibTurbo, type Routes } from "./types.ts";
import config from "./deno.json" assert { type: "json" };
```

And finally, let's create the `load` function. If our `os` is not in the
`extensions` object keys, it throws an error. Then, we use `plug` to cache and
open the dynamic library. This library will be hosted on `GitHub` releases.
Every time we create a new release, we will bump the version from the
`deno.json` configuration file, to match the one on `GitHub`.

```ts
export const load = async (): Promise<LibTurbo> => {
  if (!(Deno.build.os in extensions)) {
    throw new Error("Unsupported platform.");
  }
  return await dlopen({
    name: config.name,
    url: `${config.github}/releases/download/v${config.version}/`,
  }, _symbols);
};
```

### Building the tree

In order to pass strings from TypeScript to C, we must convert them to an
[`Uint8Array`](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array),
that is, an array of bytes. We can do this with a
[`TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder).

```ts
const encoder = new TextEncoder();
```

Since we already did the hard work in C, the TypeScript wrapper is minimal. We
call the `_open` exported symbol and return the `pointer` to the root node. It
is important to add a `null` terminator to the string.

```ts
export const init = (
  turbo: LibTurbo,
  routes: Routes,
): Deno.PointerValue => {
  const pointer = turbo.symbols._open(
    encoder.encode(JSON.stringify(routes) + "\0"),
  );
  if (!pointer) throw new Error("Failed to prepare routes");
  return pointer;
};
```

### Finding the handler

In order to find the correct handler, we make use of currying. This function
returns another function that takes a `Request` and returns a `Response`. It
uses the `_find` function to traverse the binary tree given the root. It calls
the function found with the passed `Request`. If no route satisfies the
constraints, it will fall back to the not found handler.

```ts
export const find = (
  turbo: LibTurbo,
  routes: Routes,
  root: Deno.PointerValue,
): (r: Request) => Response =>
(r: Request) =>
  routes[
    turbo.symbols._find(
      root,
      encoder.encode(r.method + "\0"),
      encoder.encode(r.url + "\0"),
    )
  ][0](r);
```

### Freeing up the resources

Since we have allocated memory for the `nodes`, we are responsible for `freeing`
it up. Therefore, we will close the dynamic `library` and call the `_free`
symbol we created before.

```ts
export const free = <
  T extends Deno.ForeignLibraryInterface,
>(
  lib: Deno.DynamicLibrary<T>,
  root: Deno.PointerValue,
) => {
  (lib.symbols as {
    _free: (args_0: Deno.PointerValue) => void;
  })._free(root);
  lib.close();
};
```

## Publishing our module

Before publishing our module to `dotland`, we need to create our cross-platform
library builds! We will take advantage of `GitHub` actions and build them there.
Create a file `.github/workflows/release.yml`:

### Setting up the workflow

We only want our workflow to run on `push` to the `main` branch.

```yml
name: CI

on:
  push:
    branches: [main]
```

We will use a `matrix` to run our workflow on `Windows`, `macOS` and `Linux`.

```yml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        
    runs-on: ${{ matrix.os }}
```

We then clone the repository with the full history.

```yml
steps:
  - name: Setup repo
    uses: actions/checkout@v3
    with:
      fetch-depth: 0
```

On Windows, we need to install `make`, since it is not pre-installed.

```yml
- name: Install dependencies (Windows)
  if: runner.os == 'Windows'
  run: choco install make -y
```

After that, we build our library running `make`!

```yml
- name: Build Native Library
  run: make
```

In the case of `Linux` and `Windows`, we `strip` the libraries to make them
smaller.

```yml
- name: Strip Native Library (Linux)
  if: runner.os == 'Linux'
  run: strip libturbo.so

- name: Strip Native Library (Windows)
  if: runner.os == 'Windows'
  run: strip turbo.dll
```

We also save the commit messages between tags, with every commit hash, in a
temporary file `release_body.txt`.

```yml
- name: Determine release body
  run: |
    echo "$(git log --oneline --no-decorate $(git describe --tags --abbrev=0 @^)..@)" > release_body.txt
```

And lastly, we use
[`softprops/action-gh-release@master`](https://github.com/softprops/action-gh-release)
to create a `draft` release with the description we saved and the libraries we
compiled.

```yml
- name: Release
  uses: softprops/action-gh-release@master
  if: ${{ github.ref == 'refs/heads/main' }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: "release draft"
    draft: true
    files: |
      turbo.dll
      libturbo.so
      libturbo.dylib
    body_path: release_body.txt
```

### Finishing the release

Once you have committed the file, proceed by pushing it to the main branch. This
action will generate a new `draft` release. To ensure consistency, modify the
title to match the `version` field found in the `deno.json` configuration file,
which, in our example, is `v0.0.1`. It is crucial to include the `v` before the
version number. Additionally, create a corresponding tag with the same version,
`v0.0.1`. Finally, complete the release process by publishing it.

### Deploying to dotland

Follow the instructions [`here`](https://deno.com/add_module).

## Testing our module

Create a new file, `example.ts`, and add the following code. Update the import
for the one you published.

```ts
import {
  find,
  free,
  init,
  load,
  type Routes,
} from "https://deno.land/x/turbo/mod.ts";

// Define the hostname and port for the server
const HOSTNAME = "localhost";
const PORT = 8000;

// Define the routes configuration
export const routes: Routes = [
  // Default route for handling not found URLs
  [({ url }) => new Response(`:: ${url} not found`, { status: 404 })],

  // Example route
  [() => new Response("hello world!", { status: 200 }), "GET", "/hello"],
];

// Load the Turbo library
const turbo = await load();

// Initialize the routes search tree and get the root node
const root = init(turbo, routes);

// Create the request handler using the Turbo library and routes
const handler = find(turbo, routes, root);

// Free up resources and close the Turbo library
Deno.addSignalListener("SIGINT", () => {
  free(turbo, root);
  Deno.exit(0);
});

let triggered = false;

globalThis.addEventListener("beforeunload", (evt) => {
  if (!triggered) {
    triggered = true;
    evt.preventDefault();
    free(turbo, root);
  }
});

// Start the server and listen for incoming requests
await Deno.serve({ port: PORT, hostname: HOSTNAME }, handler).finished;
```

Execute the script and test the framework like this:

```sh
$  deno run -A --unstable example.ts &
[1] 21934
Listening on http://localhost:8000/
$ curl http://localhost:8000/hello
hello world!
$ fg
[1]  + running    deno run -A --unstable example.ts
^C
```

## Wrapping up

Et voilà! Using Deno's `FFI`, `GitHub` actions and `plug`, it is possible to
maintain cross-platform, FFI-dependant modules. Found something wrong?
Contributions are welcome at [`turbo`](https://github.com/Jabolol/turbo), and at
my [`blog`](https://github.com/Jabolol/blog).
