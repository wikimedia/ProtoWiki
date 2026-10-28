#!/usr/bin/env node
/**
 * Extract Wikitab card payload shapes from TypeScript and write
 * wikitabCardTypeSchema.generated.json from wikitabCardPayloadTypes.ts. Run
 * after changing payload types or wikitabCardTypeCatalog.json:
 *
 *   node scripts/generate-wikitab-card-type-schema.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIKITAB = path.join(ROOT, 'src/prototypes/wikitab')
const CATALOG_PATH = path.join(WIKITAB, 'data/wikitabCardTypeCatalog.json')
const OUT_PATH = path.join(WIKITAB, 'data/wikitabCardTypeSchema.generated.json')

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))

/** Payload field names whose schema `type` should show a named alias, not an expanded union. */
const PROPERTY_TYPE_DISPLAY = {
  kind: 'WikitabFeaturedArticleSpotlightKind',
  supportingIcon: 'CodexIconName',
  editorKind: 'EditorKind',
}

/** Playground field list order — supporting controls stay last; HTML after text + icon. */
const SUPPORTING_PROPERTY_TAIL = [
  'supportingText',
  'supportingIcon',
  'supportingHtml',
  'supportingTextEnd',
]

function orderProperties(properties) {
  const tail = []
  const rest = []
  for (const prop of properties) {
    if (SUPPORTING_PROPERTY_TAIL.includes(prop.name)) {
      tail.push(prop)
    } else {
      rest.push(prop)
    }
  }
  tail.sort(
    (a, b) =>
      SUPPORTING_PROPERTY_TAIL.indexOf(a.name) - SUPPORTING_PROPERTY_TAIL.indexOf(b.name),
  )
  return [...rest, ...tail]
}

function loadProgram() {
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json')
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT)
  return ts.createProgram(parsed.fileNames, parsed.options)
}

function findExportedType(checker, sourceFile, typeName) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile)
  if (!moduleSymbol) return null

  const exports = checker.getExportsOfModule(moduleSymbol)
  const match = exports.find((sym) => sym.getName() === typeName)
  if (!match) return null

  return checker.getDeclaredTypeOfSymbol(match)
}

function propertiesForType(checker, type) {
  const properties = checker.getPropertiesOfType(type).map((prop) => {
    const decl = prop.valueDeclaration ?? prop.declarations?.[0]
    const propType = decl
      ? checker.getTypeOfSymbolAtLocation(prop, decl)
      : checker.getAnyType()
    const optional = !!(prop.flags & ts.SymbolFlags.Optional)
    return {
      name: prop.name,
      type: PROPERTY_TYPE_DISPLAY[prop.name] ?? checker.typeToString(propType),
      optional,
    }
  })
  return orderProperties(properties)
}

function schemasForTypeName(program, typeModulePath, typeName) {
  const checker = program.getTypeChecker()
  const absPath = path.join(WIKITAB, typeModulePath)
  const sourceFile = program.getSourceFile(absPath)
  if (!sourceFile) {
    throw new Error(`Source not in program: ${absPath}`)
  }

  const type = findExportedType(checker, sourceFile, typeName)
  if (!type) {
    throw new Error(`Type ${typeName} not exported from ${typeModulePath}`)
  }

  if (type.isUnion()) {
    return type.types.map((member) => {
      const symbol = member.getSymbol()
      const memberName = symbol?.getName() ?? typeName
      return {
        typeName: memberName,
        typeModulePath,
        properties: propertiesForType(checker, member),
      }
    })
  }

  return [
    {
      typeName,
      typeModulePath,
      properties: propertiesForType(checker, type),
    },
  ]
}

function main() {
  const program = loadProgram()
  const output = []

  for (const entry of catalog) {
    if (!entry.typeName || !entry.typeModulePath) {
      output.push({ catalogId: entry.id, schemas: [] })
      continue
    }

    output.push({
      catalogId: entry.id,
      schemas: schemasForTypeName(program, entry.typeModulePath, entry.typeName),
    })
  }

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${path.relative(ROOT, OUT_PATH)} (${output.length} catalog entries)`)
}

main()
