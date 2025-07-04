import type { Options } from "../src/index"
import { transformSync } from "@babel/core"
import { expect } from "vitest"
import plugin from "../src/index"

export function expectSnapshot(code: string, options: Options): void {
    const actual = transformSync(code, { plugins: [[plugin, options]] })?.code ?? ""
    expect(actual).toMatchSnapshot()
}
