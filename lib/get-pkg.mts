// @ts-check

import { resolve } from 'node:path'
import { readPackage } from 'read-pkg'
import AggregateError from 'aggregate-error'
import { getError } from './get-error.mjs'

export async function getPkg({ pkgRoot }: any, { cwd }: any) {
    try {
        const pkg = await readPackage({
            cwd: pkgRoot ? resolve(cwd, String(pkgRoot)) : cwd,
        })

        if (!pkg.name) {
        // @ts-expect-error
            throw getError('ENOPKGNAME')
        }

        return pkg
    } catch (error) {
        // @ts-expect-error
        if (error.code === 'ENOENT') {
        // @ts-expect-error
            throw new AggregateError([getError('ENOPKG')])
        }

        // @ts-expect-error
        throw new AggregateError([error])
    }
}
