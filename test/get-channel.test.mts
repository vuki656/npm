// @ts-check

import test from 'ava'
import { getChannel } from '../lib/get-channel.mjs'

test.serial('Get default channel', (t: any) => {
    t.is(getChannel(undefined), 'latest')
})

test.serial('Get passed channel if valid', (t: any) => {
    t.is(getChannel('next'), 'next')
})

test.serial('Prefix channel with "release-" if invalid', (t: any) => {
    t.is(getChannel('1.x'), 'release-1.x')
    t.is(getChannel('1.0.0'), 'release-1.0.0')
})
