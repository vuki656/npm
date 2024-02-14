// @ts-check

import test from 'ava'
import fs from 'fs-extra'
import { execa } from 'execa'
import { spy } from 'sinon'
import { temporaryDirectory } from 'tempy'
import { WritableStreamBuffer } from 'stream-buffers'
import { addChannel, prepare, publish, verifyConditions } from '../index.mjs'
import { authEnv, start, url, stop } from './helpers/npm-registry.mjs'
import { resolve } from 'node:path'

// Environment variables used only for the local npm command used to do verification
let testEnv: any

test.before(async () => {
    // Start the local NPM registry
    await start()

    testEnv = {
        ...process.env,
        ...authEnv(),
        npm_config_registry: url,
    }
})

test.after.always(async () => {
    // Stop the local NPM registry
    await stop()
})

test.beforeEach(async (t: any) => {
    // Stub the logger
    t.context.log = spy()
    t.context.stdout = new WritableStreamBuffer()
    t.context.stderr = new WritableStreamBuffer()
    t.context.logger = { log: t.context.log }
})

test('Skip npm auth verification if "npmPublish" is false', async (t: any) => {
    const cwd = temporaryDirectory()
    const env = { NPM_TOKEN: 'wrong_token' }
    const pkg = {
        name: 'published',
        version: '1.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await t.notThrowsAsync(
        verifyConditions(
            { npmPublish: false },
            {
                cwd,
                env,
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Skip npm auth verification if "package.private" is true', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = {
        name: 'published',
        version: '1.0.0',
        publishConfig: { registry:  url },
        private: true,
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await t.notThrowsAsync(
        verifyConditions(
            { npmPublish: false },
            {
                cwd,
                env: {},
                options: { publish: ['@semantic-release/npm'] },
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Skip npm token verification if "package.private" is true', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = {
        name: 'published',
        version: '1.0.0',
        publishConfig: { registry:  url },
        private: true,
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    await t.notThrowsAsync(
        verifyConditions(
            {},
            {
                cwd,
                env: {},
                options: { publish: ['@semantic-release/npm'] },
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Throws error if NPM token is invalid', async (t: any) => {
    const cwd = temporaryDirectory()
    const env = {
        NPM_TOKEN: 'wrong_token',
        DEFAULT_NPM_REGISTRY:  url,
    }
    const pkg = {
        name: 'published',
        version: '1.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const {
        errors: [error],
    } = await t.throwsAsync(
         verifyConditions(
            {},
            {
                cwd,
                env,
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )

    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'EINVALIDNPMTOKEN')
    t.is(error.message, 'Invalid npm token.')
})

test('Skip Token validation if the registry configured is not the default one', async (t: any) => {
    const cwd = temporaryDirectory()
    const env = { NPM_TOKEN: 'wrong_token' }
    const pkg = {
        name: 'published',
        version: '1.0.0',
        publishConfig: { registry: 'http://custom-registry.com/' },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    await t.notThrowsAsync(
         verifyConditions(
            {},
            {
                cwd,
                env,
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Verify npm auth and package', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = {
        name: 'valid-token',
        version: '0.0.0-dev',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    await t.notThrowsAsync(
         verifyConditions(
            {},
            {
                cwd,
                env:  authEnv(),
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Verify npm auth and package from a sub-directory', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = {
        name: 'valid-token',
        version: '0.0.0-dev',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'dist/package.json'), pkg)
    await t.notThrowsAsync(
         verifyConditions(
            { pkgRoot: 'dist' },
            {
                cwd,
                env:  authEnv(),
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Verify npm auth and package with "npm_config_registry" env var set by yarn', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = {
        name: 'valid-token',
        version: '0.0.0-dev',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    await t.notThrowsAsync(
         verifyConditions(
            {},
            {
                cwd,
                env: {
                    ... authEnv(),
                    npm_config_registry: 'https://registry.yarnpkg.com',
                },
                options: { publish: [] },
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
})

test('Throw SemanticReleaseError Array if config option are not valid in verifyConditions', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = { publishConfig: { registry:  url } }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    const npmPublish = 42
    const tarballDir = 42
    const pkgRoot = 42
    const errors = [
        ...(
            await t.throwsAsync(
                 verifyConditions(
                    {},
                    {
                        cwd,
                        env: {},
                        options: {
                            publish: [
                                '@semantic-release/github',
                                {
                                    path: '@semantic-release/npm',
                                    npmPublish,
                                    tarballDir,
                                    pkgRoot,
                                },
                            ],
                        },
                        stdout: t.context.stdout,
                        stderr: t.context.stderr,
                        logger: t.context.logger,
                    },
                ),
            )
        ).errors,
    ]

    t.is(errors[0].name, 'SemanticReleaseError')
    t.is(errors[0].code, 'EINVALIDNPMPUBLISH')
    t.is(errors[1].name, 'SemanticReleaseError')
    t.is(errors[1].code, 'EINVALIDTARBALLDIR')
    t.is(errors[2].name, 'SemanticReleaseError')
    t.is(errors[2].code, 'EINVALIDPKGROOT')
    t.is(errors[3].name, 'SemanticReleaseError')
    t.is(errors[3].code, 'ENOPKG')
})

test('Publish the package', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'publish',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await publish(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@latest dist-tag)',
        url: undefined,
        channel: 'latest',
    })
    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.false(await fs.pathExists(resolve(cwd, `${pkg.name}-1.0.0.tgz`)))
    t.is((await execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv })).stdout, '1.0.0')
})

test('Publish the package on a dist-tag', async (t: any) => {
    const cwd = temporaryDirectory()
    const env = {
        ... authEnv(),
        DEFAULT_NPM_REGISTRY:  url,
    }
    const pkg = {
        name: 'publish-tag',
        version: '0.0.0',
        publishConfig: { registry:  url, tag: 'next' },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await  publish(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { channel: 'next', version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@next dist-tag)',
        url: 'https://www.npmjs.com/package/publish-tag/v/1.0.0',
        channel: 'next',
    })
    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.false(await fs.pathExists(resolve(cwd, `${pkg.name}-1.0.0.tgz`)))
    t.is((await execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv })).stdout, '1.0.0')
})

test('Publish the package from a sub-directory', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'publish-sub-dir',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'dist/package.json'), pkg)

    const result = await  publish(
        { pkgRoot: 'dist' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@latest dist-tag)',
        url: undefined,
        channel: 'latest',
    })
    t.is((await fs.readJson(resolve(cwd, 'dist/package.json'))).version, '1.0.0')
    t.false(await fs.pathExists(resolve(cwd, `${pkg.name}-1.0.0.tgz`)))
    t.is((await execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv })).stdout, '1.0.0')
})

test('Create the package and skip publish ("npmPublish" is false)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-publish',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await  publish(
        { npmPublish: false, tarballDir: 'tarball' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.true(await fs.pathExists(resolve(cwd, `tarball/${pkg.name}-1.0.0.tgz`)))
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv }))
})

test('Create the package and skip publish ("package.private" is true)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-publish-private',
        version: '0.0.0',
        publishConfig: { registry:  url },
        private: true,
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await  publish(
        { tarballDir: 'tarball' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.true(await fs.pathExists(resolve(cwd, `tarball/${pkg.name}-1.0.0.tgz`)))
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv }))
})

test('Create the package and skip publish from a sub-directory ("npmPublish" is false)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-publish-sub-dir',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'dist/package.json'), pkg)

    const result = await  publish(
        { npmPublish: false, tarballDir: './tarball', pkgRoot: './dist' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    t.is((await fs.readJson(resolve(cwd, 'dist/package.json'))).version, '1.0.0')
    t.true(await fs.pathExists(resolve(cwd, `tarball/${pkg.name}-1.0.0.tgz`)))
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv }))
})

