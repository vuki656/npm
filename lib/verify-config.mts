// @ts-check

import { isBoolean, isNil, isString } from 'lodash-es'
import { getError } from './get-error.mjs'

const isNonEmptyString = (value: any) => isString(value) && value.trim()

const VALIDATORS = {
    npmPublish: isBoolean,
    tarballDir: isNonEmptyString,
    pkgRoot: isNonEmptyString,
}

export function verifyNpmConfig({ npmPublish, tarballDir, pkgRoot }: any) {
    const errors = Object.entries({ npmPublish, tarballDir, pkgRoot }).reduce((errors: any, [option, value]: any) => {
        // @ts-expect-error
        return !isNil(value) && !VALIDATORS[option](value)
            ? [...errors, getError(`EINVALID${option.toUpperCase()}`, { [option]: value })]
            : errors
    }, [])

    return errors
}
