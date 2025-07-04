# babel-plugin-tree-shake-imports

**A babel plugin to tree-shake namespace imports.**

This babel plugin helps you to use TypeScript [namespaces](https://www.typescriptlang.org/docs/handbook/namespaces.html), in particular [ambient namespaces](https://www.typescriptlang.org/docs/handbook/namespaces.html#ambient-namespaces), or regular barrel files for the purpose of namespacing by tree-shaking their import declarations:

```ts
// Vanilla approach:
import { getUserEmail } from "utils/user/getUserEmail";
const userEmail = getUserEmail(user);

// Using namespaces:
import { User } from "utils";
const userEmail = User.email(user);

// After transforming with babel-plugin-tree-shake-imports:
import { email as _email } from "utils/User/email";
const userEmail = email(user);
```

## Features

- Works for all (ESM) import specifier types, including mixed ones
- Allows you to rewire/skip each individual imported module
- Supports recursive destructuring

## Examples

:::code-group

```ts [Before]
import Foo from "foo";
Foo.bar;
```

```ts [After]
import { bar as _bar } from "foo/bar";
_bar;
```

:::

:::code-group

```ts [Before]
import { Foo } from "foo";
Foo.bar;
```

```ts [After]
import { bar as _bar } from "foo/bar";
_bar;
```

:::

:::code-group

```ts [Before]
import { Foo as Bar } from "foo";
Bar.bar;
```

```ts [After]
import { bar as _bar } from "foo/bar";
_bar;
```

:::

:::code-group

```ts [Before]
import * as Foo from "foo";
Foo.bar;
```

```ts [After]
import { bar as _bar } from "foo/bar";
_bar;
```

:::

:::code-group

```ts [Before]
import Foo from "foo";
Foo.bar.baz;
```

```ts [After]
import { baz as _baz } from "foo/bar/baz";
_baz;
```

:::

## Installation

::: code-group

```sh [npm]
npm -D install @monstermann/babel-plugin-tree-shake-imports
```

```sh [pnpm]
pnpm -D add @monstermann/babel-plugin-tree-shake-imports
```

```sh [yarn]
yarn -D add @monstermann/babel-plugin-tree-shake-imports
```

```sh [bun]
bun -D add @monstermann/babel-plugin-tree-shake-imports
```

:::

## Usage

::: code-group

```ts [babel ~vscode-icons:file-type-light-babel2~]
export default {
    plugins: [["@monstermann/babel-plugin-tree-shake-imports", options]],
};
```

```ts [vite + react ~vscode-icons:file-type-vite~]
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
    plugins: [
        react({
            babel: {
                plugins: [
                    ["@monstermann/babel-plugin-tree-shake-imports", options],
                ],
            },
        }),
    ],
}));
```

:::

## Options

::: code-group

```ts [example.ts]
import { A as B } from "c";
A.d;
```

:::

```ts
const options = {
    resolve({
        // The path of the file being transformed: "example.ts"
        filePath,
        // The imported module: "c"
        importPath,
        // The imported identifier: "A"
        importName,
        // The local alias: "B"
        // Same as `importName` if not available.
        localName,
        // The property that was accessed: "d"
        propertyName,
        // The type of the import: "named"
        // One of: "named" | "default" | "wildcard"
        importType,
    }) {
        // Skip this import:
        return null;
        return undefined;
        return false;

        // Transform this to:
        // import { d as _d } from "c/d";
        // _d;
        return {
            type: "named",
            path: `${importPath}/${propertyName}`,
        };

        // Transform this to:
        // import { e as _d } from "c/d";
        // _d;
        return {
            type: "named",
            importName: "e",
            path: `${importPath}/${propertyName}`,
        };

        // Transform this to:
        // import _d from "c/d";
        // _d;
        return {
            type: "default",
            path: `${importPath}/${propertyName}`,
        };
    },
};
```

### Troubleshooting

You can use the `debug` flag to print the individual transformations being done to each file.

```ts
const options = {
    debug: true, // [!code highlight]
    resolve: () => ({ path, type }),
};
```
