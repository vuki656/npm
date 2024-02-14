// @ts-check

// @ts-expect-error
import SemanticReleaseError from '@semantic-release/error'
import * as ERROR_DEFINITIONS from './definitions/errors.mjs'

export function getError(code: any, ctx: any) {
    // @ts-expect-error
    const { message, details } = ERROR_DEFINITIONS[code](ctx)

    return new SemanticReleaseError(message, code, details)
}
