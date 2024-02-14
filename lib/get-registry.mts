// @ts-check

import { resolve } from 'node:path'
import rc from 'rc'
import getRegistryUrl from 'registry-auth-token/registry-url.js'

// @ts-expect-error
export function getRegistry({ publishConfig: { registry } = {}, name }: Record<string, any>, { cwd, env }: Record<string, any>) {
    return (
        registry ||
        env.NPM_CONFIG_REGISTRY ||
        getRegistryUrl(
            name.split('/')[0],
            // @ts-expect-error
            rc(
                'npm',
                { registry: 'https://registry.npmjs.org/' },
                { config: env.NPM_CONFIG_USERCONFIG || resolve(cwd, '.npmrc') },
            ),
        )
    )
}