test('Create the package and skip publish from a sub-directory ("package.private" is true)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-publish-sub-dir-private',
        version: '0.0.0',
        publishConfig: { registry:  url },
        private: true,
    }
    await fs.outputJson(resolve(cwd, 'dist/package.json'), pkg)

    const result = await  publish(
        { tarballDir: './tarball', pkgRoot: './dist' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    t.is((await fs.readJson(resolve(cwd, 'dist/package.json'))).version, '1.0.0')
    t.true(await fs.pathExists(resolve(cwd, `tarball/${pkg.name}-1.0.0.tgz`)))
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env: testEnv }))
})

test('Throw SemanticReleaseError Array if config option are not valid in publish', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = { publishConfig: { registry:  url } }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    const npmPublish = 42
    const tarballDir = 42
    const pkgRoot = 42

    const errors = [
        ...(
            await t.throwsAsync(
                 publish(
                    { npmPublish, tarballDir, pkgRoot },
                    {
                        cwd,
                        env: {},
                        options: {
                            publish: ['@semantic-release/github', '@semantic-release/npm'],
                        },
                        nextRelease: { version: '1.0.0' },
                        stdout: t.context.stdout,
                        stderr: t.context.stderr,
                        logger: t.context.logger,
                    },
                ),
            )
        ).errors,
    ]

    t.is(errors[0].name, 'SemanticReleaseError')
    t.is(errors[0].code, 'EINVALIDNPMPUBLISH')
    t.is(errors[1].name, 'SemanticReleaseError')
    t.is(errors[1].code, 'EINVALIDTARBALLDIR')
    t.is(errors[2].name, 'SemanticReleaseError')
    t.is(errors[2].code, 'EINVALIDPKGROOT')
    t.is(errors[3].name, 'SemanticReleaseError')
    t.is(errors[3].code, 'ENOPKG')
})

