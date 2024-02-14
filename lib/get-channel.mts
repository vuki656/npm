// @ts-check

import semver from 'semver'

export function getChannel(channel: string | undefined) {
    const semverChannel = semver.validRange(channel) ? `release-${channel}` : channel

    return channel ? semverChannel : 'latest'
}
