/**
 * Change these variables to your liking before running the script
 */
const config = {
  token: 'YOUR-TOKEN', // Your GitHub token
  account: 'YOUR-ORG-OR-ACCOUNT', // You can specify a personal account or an org account
  isOrg: false, // if the provided account is a Github Organization, set this to true
  setAllPublic: false, // Set all repos to public
  setAllPrivate: false, // Set all repos to private
  cloneAll: true, // Clone all repos locally (a subfolder will be created in the current directory)
  deleteAll: false // Delete all repos from the specified GitHub account
}

/**
 * Dependencies
 */
const { GraphQLClient } = require('graphql-request')
const https = require('https')
const git = require('isomorphic-git')
const fs = require('fs')
git.plugins.set('fs', fs)

/**
 * Functions
 */
async function cloneRepo(repo, url, destination) {
  process.stdout.write(`  Clone locally...`)
  await git.clone({
    url: url,
    dir: config.account + '/' + destination,
    oauth2format: 'github',
    token: config.token
  })
  process.stdout.write(`Done\n`)
}

async function deleteRepo(repo) {
  process.stdout.write('  Delete from GitHub...')

  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/' + repo,
    method: 'DELETE',
    headers: {
      Authorization: 'token ' + config.token,
      'User-Agent': 'iRomain'
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      if (res.statusCode == 204) {
        process.stdout.write('Done\n')
        resolve()
      } else {
        var response = ''

        res.on('data', chunk => {
          try {
            response += chunk.toString()
          } catch (e) {
            reject(e)
          }
        })

        res.on('end', () => {
          try {
            response = JSON.parse(response)
            if (response.message) {
              reject(response.message)
            } else {
              reject(response)
            }
          } catch {
            reject(response)
          }
        })
      }
    })

    req.on('error', error => {
      reject(error)
    })

    req.end()
  })
}

async function toggleVisibility(repo, private = false) {
  process.stdout.write('  Toggle Visibility...')

  const data = JSON.stringify({
    private: private
  })

  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/' + repo,
    method: 'PATCH',
    headers: {
      Authorization: 'token ' + config.token,
      'User-Agent': 'iRomain',
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      var response = ''

      res.on('data', chunk => {
        try {
          response += chunk.toString()
        } catch (e) {
          reject(e)
        }
      })

      res.on('end', () => {
        try {
          response = JSON.parse(response)
          if (response.message) {
            reject(response.message)
          } else if (response.hasOwnProperty('private')) {
            response = `Private: ${response.private}\n`
            process.stdout.write(response)
            resolve()
          } else {
            reject(response)
          }
        } catch {
          reject(response)
        }
      })
    })

    req.on('error', error => {
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

async function getRepos(owner, isOrg = true) {
  api = new GraphQLClient('https://api.github.com/graphql', {
    headers: {
      authorization: 'token ' + config.token
    }
  })

  let hasNextPage = true
  let cursor = null
  let repos = []
  const ownerType = isOrg ? 'organization' : 'user'

  while (hasNextPage == true) {
    await api
      .request(
        /* GraphQL */ `
          query getRepos($owner: String!, $isOrg: Boolean!, $cursor: String) {
            organization(login: $owner) @include(if: $isOrg) {
              repositories(first: 100, after: $cursor) {
                ...repos
              }
            }
            user(login: $owner) @skip(if: $isOrg) {
              repositories(first: 100, after: $cursor) {
                ...repos
              }
            }
          }

          fragment repos on RepositoryConnection {
            pageInfo {
              endCursor
              hasNextPage
            }
            edges {
              node {
                name
                nameWithOwner
                url
              }
            }
          }
        `,
        {
          owner,
          isOrg,
          cursor
        }
      )
      .then(data => {
        hasNextPage = data[ownerType].repositories.pageInfo.hasNextPage
        cursor = data[ownerType].repositories.pageInfo.endCursor
        data[ownerType].repositories.edges.forEach(repo => {
          const nameWithOwner = repo.node.nameWithOwner
          if (
            RegExp(`^${owner}/`, 'i').test(nameWithOwner)
            // Make sure we only return the repos owned by requested user (by default, github returns owned repos across organizations)
          ) {
            repos = [
              ...repos,
              {
                name: repo.node.name,
                nameWithOwner: nameWithOwner,
                url: repo.node.url
              }
            ]
          }
        })
      })
      .catch(err => {
        throw Error(
          (err &&
            err.response &&
            err.response.errors &&
            err.response.errors[0].message) ||
            err.message ||
            err.name ||
            err
        )
      })
  }
  return repos
}

/**
 * Controller
 */

getRepos(config.account, config.isOrg).then(async repos => {
  if (config.cloneAll && !fs.existsSync(config.account))
    fs.mkdirSync(config.account)

  for (var key of Object.keys(repos)) {
    process.stdout.write(`- Found ${repos[key].nameWithOwner}\n`)

    if (config.setAllPublic || config.setAllPrivate)
      await toggleVisibility(repos[key].nameWithOwner, config.setAllPrivate)
        .then(async () => {
          if (config.cloneAll)
            await cloneRepo(
              repos[key].nameWithOwner,
              repos[key].url,
              repos[key].name
            ).then(async () => {
              if (config.deleteAll) await deleteRepo(repos[key].nameWithOwner)
            })
        })
        .catch(e => process.stderr.write(`ERROR: ${e}\n`))
  }
})
