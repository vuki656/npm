// @ts-check

import { resolve } from 'node:path'
import test from 'ava'
import fs from 'fs-extra'
import { stub } from 'sinon'
import { temporaryFile, temporaryDirectory } from 'tempy'

const { HOME } = process.env
const oldCwd = process.cwd()
let cwd: string

test.before((t: any) => {
    process.env.HOME = temporaryDirectory()
    cwd = temporaryDirectory()
    process.chdir(cwd)
})

test.beforeEach(async (t: any) => {
    // Clear files
    // @ts-expect-error
    await fs.remove(resolve(process.env.HOME, '.npmrc'))
    await fs.remove(resolve(cwd, '.npmrc'))

    // Stub the logger
    t.context.log = stub()
    t.context.logger = { log: t.context.log }
})

test.after.always(() => {
    process.env.HOME = HOME
    process.chdir(oldCwd)
})

test.serial('Set auth with "NPM_TOKEN"', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })
    const env = { NPM_TOKEN: 'npm_token' }

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env,
        logger: t.context.logger,
    })

    t.regex((await fs.readFile(npmrc)).toString(), /\/\/custom.registry.com\/:_authToken = \${NPM_TOKEN}/)
    t.deepEqual(t.context.log.args[1], [`Wrote NPM_TOKEN to ${npmrc}`])
})

test.serial('Preserve home ".npmrc"', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })
    const env = { NPM_TOKEN: 'npm_token' }

    // @ts-expect-error
    await fs.appendFile(resolve(process.env.HOME, '.npmrc'), 'home_config = test')

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env,
        logger: t.context.logger,
    })

    t.is((await fs.readFile(npmrc)).toString(), `home_config = test\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`)
    // @ts-expect-error
    t.deepEqual(t.context.log.args[1], ['Reading npm config from %s', [resolve(process.env.HOME, '.npmrc')].join(', ')])
    t.deepEqual(t.context.log.args[2], [`Wrote NPM_TOKEN to ${npmrc}`])
})

test.serial('Preserve home and local ".npmrc"', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })
    const env = { NPM_TOKEN: 'npm_token' }

    await fs.appendFile(resolve(cwd, '.npmrc'), 'cwd_config = test')
    // @ts-expect-error
    await fs.appendFile(resolve(process.env.HOME, '.npmrc'), 'home_config = test')

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env,
        logger: t.context.logger,
    })

    t.is(
        (await fs.readFile(npmrc)).toString(),
        `home_config = test\ncwd_config = test\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`,
    )
    t.deepEqual(t.context.log.args[1], [
        'Reading npm config from %s',
        // @ts-expect-error
        [resolve(process.env.HOME, '.npmrc'), resolve(cwd, '.npmrc')].join(', '),
    ])
    t.deepEqual(t.context.log.args[2], [`Wrote NPM_TOKEN to ${npmrc}`])
})

test.serial('Preserve all ".npmrc" if auth is already configured', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })

    await fs.appendFile(resolve(cwd, '.npmrc'), `//custom.registry.com/:_authToken = \${NPM_TOKEN}`)
    // @ts-expect-error
    await fs.appendFile(resolve(process.env.HOME, '.npmrc'), 'home_config = test')

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env: {},
        logger: t.context.logger,
    })

    t.is((await fs.readFile(npmrc)).toString(), `home_config = test\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`)
    t.deepEqual(t.context.log.args[1], [
        'Reading npm config from %s',
        // @ts-expect-error
        [resolve(process.env.HOME, '.npmrc'), resolve(cwd, '.npmrc')].join(', '),
    ])
})

test.serial('Preserve ".npmrc" if auth is already configured for a scoped package', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })

    await fs.appendFile(
        resolve(cwd, '.npmrc'),
        `@scope:registry=http://custom.registry.com\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`,
    )
    // @ts-expect-error
    await fs.appendFile(resolve(process.env.HOME, '.npmrc'), 'home_config = test')

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env: {},
        logger: t.context.logger,
    })

    t.is(
        (await fs.readFile(npmrc)).toString(),
        `home_config = test\n@scope:registry=http://custom.registry.com\n//custom.registry.com/:_authToken = \${NPM_TOKEN}`,
    )
    t.deepEqual(t.context.log.args[1], [
        'Reading npm config from %s',
        // @ts-expect-error
        [resolve(process.env.HOME, '.npmrc'), resolve(cwd, '.npmrc')].join(', '),
    ])
})

test.serial('Throw error if "NPM_TOKEN" is missing', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    const {
        errors: [error],
    } = await t.throwsAsync(
        setNpmrcAuth(npmrc, 'http://custom.registry.com', {
            cwd,
            env: {},
            logger: t.context.logger,
        }),
    )

    t.is(error.name, 'SemanticReleaseError')
    t.is(error.message, 'No npm token specified.')
    t.is(error.code, 'ENONPMTOKEN')
})

test.serial('Emulate npm config resolution if "NPM_CONFIG_USERCONFIG" is set', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })

    await fs.appendFile(resolve(cwd, '.custom-npmrc'), `//custom.registry.com/:_authToken = \${NPM_TOKEN}`)

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://custom.registry.com', {
        cwd,
        env: { NPM_CONFIG_USERCONFIG: resolve(cwd, '.custom-npmrc') },
        logger: t.context.logger,
    })

    t.is((await fs.readFile(npmrc)).toString(), `//custom.registry.com/:_authToken = \${NPM_TOKEN}`)
    t.deepEqual(t.context.log.args[1], ['Reading npm config from %s', [resolve(cwd, '.custom-npmrc')].join(', ')])
})

test.serial('Prefer .npmrc over environment variables', async (t: any) => {
    const npmrc = temporaryFile({ name: '.npmrc' })
    // Specify an NPM token environment variable
    const env = { NPM_TOKEN: 'env_npm_token' }

    await fs.appendFile(resolve(cwd, '.npmrc'), '//registry.npmjs.org/:_authToken=npmrc_npm_token')

    const { setNpmrcAuth } = await import('../lib/set-npmrc-auth.mjs')
    await setNpmrcAuth(npmrc, 'http://registry.npmjs.org', {
        cwd,
        env,
        logger: t.context.logger,
    })

    t.is(
        (await fs.readFile(npmrc)).toString(),
        // Assert did not write the token from environment variable
        `//registry.npmjs.org/:_authToken=npmrc_npm_token`,
    )

    // Assert reads from config
    t.deepEqual(t.context.log.args[1], ['Reading npm config from %s', resolve(cwd, '.npmrc')])

    // Assert does not write NPM_TOKEN
    for (const log of t.context.log.args) {
        t.false(log.includes('Wrote NPM_TOKEN'))
    }
})
