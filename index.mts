// @ts-check

import { castArray, defaultTo } from 'lodash-es'
import AggregateError from 'aggregate-error'
import { temporaryFile } from 'tempy'
import { getPkg } from './lib/get-pkg.mjs'
import { verifyNpmConfig } from './lib/verify-config.mjs'
import { verifyNpmAuth } from './lib/verify-auth.mjs'
import { addChannelNpm } from './lib/add-channel.mjs'
import { prepareNpm } from './lib/prepare.mjs'
import { publishNpm } from './lib/publish.mjs'

let verified: any
let prepared: any
const npmrc = temporaryFile({ name: '.npmrc' })

export async function verifyConditions(pluginConfig: any, context: any) {
    // If the npm publish plugin is used and has `npmPublish`, `tarballDir` or `pkgRoot` configured, validate them now in order to prevent any release if the configuration is wrong
    if (context.options.publish) {
        const publishPlugin =
            castArray(context.options.publish).find((config) => config.path && config.path === '@semantic-release/npm') || {}

        pluginConfig.npmPublish = defaultTo(pluginConfig.npmPublish, publishPlugin.npmPublish)
        pluginConfig.tarballDir = defaultTo(pluginConfig.tarballDir, publishPlugin.tarballDir)
        pluginConfig.pkgRoot = defaultTo(pluginConfig.pkgRoot, publishPlugin.pkgRoot)
    }

    const errors = verifyNpmConfig(pluginConfig)

    try {
        const pkg = await getPkg(pluginConfig, context)

        // Verify the npm authentication only if `npmPublish` is not false and `pkg.private` is not `true`
        if (pluginConfig.npmPublish !== false && pkg.private !== true) {
            await verifyNpmAuth(npmrc, pkg, context)
        }
    } catch (error) {
        // @ts-expect-error
        errors.push(...error.errors)
    }

    if (errors.length > 0) {
        throw new AggregateError(errors)
    }

    verified = true
}

export async function prepare(pluginConfig: any, context: any) {
    const errors = verified ? [] : verifyNpmConfig(pluginConfig)

    try {
        // Reload package.json in case a previous external step updated it
        const pkg = await getPkg(pluginConfig, context)
        if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
            await verifyNpmAuth(npmrc, pkg, context)
        }
    } catch (error: any) {
        errors.push(...error.errors)
    }

    if (errors.length > 0) {
        throw new AggregateError(errors)
    }

    await prepareNpm(npmrc, pluginConfig, context)
    prepared = true
}

export async function publish(pluginConfig: any, context: any) {
    let pkg
    const errors = verified ? [] : verifyNpmConfig(pluginConfig)

    try {
        // Reload package.json in case a previous external step updated it
        pkg = await getPkg(pluginConfig, context)
        if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
            await verifyNpmAuth(npmrc, pkg, context)
        }
    } catch (error) {
        //@ts-expect-error
        errors.push(...error.errors)
    }

    if (errors.length > 0) {
        throw new AggregateError(errors)
    }

    if (!prepared) {
        await prepareNpm(npmrc, pluginConfig, context)
    }

    return publishNpm(npmrc, pluginConfig, pkg, context)
}

export async function addChannel(pluginConfig: any, context: any) {
    let pkg
    const errors = verified ? [] : verifyNpmConfig(pluginConfig)

    try {
        // Reload package.json in case a previous external step updated it
        pkg = await getPkg(pluginConfig, context)
        if (!verified && pluginConfig.npmPublish !== false && pkg.private !== true) {
            await verifyNpmAuth(npmrc, pkg, context)
        }
    } catch (error) {
        //@ts-expect-error
        errors.push(...error.errors)
    }

    if (errors.length > 0) {
        throw new AggregateError(errors)
    }

    return addChannelNpm(npmrc, pluginConfig, pkg as any, context)
}
