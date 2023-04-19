---
title: Cicada
publish_date: 2023-04-19
abstract: An exciting way to run CI pipelines with TypeScript and Deno
---

The widely accepted way to run `CI` pipelines is with `yaml` config files, as
done in `GitHub` and `GitLab`, for instance. Nonetheless, that is nothing more
than a `config` file. This means that in order to do something `different`, one
has to create a bash script accounting for the desired functionality. Bash is
ideal when it comes to `simple` parsing, or maybe reduced interaction between
services, but when complexity increases, it is not the tool for everyone.

There is where [`cicada`](https://cicada.build/) comes into play. It provides us
developers the means to create those `complex` and highly `personalized` scripts
with `TypeScript`, leveraging the power of `Deno` within those `CI` pipelines.

# Installing Cicada

Download the latest release. You must have [`Deno`](/posts/deno#installing-deno)
and [`Docker`](https://docs.docker.com/desktop/) installed.

> If you're not a fan of `curl | sh`, which you shouldn't, you can manually
> download the binary
> [`here`](https://github.com/cicadahq/cicada/releases/latest) and add it to the
> `$PATH`.

```sh
$ curl -fSsL https://raw.githubusercontent.com/cicadahq/cicada/main/download.sh | sh
```

# Creating a pipeline

A `pipeline` is nothing more than an array of `jobs`. Each `job` is an object.
Here's a simple `pipeline` which has just one `job`. It runs `echo` and checks
the status code. Create a folder named `.cicada` and add a file `test.ts`
inside. This will be our `pipeline`.

```ts
// .cicada/test.ts
import { Job, Pipeline } from "https://deno.land/x/cicada@v0.1.36/mod.ts";

const job = new Job({
  name: "Simple Pipeline",
  image: "ubuntu:22.04",
  steps: [
    {
      name: "Run `echo`",
      run: async () => {
        const command = new Deno.Command(`echo`, {
          args: ["Hello from Cicada!"],
        });
        const { stderr, success } = await command.output();
        if (!success) {
          console.error(new TextDecoder().decode(stderr));
          Deno.exit(1);
        }
        console.log("Success! Job completed.");
      },
    },
  ],
});

export default new Pipeline([job]);
```

We can run it using the following command:

```sh
$ cicada run .cicada/test.ts
```

# Advantages

## Deno

Since `Cicada` uses `Deno`, the developer experience greatly improves. This is
because `Deno` offers first class `TypeScript` support with `built-in` IDE
support, and it is a **real** programming language. It also inherits all of
`Deno's` advantages, such as `tooling`, `testing`, `formatter`, `linter`...

## Reusability

It is also worth mentioning that existing `code` can be reused inside the
pipelines, and it is not necessary to rewrite them in `bash`. This make it
easier by offering the possibility to use packages from the existing
`ecosystem`. One interesting `package` that works really well with `Cicada` is
[`dax`](https://deno.land/x/dax@0.31.0/mod.ts). It is a `Deno` port of
[`zx`](https://github.com/google/zx), which offers a neat `API` to run shell
commands. Rewriting our `pipeline` it would be simpler:

```ts
import { Job, Pipeline } from "https://deno.land/x/cicada@v0.1.36/mod.ts";
import $ from "https://deno.land/x/dax@0.31.0/mod.ts";

const job = new Job({
  name: "Simple Pipeline",
  image: "ubuntu:22.04",
  steps: [
    {
      name: "Run `echo`",
      run: async () => {
        const { stderr, code } = await $`echo "Hello from Cicada!"`.stderr(
          "piped",
        );
        if (code !== 0) {
          console.error(stderr);
          Deno.exit(1);
        }
        console.log("Success! Job completed.");
      },
    },
  ],
});

export default new Pipeline([job]);
```

## Wrapping up

`Cicada` is a really neat tool when it comes to writing `CI` pipelines. It is
still in `alpha` stage and some features are not available to the public yet.
Nonetheless, this project seems really interesting and increase the developer
experience vastly when it comes to `local` testing and deployment.