test('Prepare the package', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'prepare',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await  prepare(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.false(await fs.pathExists(resolve(cwd, `${pkg.name}-1.0.0.tgz`)))
})

test('Prepare the package from a sub-directory', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'prepare-sub-dir',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'dist/package.json'), pkg)

    await  prepare(
        { pkgRoot: 'dist' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.is((await fs.readJson(resolve(cwd, 'dist/package.json'))).version, '1.0.0')
    t.false(await fs.pathExists(resolve(cwd, `${pkg.name}-1.0.0.tgz`)))
})

test('Throw SemanticReleaseError Array if config option are not valid in prepare', async (t: any) => {
    const cwd = temporaryDirectory()
    const pkg = { publishConfig: { registry:  url } }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    const npmPublish = 42
    const tarballDir = 42
    const pkgRoot = 42

    const errors = [
        ...(
            await t.throwsAsync(
                 prepare(
                    { npmPublish, tarballDir, pkgRoot },
                    {
                        cwd,
                        env: {},
                        options: {
                            publish: ['@semantic-release/github', '@semantic-release/npm'],
                        },
                        nextRelease: { version: '1.0.0' },
                        stdout: t.context.stdout,
                        stderr: t.context.stderr,
                        logger: t.context.logger,
                    },
                ),
            )
        ).errors,
    ]

    t.is(errors[0].name, 'SemanticReleaseError')
    t.is(errors[0].code, 'EINVALIDNPMPUBLISH')
    t.is(errors[1].name, 'SemanticReleaseError')
    t.is(errors[1].code, 'EINVALIDTARBALLDIR')
    t.is(errors[2].name, 'SemanticReleaseError')
    t.is(errors[2].code, 'EINVALIDPKGROOT')
    t.is(errors[3].name, 'SemanticReleaseError')
    t.is(errors[3].code, 'ENOPKG')
})

test('Publish the package and add to default dist-tag', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'add-channel',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await  publish(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { channel: 'next', version: '1.0.0' },
        },
    )

    const result = await  addChannel(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@latest dist-tag)',
        url: undefined,
        channel: 'latest',
    })
    t.is((await execa('npm', ['view', pkg.name, 'dist-tags.latest'], { cwd, env })).stdout, '1.0.0')
})

