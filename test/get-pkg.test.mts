// @ts-check

import test from 'ava'
import fs from 'fs-extra'
import { temporaryDirectory } from 'tempy'
import { getPkg } from '../lib/get-pkg.mjs'
import { resolve } from 'node:path'

test('Verify name and version then return parsed package.json', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = { name: 'package', version: '0.0.0' }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await getPkg({}, { cwd })
    t.is(pkg.name, result.name)
    t.is(pkg.version, result.version)
})

test('Verify name and version then return parsed package.json from a sub-directory', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkgRoot = 'dist'
    const pkg = { name: 'package', version: '0.0.0' }
    await fs.outputJson(resolve(cwd, pkgRoot, 'package.json'), pkg)

    const result = await getPkg({ pkgRoot }, { cwd })
    t.is(pkg.name, result.name)
    t.is(pkg.version, result.version)
})

test('Throw error if missing package.json', async (t: any) => {
    const cwd = temporaryDirectory()
    const {
        errors: [error],
    } = await t.throwsAsync(getPkg({}, { cwd }))

    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'ENOPKG')
})

test('Throw error if missing package name', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.outputJson(resolve(cwd, 'package.json'), { version: '0.0.0' })

    const {
        errors: [error],
    } = await t.throwsAsync(getPkg({}, { cwd }))

    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'ENOPKGNAME')
})

test('Throw error if package.json is malformed', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.writeFile(resolve(cwd, 'package.json'), "{name: 'package',}")

    const {
        errors: [error],
    } = await t.throwsAsync(getPkg({}, { cwd }))

    t.is(error.name, 'JSONError')
})
