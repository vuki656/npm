import { execa } from 'execa'
import { getChannel } from './get-channel.mjs'
import { PublishContext } from 'semantic-release'
import { getReleaseInfo } from './get-release-info.mjs'
import { getRegistry } from './get-registry.mjs'

export async function addChannelNpm(npmrc: string, { npmPublish }: { npmPublish: boolean }, pkg: Record<string, any>, context: PublishContext) {
    const {
        cwd,
        env,
        stdout,
        stderr,
        nextRelease: { version, channel },
        logger,
    } = context

    if (npmPublish !== false && pkg.private !== true) {
        // TODO:
        const registry = getRegistry(pkg, context as any)
        const distTag = getChannel(channel)

        logger.log(`Adding version ${version} to npm registry on dist-tag ${distTag}`)
        const result = execa(
            'npm',
            ['dist-tag', 'add', `${pkg.name}@${version}`, distTag, '--userconfig', npmrc, '--registry', registry],
            {
                cwd,
                env,
                preferLocal: true,
            },
        )
        result?.stdout?.pipe(stdout, { end: false })
        result?.stderr?.pipe(stderr, { end: false })
        await result

        logger.log(`Added ${pkg.name}@${version} to dist-tag @${distTag} on ${registry}`)

        return getReleaseInfo(pkg, context, distTag, registry)
    }

    logger.log(
        `Skip adding to npm channel as ${npmPublish === false ? 'npmPublish' : "package.json's private property"} is ${
            npmPublish !== false
        }`,
    )

    return false
}
