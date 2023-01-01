---
title: Advanced TypeScript
publish_date: 2023-01-01
abstract: An easy explanation of TypeScript's more advanced concepts
---

## Keyof type operator

The `keyof` type operator takes an object type and produces a string or numeric
literal union of its keys. It is fairly simple to understand.

```ts
const myArray = [1, 2, 3];
const myObject = { hello: "hi", world: "Mars" };

let myArrayTest: keyof myArray; // number[];
let myObjectTest: keyof myObject; // "hello" | "world";
```

## Typeof type operator

Even though JavaScript already has its `typeof` operator, TypeScript's one is
different. It is important to discern between `types` and `values`, and `typeof`
just returns the type of a value. Alone it could be seen as a trivial type, but
when combined it allows for more complex types.

```ts
const myObject = { length: 5, values: [1, 2, 3, 4, 5] };

type MyObjectType = typeof myObject; // { length: number, values: number[] };
```

## Indexed Access Types

Indexed Access Types allow us to access a `subtype` from within the parent. For
instance, this function creates `RequestInit` provided to fetch. The parameters
of the function use the Indexed Access Types to limit the arguments to those
matching the `RequestInit` type. We are also using the `satisfies` keyword to
tell TypeScript that `Object` will be treated as `RequestInit` and that it
matches its type.

```ts
const makeReqInit = (
  method: RequestInit["method"] = "GET",
  body: RequestInit["body"] = null,
) =>
  ({
    method,
    headers: {
      "Accept": "application/json",
      "Authorization": `Bot ${Deno.env.get("API_KEY")}`,
      "Content-Type": "application/json",
      "User-Agent": "Deno/1.29.1",
    },
    body,
  }) satisfies RequestInit;

const req = await fetch("https://example.com/", makeReqInit());
console.log(req.ok ? await req.text() : req);
```

## Generics

### Simple generic type

Generics are fundamental when it comes to writing reusable code. It avoids the
hassle of having to create a type for every subtype and enables the creation of
more complex types by combining types. A really simple usage of generics would
be the following. We accept an array of elements of type `T`, (basically a
placeholder for any type), and return an element of either type `T` or `null`
(if it doesn't exist).

```ts
const getFirst = <T>([element]: T[]): T | null => element ?? null;
const item = getFirst([1, 2, 3]); // 1
const none = getFirst([]); // null
```

### Generic type narrowing

Another thing that generics can do is narrow down the type that is passed
through `T` to meet specific criteria. For instance, let's create a function
that takes an Object with two keys, `items` and `multiplier`. The function will
multiply each item by the multiplier and return the modified `multiplier` array.

```ts
type Element = { items: number[]; multiplier: number };

const getTotal = <T extends Element>(
  obj: T,
): T["items"] =>
  obj.items.reduce<T["items"]>(
    (acc, val) => [...acc, val * obj.multiplier],
    [],
  );

const double = getTotal({ items: [1, 2, 3], multiplier: 2 }); // [2, 4, 6]
const half = getTotal({ items: [2, 4, 6], multiplier: .5 }); // [1, 2, 3]
```

It seems as if a lot was going on but in reality, it is quite simple. First of
all, the `getTotal` function takes a generic `T` type that must satisfy the
constraint of being an Object and having a key named `items`, that is an array
of numbers and a `multiplier`, that is a number. After this, we can reference
subtypes by using bracket notation. We use this in the return type and in the
reduce function.

After that, we use `<Array>.reduce` to iterate over the array, multiply the
current value and save it to the new array that we will return. To tell
TypeScript the type of the accumulator, we need to use `reduce<type>(...)`, so
that it can infer it.

### Compound generic type

Another interesting use of TypeScript's generic types is to make an auxiliary
type to get types from types. For instance, lets create a type that takes an
`Object` and a `key`, and returns they type of that `key`.

```ts
type ObjectKey<T extends Record<string, unknown>, U extends keyof T> = T[U];

const myObject = {
  hello: "world",
  boop: () => 9,
};

let myFn: ObjectKey<typeof myObject, "boop">; // () => number
```

Here we are creating a type `ObjectKey` that accepts two generic types: `T` and
`U`. The former uses the `extend` keyword to only accept Objects with `string`
keys and `unknown` values. The latter only accepts keys of the former.

In this example, instead of the `boop` key we could've used the `hello` key,
which would've returned `string`.

## Conditional types

Conditional types in TypeScript follow the style of a
[ternary](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_Operator).
On the first branch, we will get the type if the `extends` clause is `true`,
otherwise we will get the type in the second branch. For instance, we can take a
generic argument and decide the type based on that type.

```ts
type ToLiteral<T extends number | string> = T extends number ? "number"
  : "string";

let num: ToLiteral<105>; // "number"
let str: ToLiteral<"hi">; // "string"
```

### Infer keyword

The keyword `infer` is powerful since it allows us to get a `subtype` from
within another type. For instance, let's create a type that returns the type of
the first parameter of a function.

```ts
type FirstParam<T> = T extends (...t: infer p) => unknown ? p[0] : never;

const canDrink = (key: "kid" | "adult") => key === "adult";
type FunctionParams = FirstParam<typeof canDrink>; // "kid" | "adult"
```

First of all, we are checking whether the generic type `T` is a function. Then
we are using the spread operator to get all parameters and `infer`ring them to
the type `p`. If `T` satisfies the constraints we are returning the first type
of the array of types enclosed in `p`, otherwise, we return `never`.

Another interesting type we can do is the `ReturnType` type. It is implemented
in TypeScript itself, but understanding it will help to understand the `infer`
keyword.

```ts
type ReturnType<T extends (...args: any) => any> = T extends
  (...args: any) => infer R ? R : any;

let output: ReturnType<typeof setTimeout>; // number
```

First of all, we are checking whether the generic type `T` is a function. Then we
are using conditional types to isolate the return type in the `R` type, to
return it.
