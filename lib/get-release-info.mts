// @ts-check

import normalizeUrl from 'normalize-url'

export function getReleaseInfo(
    { name }: { name: string },
    { 
        env: { DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org/' },
        nextRelease: { version }
    }: any,
    distTag: any,
    registry: any,
) {
    return {
        name: `npm package (@${distTag} dist-tag)`,
        url:
            normalizeUrl(registry) === normalizeUrl(DEFAULT_NPM_REGISTRY)
                ? `https://www.npmjs.com/package/${name}/v/${version}`
                : undefined,
        channel: distTag,
    }
}