test('Publish the package and add to lts dist-tag', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'add-channel-legacy',
        version: '1.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await  publish(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { channel: 'latest', version: '1.0.0' },
        },
    )

    const result = await  addChannel(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { channel: '1.x', version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@release-1.x dist-tag)',
        url: undefined,
        channel: 'release-1.x',
    })
    t.is(
        (await execa('npm', ['view', pkg.name, 'dist-tags'], { cwd, env })).stdout,
        "{ latest: '1.0.0', 'release-1.x': '1.0.0' }",
    )
})

test('Skip adding the package to a channel ("npmPublish" is false)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-add-channel',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await  addChannel(
        { npmPublish: false },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env }))
})

test('Skip adding the package to a channel ("package.private" is true)', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'skip-add-channel-private',
        version: '0.0.0',
        publishConfig: { registry:  url },
        private: true,
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    const result = await  addChannel(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.false(result)
    await t.throwsAsync(execa('npm', ['view', pkg.name, 'version'], { cwd, env }))
})

test('Create the package in addChannel step', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'add-channel-pkg',
        version: '0.0.0',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await  prepare(
        { npmPublish: false, tarballDir: 'tarball' },
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.is((await fs.readJson(resolve(cwd, 'package.json'))).version, '1.0.0')
    t.true(await fs.pathExists(resolve(cwd, `tarball/${pkg.name}-1.0.0.tgz`)))
})

test('Throw SemanticReleaseError Array if config option are not valid in addChannel', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = { publishConfig: { registry:  url } }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)
    const npmPublish = 42
    const tarballDir = 42
    const pkgRoot = 42

    const errors = [
        ...(
            await t.throwsAsync(
                 addChannel(
                    { npmPublish, tarballDir, pkgRoot },
                    {
                        cwd,
                        env,
                        options: {
                            publish: ['@semantic-release/github', '@semantic-release/npm'],
                        },
                        nextRelease: { version: '1.0.0' },
                        stdout: t.context.stdout,
                        stderr: t.context.stderr,
                        logger: t.context.logger,
                    },
                ),
            )
        ).errors,
    ]

    t.is(errors[0].name, 'SemanticReleaseError')
    t.is(errors[0].code, 'EINVALIDNPMPUBLISH')
    t.is(errors[1].name, 'SemanticReleaseError')
    t.is(errors[1].code, 'EINVALIDTARBALLDIR')
    t.is(errors[2].name, 'SemanticReleaseError')
    t.is(errors[2].code, 'EINVALIDPKGROOT')
    t.is(errors[3].name, 'SemanticReleaseError')
    t.is(errors[3].code, 'ENOPKG')
})

test('Verify token and set up auth only on the fist call, then prepare on prepare call only', async (t: any) => {
    const cwd = temporaryDirectory()
    const env =  authEnv()
    const pkg = {
        name: 'test-module',
        version: '0.0.0-dev',
        publishConfig: { registry:  url },
    }
    await fs.outputJson(resolve(cwd, 'package.json'), pkg)

    await t.notThrowsAsync(
         verifyConditions(
            {},
            {
                cwd,
                env,
                options: {},
                stdout: t.context.stdout,
                stderr: t.context.stderr,
                logger: t.context.logger,
            },
        ),
    )
    await  prepare(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    let result = await  publish(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { channel: 'next', version: '1.0.0' },
        },
    )
    t.deepEqual(result, {
        name: 'npm package (@next dist-tag)',
        url: undefined,
        channel: 'next',
    })
    t.is((await execa('npm', ['view', pkg.name, 'dist-tags.next'], { cwd, env })).stdout, '1.0.0')

    result = await  addChannel(
        {},
        {
            cwd,
            env,
            options: {},
            stdout: t.context.stdout,
            stderr: t.context.stderr,
            logger: t.context.logger,
            nextRelease: { version: '1.0.0' },
        },
    )

    t.deepEqual(result, {
        name: 'npm package (@latest dist-tag)',
        url: undefined,
        channel: 'latest',
    })
    t.is((await execa('npm', ['view', pkg.name, 'dist-tags.latest'], { cwd, env })).stdout, '1.0.0')
})
