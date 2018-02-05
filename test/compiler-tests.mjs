import Compiler from "../build/compiler.js"

import assert from "assert"

describe("compiler", () => {
  it("should support `options.cjs.topLevelReturn`", () => {
    assert.doesNotThrow(() => Compiler.compile("return"))
    assert.throws(() => Compiler.compile("return", { type: "module" }), SyntaxError)
    assert.doesNotThrow(() => Compiler.compile("return", { cjs: { topLevelReturn: true }, type: "module" }))
  })

  it("should support `options.type`", () => {
    ["module", "unambiguous"]
      .forEach((type) => {
        const result = Compiler.compile('import"a"', { type })
        assert.strictEqual(result.esm, true)
      })
  })

  it("should support `options.cjs.vars`", () => {
    let result = Compiler.compile("arguments")
    assert.strictEqual(result.warnings, null)

    result = Compiler.compile("arguments", { cjs: { vars: true }, type: "module" })
    assert.strictEqual(result.warnings, null)

    result = Compiler.compile("arguments", { type: "module" })
    const warnings = result.warnings || []
    assert.strictEqual(warnings.length, 1)
  })

  it('should support `options.type` of "module"', () => {
    [
      "1+2",
      "1+2//import",
      '"use module";1+2',
      "'use module';1+2",
      '"use script";1+2',
      "'use script';1+2"
    ]
    .forEach((code) => {
      const result = Compiler.compile(code, { type: "module" })
      assert.strictEqual(result.esm, true)
    })
  })

  it('should support `options.type` of "unambiguous"', () => {
    [
      { code: "1+2", esm: false },
      { code: "1+2//import", esm: false },
      { code: "1+2", esm: true, hint: "module" },
      { code: '"use module";1+2', esm: true },
      { code: "'use module';1+2", esm: true, hint: "module" },
      { code: '"use script";1+2', esm: false },
      { code: "'use script';1+2", esm: false, hint: "module" }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, { hint: data.hint, type: "unambiguous" })
      assert.strictEqual(result.esm, data.esm)
    })
  })

  it("should support `options.var`", () => {
    [void 0, false, true]
      .forEach((value) => {
        const result = Compiler.compile('import a from "a"', { var: value, type: "module" })
        assert.ok(result.code.startsWith(value ? "var a" : "let a"))
      })
  })

  it('should support the "use module" directive', () => {
    [
      { code: "'use module';\"use script\";import'a'", hint: "module" },
      { code: '"use module";\'use script\';import"a"', hint: "module" },
      { code: "'use module';\"use script\";import'a'" },
      { code: '"use module";\'use script\';import"a"' }
    ]
    .forEach((data) => {
      const result = Compiler.compile(data.code, { hint: data.hint, type: "unambiguous" })
      assert.strictEqual(result.esm, true)
    })
  })

  it('should support the "use script" directive', () => {
    [
      { code: "'use script';\"use module\";import'a'", hint: "module" },
      { code: '"use script";\'use module\';import"a"', hint: "module" },
      { code: "'use script';\"use module\";import'a'" },
      { code: '"use script";\'use module\';import"a"' }
    ]
    .forEach((data) => {
      assert.throws(
        () => Compiler.compile(data.code, { hint: data.hint, type: "unambiguous" }),
        SyntaxError
      )
    })
  })

  it("should support shebangs", () => {
    const code = [
      "#!/usr/bin/env node -r @std/esm",
      'import a from "a"'
    ].join("\n")

    const result = Compiler.compile(code, { type: "module" })
    assert.ok(result.code.startsWith("let a"))
  })

  it("should support trailing comments", () => {
    const result = Compiler.compile('import"a"//trailing comment', { type: "module" })
    assert.ok(result.code.endsWith("//trailing comment"))
  })

  it("should compile dynamic import with script source type", () => {
    const result = Compiler.compile('import("a")', { esm: false })
    assert.ok(result.code.includes('i("a")'))
  })

  it("should preserve line numbers", () =>
    import("./compiler/lines.mjs")
      .then((ns) => ns.default())
  )

  it("should preserve crlf newlines", () => {
    const code = [
      "import {",
      "  strictEqual,",
      "  // blank line",
      "  deepEqual",
      "}",
      'from "assert"'
    ].join("\r\n")

    const result = Compiler.compile(code, { type: "module" })
    assert.ok(result.code.endsWith("\r\n".repeat(5)))
  })

  it('should not hoist above "use strict"', () =>
    import("./compiler/strict.mjs")
      .then((ns) => ns.default())
  )

  it("should not get confused by string literals", () =>
    import("./compiler/strings.mjs")
      .then((ns) => ns.default())
  )

  it("should not error on shorthand async function properties with reserved names", () => {
    Compiler.compile("({async delete(){}})")
  })

  it("should not error on arrow functions with destructured arguments", () => {
    [
      "({a=1})=>{}",
      "({a=1},{b=2})=>{}"
    ]
    .forEach(Compiler.compile)
  })

  it("should not error on transforms at the end of the source", () => {
    [
      'import{a}from"a"',
      'import"a"',
      "let a;export{a}",
      "export default a"
    ]
    .forEach((code) => {
      Compiler.compile(code, { type: "module" })
    })
  })
})
