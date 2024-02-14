import test from 'ava'
import { getReleaseInfo } from '../lib/get-release-info.mjs'

test('Default registry and scoped module', async (t) => {
    const releaseInfo = getReleaseInfo(
        { name: '@scope/module' },
        { nextRelease: { version: '1.0.0' } },
        'latest',
        'https://registry.npmjs.org/',
    )

    t.deepEqual(releaseInfo, {
        name: 'npm package (@latest dist-tag)',
        url: 'https://www.npmjs.com/package/@scope/module/v/1.0.0',
        channel: 'latest',
    })
})

test('Custom registry and scoped module', async (t) => {
    const releaseInfo = getReleaseInfo(
        { name: '@scope/module' },
        { nextRelease: { version: '1.0.0' } },
        'latest',
        'https://custom.registry.org/',
    )

    t.deepEqual(releaseInfo, {
        name: 'npm package (@latest dist-tag)',
        url: undefined,
        channel: 'latest',
    })
})
