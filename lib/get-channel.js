// @ts-check

import semver from 'semver'

export function getChannel(channel) {
    const semverChannel = semver.validRange(channel) ? `release-${channel}` : channel

    return channel ? semverChannel : 'latest'
}
