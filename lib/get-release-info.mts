// @ts-check

import normalizeUrl from 'normalize-url'

type ConfigType = {
    env?: {
        DEFAULT_NPM_REGISTRY: string
    },
    nextRelease: {
        version: string
    }
}

type DetailsType = {
    name: string
}

export function getReleaseInfo(
    details: DetailsType,
    config: ConfigType,
    distTag: string,
    registry: string,
) {
    const isUrlNormalized = normalizeUrl(registry) === normalizeUrl(config?.env?.DEFAULT_NPM_REGISTRY ?? 'https://registry.npmjs.org/')

    return {
        name: `npm package (@${distTag} dist-tag)`,
        url: isUrlNormalized
            ? `https://www.npmjs.com/package/${details.name}/v/${config.nextRelease.version}`
            : undefined,
        channel: distTag,
    }
}
