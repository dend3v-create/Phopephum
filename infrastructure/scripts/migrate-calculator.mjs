#!/usr/bin/env node
/**
 * migrate-calculator.mjs
 * ย้าย calculator จาก Next.js app → packages/engine
 *
 * Usage:
 *   node infrastructure/scripts/migrate-calculator.mjs calculateAtthakarn
 *   node infrastructure/scripts/migrate-calculator.mjs --all
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

const SOURCE_DIR = 'E:/00.1_DenD3v_AI/Mobile_app_01_Demo_Horn_Tai_Noo/phopephum/src/lib/astrology/calculators'
const TARGET_DIR = join(ROOT, 'packages/engine/src/calculators')
const BARREL = join(TARGET_DIR, 'index.ts')

const CALCULATORS_TO_MIGRATE = [
  'calculatePower',
  'calculateHouse',
  'calculateTransit',
  'calculateAtthakarn',
  'calculateNavamsa',
  'calculateLagna',
  'calculateMoonPhase',
  'calculateAuspiciousTime',
  'calendarConverter',
  'matrixBuilder',
  'houseMapper',
  'nineBase',
  'sevenBase',
  'planetaryPower',
  'emperorChart',
  'ageCycle',
  'taksa',
  'transit',
]

function stripNextImports(content) {
  return content
    .replace(/^['"]use client['"];?\n?/m, '')
    .replace(/^['"]use server['"];?\n?/m, '')
    .replace(/^import .+ from ['"]next\/.+['"](;)?\n?/gm, '')
    .replace(/^import .+ from ['"]react['"](;)?\n?/gm, '')
    .replace(/^import type .+ from ['"]react['"](;)?\n?/gm, '')
}

function migrateOne(name) {
  const srcPath = join(SOURCE_DIR, `${name}.ts`)
  const destPath = join(TARGET_DIR, `${name}.ts`)

  if (!existsSync(srcPath)) {
    console.error(`❌ Source not found: ${srcPath}`)
    return false
  }

  if (existsSync(destPath)) {
    console.log(`⏭  Already exists: ${name}.ts`)
    return false
  }

  const original = readFileSync(srcPath, 'utf-8')
  const cleaned = stripNextImports(original)

  writeFileSync(destPath, cleaned)
  console.log(`✅ Migrated: ${name}.ts`)

  // Add to barrel
  const barrel = readFileSync(BARREL, 'utf-8')
  if (!barrel.includes(name)) {
    const exportLine = `export * from './${name}.js'\n`
    writeFileSync(BARREL, barrel + exportLine)
    console.log(`   └─ Added to index.ts`)
  }

  return true
}

const arg = process.argv[2]

if (arg === '--all') {
  let count = 0
  for (const name of CALCULATORS_TO_MIGRATE) {
    if (migrateOne(name)) count++
  }
  console.log(`\n📦 Migrated ${count} calculators`)
} else if (arg) {
  migrateOne(arg)
} else {
  console.log('Usage:')
  console.log('  node infrastructure/scripts/migrate-calculator.mjs calculateAtthakarn')
  console.log('  node infrastructure/scripts/migrate-calculator.mjs --all')
}
