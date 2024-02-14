// @ts-check

import test from 'ava'
import fs from 'fs-extra'
import { temporaryDirectory } from 'tempy'
import { getRegistry } from '../lib/get-registry.mjs'
import { resolve } from 'node:path'

test('Get default registry', (t: any) => {
    const cwd = temporaryDirectory()
    t.is(getRegistry({ name: 'package-name' }, { cwd, env: {} }), 'https://registry.npmjs.org/')
    t.is(getRegistry({ name: 'package-name', publishConfig: {} }, { cwd, env: {} }), 'https://registry.npmjs.org/')
})

test('Get the registry configured in ".npmrc" and normalize trailing slash', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.appendFile(resolve(cwd, '.npmrc'), 'registry = https://custom1.registry.com')

    t.is(getRegistry({ name: 'package-name' }, { cwd, env: {} }), 'https://custom1.registry.com/')
})

test('Get the registry configured from "publishConfig"', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.appendFile(resolve(cwd, '.npmrc'), 'registry = https://custom2.registry.com')

    t.is(
        getRegistry(
            {
                name: 'package-name',
                publishConfig: { registry: 'https://custom3.registry.com/' },
            },
            { cwd, env: {} },
        ),
        'https://custom3.registry.com/',
    )
})

test('Get the registry configured in "NPM_CONFIG_REGISTRY"', (t: any) => {
    const cwd = temporaryDirectory()

    t.is(
        getRegistry({ name: 'package-name' }, { cwd, env: { NPM_CONFIG_REGISTRY: 'https://custom1.registry.com/' } }),
        'https://custom1.registry.com/',
    )
})

test('Get the registry configured in ".npmrc" for scoped package', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.appendFile(resolve(cwd, '.npmrc'), '@scope:registry = https://custom3.registry.com')

    t.is(getRegistry({ name: '@scope/package-name' }, { cwd, env: {} }), 'https://custom3.registry.com/')
})

test.serial('Get the registry configured via "NPM_CONFIG_USERCONFIG" for scoped package', async (t: any) => {
    const cwd = temporaryDirectory()
    await fs.appendFile(resolve(cwd, '.custom-npmrc'), '@scope:registry = https://custom4.registry.com')

    t.is(
        getRegistry(
            {
                name: '@scope/package-name',
            },
            {
                cwd,
                env: { NPM_CONFIG_USERCONFIG: resolve(cwd, '.custom-npmrc') },
            },
        ),
        'https://custom4.registry.com/',
    )
})
