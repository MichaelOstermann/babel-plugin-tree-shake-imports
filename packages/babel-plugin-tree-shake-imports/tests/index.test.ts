import type { Options } from "../src"
import { describe, expect, it } from "vitest"
import { expectSnapshot } from "./helpers"

const defaultOptions: Options = {
    resolve({ importPath, propertyName }) {
        return {
            path: `${importPath}/${propertyName}`,
            type: "named",
        }
    },
}

describe("babel-plugin-tree-shake-imports", () => {
    it("Should tree-shake named imports", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar;
        `, {
            resolve(data) {
                expect(data).toEqual({
                    filePath: "",
                    importName: "Foo",
                    importPath: "foo",
                    importType: "named",
                    localName: "Foo",
                    propertyName: "bar",
                })
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should tree-shake aliased imports", () => {
        expectSnapshot(`
            import { Foo as Bar } from "foo";
            Bar.bar;
        `, {
            resolve(data) {
                expect(data).toEqual({
                    filePath: "",
                    importName: "Foo",
                    importPath: "foo",
                    importType: "named",
                    localName: "Bar",
                    propertyName: "bar",
                })
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should tree-shake string-literal imports", () => {
        expectSnapshot(`
            import { "foo" as Foo } from "foo";
            Foo.bar;
        `, {
            resolve(data) {
                expect(data).toEqual({
                    filePath: "",
                    importName: "foo",
                    importPath: "foo",
                    importType: "named",
                    localName: "Foo",
                    propertyName: "bar",
                })
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should tree-shake default imports", () => {
        expectSnapshot(`
            import Foo from "foo";
            Foo.bar;
        `, {
            resolve(data) {
                expect(data).toEqual({
                    filePath: "",
                    importName: "Foo",
                    importPath: "foo",
                    importType: "default",
                    localName: "Foo",
                    propertyName: "bar",
                })
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should tree-shake wildcard imports", () => {
        expectSnapshot(`
            import * as Foo from "foo";
            Foo.bar;
        `, {
            resolve(data) {
                expect(data).toEqual({
                    filePath: "",
                    importName: "Foo",
                    importPath: "foo",
                    importType: "wildcard",
                    localName: "Foo",
                    propertyName: "bar",
                })
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should tree-shake multiple references", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar;
            Foo.bar;
            Foo.baz;
            Foo.baz;
        `, defaultOptions)
    })

    it("Should tree-shake into default import", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar;
        `, {
            resolve({ importPath, propertyName }) {
                return {
                    path: `${importPath}/${propertyName}`,
                    type: "default",
                }
            },
        })
    })

    it("Should tree-shake using alias", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar.baz;
        `, {
            resolve({ importPath, propertyName }) {
                return {
                    importName: "Bar",
                    path: `${importPath}/${propertyName}`,
                    type: "named",
                }
            },
        })
    })

    it("Should tree-shake nested imports", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar.baz;
        `, defaultOptions)
    })

    it("Should not tree-shake when not desired", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            import { Bar } from "bar";
            Foo.bar;
            Bar.baz;
        `, {
            resolve(data) {
                if (data.importName === "Bar") return
                return defaultOptions.resolve(data)
            },
        })
    })

    it("Should skip irrelevant references", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            function example() {
                const Foo = {};
                return Foo.bar;
            };
        `, defaultOptions)
    })

    it("Should skip fishy properties", () => {
        expectSnapshot(`
            import { Foo } from "foo";
            Foo.bar;
            Foo["bar"];
        `, defaultOptions)
    })

    it("Should keep unused imports", () => {
        expectSnapshot(`
            import { Foo, Bar } from "foo";
            Foo.bar;
        `, defaultOptions)
    })
})
