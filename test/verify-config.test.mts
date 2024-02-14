// @ts-check

import test from 'ava'
import { stub } from 'sinon'
import { verifyNpmConfig } from '../lib/verify-config.mjs'

test.beforeEach((t: any) => {
    // Stub the logger functions
    t.context.log = stub()
    t.context.logger = { log: t.context.log }
})

test('Verify "npmPublish", "tarballDir" and "pkgRoot" options', async (t: any) => {
    // @ts-expect-error
    t.deepEqual(await verifyNpmConfig({ npmPublish: true, tarballDir: 'release', pkgRoot: 'dist' }, {}, t.context.logger), [])
})

test('Return SemanticReleaseError if "npmPublish" option is not a Boolean', async (t: any) => {
    const npmPublish = 42
    // @ts-expect-error
    const [error, ...errors] = await verifyNpmConfig({ npmPublish }, {}, t.context.logger)

    t.is(errors.length, 0)
    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'EINVALIDNPMPUBLISH')
})

test('Return SemanticReleaseError if "tarballDir" option is not a String', async (t: any) => {
    const tarballDir = 42
    // @ts-expect-error
    const [error, ...errors] = await verifyNpmConfig({ tarballDir }, {}, t.context.logger)

    t.is(errors.length, 0)
    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'EINVALIDTARBALLDIR')
})

test('Return SemanticReleaseError if "pkgRoot" option is not a String', async (t: any) => {
    const pkgRoot = 42
    // @ts-expect-error
    const [error, ...errors] = await verifyNpmConfig({ pkgRoot }, {}, t.context.logger)

    t.is(errors.length, 0)
    t.is(error.name, 'SemanticReleaseError')
    t.is(error.code, 'EINVALIDPKGROOT')
})

test('Return SemanticReleaseError Array if multiple config are invalid', async (t: any) => {
    const npmPublish = 42
    const tarballDir = 42
    const pkgRoot = 42
    // @ts-expect-error
    const [error1, error2, error3] = await verifyNpmConfig({ npmPublish, tarballDir, pkgRoot }, {}, t.context.logger)

    t.is(error1.name, 'SemanticReleaseError')
    t.is(error1.code, 'EINVALIDNPMPUBLISH')

    t.is(error2.name, 'SemanticReleaseError')
    t.is(error2.code, 'EINVALIDTARBALLDIR')

    t.is(error3.name, 'SemanticReleaseError')
    t.is(error3.code, 'EINVALIDPKGROOT')
})
