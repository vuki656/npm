// @ts-check

import { validRange } from 'semver'

export function getChannel(channel: string | undefined) {
    const semverChannel = validRange(channel) ? `release-${channel}` : channel

    return channel ? semverChannel : 'latest'
}
