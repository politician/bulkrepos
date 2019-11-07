# Bulk Repos

Bulk publicize, privatize, clone and delete repos for a personal Github account or an organization

![Screenshot](https://user-images.githubusercontent.com/3155568/68415503-19210180-01c5-11ea-96ba-b5a99eb452ac.png)

## Install

```sh
git clone https://github.com/iRomain/bulkrepos.git
cd bulkrepos
npm install
```

## Configure

1. [Create a GitHub token](https://github.com/settings/tokens/new?scopes=delete_repo,repo&description=Bulk%20Repos)

2. Edit `ìndex.js`

   ```js
   const config = {
     token: 'YOUR-TOKEN', // Your GitHub token
     account: 'YOUR-ORG-OR-ACCOUNT', // You can specify a personal account or an org account
     isOrg: false, // if the provided account is a Github Organization, set this to true
     setAllPublic: false, // Set all repos to public
     setAllPrivate: false, // Set all repos to private
     cloneAll: true, // Clone all repos locally (a subfolder will be created in the current directory)
     deleteAll: false // Delete all repos from the specified GitHub account
   }
   ```

   > If your account is over the quota limit for private repos, you should set `setAllPublic` to `true` as Github may disable cloning private repos. They will be public just enoigh time to be cloned before being deleted.

## Run

```sh
node index.js
```
