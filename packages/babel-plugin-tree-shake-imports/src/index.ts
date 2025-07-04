/* eslint-disable no-console */
import type { NodePath, PluginObj, PluginPass } from "@babel/core"
import * as t from "@babel/types"

type ImportSpecifier =
    | t.ImportSpecifier
    | t.ImportDefaultSpecifier
    | t.ImportNamespaceSpecifier

type ImportType =
    | "named"
    | "default"
    | "wildcard"

interface ImportBinding {
    consumed: boolean
    import: NodePath<t.ImportDeclaration>
    importName: string
    importPath: string
    importType: ImportType
    localName: string
    skipped: boolean
    specifier: NodePath<ImportSpecifier>
}

export type ResolvedImport =
    | { importName?: string, path: string, type: "named" }
    | { path: string, type: "default" }
    | null
    | undefined
    | false

export interface ImportResolverData {
    filePath: string
    importName: string
    importPath: string
    importType: ImportType
    localName: string
    propertyName: string
}

export interface Options {
    debug?: boolean
    resolve: (importData: ImportResolverData) => ResolvedImport
}

export default function (_: any, options: Options): PluginObj {
    const identifiers = new Map<string, t.Identifier>()
    const importBindings = new Map<t.Identifier, ImportBinding>()

    function getImportBinding(path: NodePath, reference: t.Identifier): ImportBinding | undefined {
        if (importBindings.has(reference)) return importBindings.get(reference)

        const binding = path.scope.getBinding(reference.name)
        if (!binding) return

        return importBindings.get(binding.identifier)
    }

    function addImportDeclaration(declarationPath: NodePath<t.ImportDeclaration>): void {
        for (let i = 0; i < declarationPath.node.specifiers.length; i++) {
            const specifierPath = declarationPath.get(`specifiers.${i}`)
            const specifierNode = specifierPath.node

            if (importBindings.has(specifierNode.local)) continue

            importBindings.set(specifierNode.local, {
                consumed: false,
                import: declarationPath,
                importPath: declarationPath.node.source.value,
                localName: specifierNode.local.name,
                skipped: false,
                specifier: specifierPath,
                importName: t.isImportSpecifier(specifierNode)
                    ? t.isIdentifier(specifierNode.imported) ? specifierNode.imported.name : specifierNode.imported.value
                    : specifierNode.local.name,
                importType: t.isImportSpecifier(specifierNode)
                    ? "named"
                    : t.isImportDefaultSpecifier(specifierNode)
                        ? "default"
                        : "wildcard",
            })
        }
    }

    function checkMemberExpression(path: NodePath<t.MemberExpression>, state: PluginPass): void {
        const nestedMember = path.get("object")
        if (nestedMember.isMemberExpression()) {
            checkMemberExpression(nestedMember, state)
        }

        const namespaceNode = path.node.object
        if (!t.isIdentifier(namespaceNode)) return

        const importBinding = getImportBinding(path, namespaceNode)
        if (!importBinding) return

        const propertyNode = path.node.property
        if (!t.isIdentifier(propertyNode)) {
            importBinding.skipped = true
            return
        }

        const propertyName = propertyNode.name
        const key = `${importBinding.importName}-${propertyName}-${importBinding.importPath}`

        if (!identifiers.has(key)) {
            const data: ImportResolverData = {
                filePath: state.filename || "",
                importName: importBinding.importName,
                importPath: importBinding.importPath,
                importType: importBinding.importType,
                localName: importBinding.localName,
                propertyName,
            }

            const resolved = options.resolve(data)
            if (!resolved) {
                importBinding.skipped = true
                return
            }

            if (options.debug) console.log(blue(`babel-plugin-tree-shake-imports: ${state.filename || ""}\n`))
            if (options.debug) console.log(blue("Data:"), data, "\n")
            if (options.debug) console.log(blue("Config:"), resolved, "\n")

            const importAlias = state.file.scope.generateUidIdentifier(propertyName)
            const importSpecifier = resolved.type === "named"
                ? t.importSpecifier(importAlias, t.identifier(resolved.importName || propertyName))
                : t.importDefaultSpecifier(importAlias)
            const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral(resolved.path))

            importBinding.consumed = true
            identifiers.set(key, importAlias)

            if (options.debug) console.log(blue("Import before:"), "\n", red(importBinding.import.toString()), "\n")
            const [declarationPath] = importBinding.import.insertAfter([importDeclaration])
            if (options.debug) console.log(blue("Import after:"), "\n", green(declarationPath.toString()), "\n")
            addImportDeclaration(declarationPath)

            if (options.debug) console.log(blue("Expression before:"), "\n", red(path.toString()), "\n")
            path.replaceWith(importAlias)
            if (options.debug) console.log(blue("Expression after:"), "\n", green(path.toString()), "\n")
        }
        else {
            if (options.debug) console.log(blue("Expression before:"), "\n", red(path.toString()), "\n")
            path.replaceWith(identifiers.get(key)!)
            if (options.debug) console.log(blue("Expression after:"), "\n", green(path.toString()), "\n")
        }
    }

    function green(content: string): string {
        return `\x1B[32m${content}\x1B[0m`
    }

    function red(content: string): string {
        return `\x1B[31m${content}\x1B[0m`
    }

    function blue(content: string): string {
        return `\x1B[34m${content}\x1B[0m`
    }

    return {
        name: "@monstermann/babel-plugin-tree-shake-imports",
        visitor: {
            ImportDeclaration: addImportDeclaration,
            MemberExpression: checkMemberExpression,
            Program: {
                enter() {
                    identifiers.clear()
                    importBindings.clear()
                },
                exit() {
                    for (const importBinding of importBindings.values()) {
                        if (importBinding.skipped) continue
                        if (!importBinding.consumed) continue
                        importBinding.specifier.remove()
                        if (importBinding.import.node.specifiers.length === 0)
                            importBinding.import.remove()
                    }
                },
            },
        },
    }
}
