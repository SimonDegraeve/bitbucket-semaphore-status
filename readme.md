![App Logo](https://raw.githubusercontent.com/SimonDegraeve/bitbucket-semaphore-status/master/assets/logo-small.png)
Bitbucket Semaphore Status
=========================

Small app that will automatically update newly created pull requests in Bitbucket with the branch's Semaphore build status. This is inspired by [bitbucket-codeship-status](https://github.com/chesleybrown/bitbucket-codeship-status).

# Running on Heroku

First just deploy a free instance of the app on heroku using the button then just follow the steps below.

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

1. Create an API Key in Bitbucket for your team and use your team name as the `username` and the API Key as your `password` in the next step.
1. Set `BITBUCKET_USERNAME` and `BITBUCKET_PASSWORD` ENV variables to match with the `username` and `password` above.
1. Add a `Pull Request POST` hook in Bitbucket for `Create / Edit / Merge / Decline` that points to your instance of this app. The URL should look something like this:
	`https://<YOUR_APP_NAME_ON_HEROKU>.herokuapp.com/pull-request/<SEMAPHORE_PROJECT_UUID>/<SEMAPHORE_AUTH_TOKEN>`
1. Now whenever a pull request is created, it should (almost instantly) get updated to have the [Semaphore Status Badge](https://semaphoreapp.com/docs/how-to-get-build-badge.html) in the description.

# Running Locally

Server runs on port `8000` by default, but will use the port set
on the environment variable `PORT` if set.

1. Run `npm install` for the initial setup.
1. Set `BITBUCKET_USERNAME` and `BITBUCKET_PASSWORD` ENV variables.
1. Run `npm start` to start the server.
