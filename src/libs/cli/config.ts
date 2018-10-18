import * as OmniCLI from 'omnicli'

import { upsertSourcegraphUrl, URLError } from '../../browser/helpers/storage'
import storage from '../../browser/storage'
import { repositoryFileTreeEnabled } from '../../shared/util/context'
import { featureFlags } from '../../shared/util/featureFlags'

const upserUrl = (command: string) => ([url]: string[]) => {
    const err = upsertSourcegraphUrl(url)
    if (!err) {
        return
    }

    if (err === URLError.Empty || err === URLError.Invalid) {
        console.error(`src :${command} - invalid url entered`)
    } else if (err === URLError.HTTPNotSupported) {
        console.error(
            'Safari extensions do not support communication via `http:`. We suggest using https://ngrok.io for local testing.'
        )
    }
}

const addUrlCommand: OmniCLI.Command = {
    name: 'add-url',
    action: upserUrl('add-url'),
    description: 'Add a Sourcegraph Server URL',
}

function getSetURLSuggestions([cmd, ...args]: string[]): Promise<OmniCLI.Suggestion[]> {
    return new Promise(resolve => {
        storage.getSync(({ sourcegraphURL, serverUrls }) => {
            const suggestions: OmniCLI.Suggestion[] = serverUrls.map(url => ({
                content: url,
                description: `${url}${url === sourcegraphURL ? ' (current)' : ''}`,
            }))

            resolve(suggestions)
        })
    })
}

const setUrlCommand: OmniCLI.Command = {
    name: 'set-url',
    action: upserUrl('set-url'),
    getSuggestions: getSetURLSuggestions,
    description: 'Set your primary Sourcegraph Server URL',
}

async function setFileTree([to]: string[]): Promise<void> {
    if ((to && to === 'true') || to === 'false') {
        await featureFlags.set('repositoryFileTreeEnabled', to === 'true')
        return
    }

    const enabled = await featureFlags.isEnabled('repositoryFileTreeEnabled')
    await featureFlags.set('repositoryFileTreeEnabled', !enabled)
}

function getSetFileTreeSuggestions(): Promise<OmniCLI.Suggestion[]> {
    return featureFlags.isEnabled('repositoryFileTreeEnabled').then(enabled => [
        {
            content: repositoryFileTreeEnabled ? 'false' : 'true',
            description: `${repositoryFileTreeEnabled ? 'Disable' : 'Enable'} File Tree`,
        },
    ])
}

const setFileTreeCommand: OmniCLI.Command = {
    name: 'set-tree',
    action: setFileTree,
    getSuggestions: getSetFileTreeSuggestions,
    description: 'Set or toggle the File Tree',
}

async function setOpenFileOn([to]: string[]): Promise<void> {
    if ((to && to === 'true') || to === 'false') {
        await featureFlags.set('openFileOnSourcegraph', to === 'true')
        return
    }

    const enabled = featureFlags.isEnabled('openFileOnSourcegraph')
    await featureFlags.set('openFileOnSourcegraph', !enabled)
}

function getSetOpenFileOnSuggestions(): Promise<OmniCLI.Suggestion[]> {
    return featureFlags.isEnabled('openFileOnSourcegraph').then(enabled => [
        {
            content: enabled ? 'false' : 'true',
            description: `Open files from the fuzzy finder on ${enabled ? 'your code host' : 'Sourcegraph'}`,
        },
    ])
}

const setOpenFileOnCommand: OmniCLI.Command = {
    name: 'set-open-on-sg',
    alias: ['sof'],
    action: setOpenFileOn,
    getSuggestions: getSetOpenFileOnSuggestions,
    description: `Set whether you would like files to open on Sourcegraph of the given repo's code host`,
}

export default [addUrlCommand, setUrlCommand, setFileTreeCommand, setOpenFileOnCommand]
