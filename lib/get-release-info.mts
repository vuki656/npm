import normalizeUrl from 'normalize-url'

export function getReleaseInfo(
    details: Record<string, any>,
    config: any, // TODO:
    distTag: any, // TODO:
    registry: string,
) {
    const isUrlNormalized =
        normalizeUrl(registry) === normalizeUrl(config?.env?.DEFAULT_NPM_REGISTRY ?? 'https://registry.npmjs.org/')

    return {
        name: `npm package (@${distTag} dist-tag)`,
        url: isUrlNormalized ? `https://www.npmjs.com/package/${details.name}/v/${config.nextRelease.version}` : undefined,
        channel: distTag,
    }
}
