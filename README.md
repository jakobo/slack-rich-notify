<p align="center">
  <a href="https://github.com/aibexhq/slack-notify"><img alt="aibexhq/slack-notify status" src="https://github.com/aibexhq/slack-notify/workflows/units-test/badge.svg"></a>
</p>

# aibexhq/slack-rich-notify@v2.0.1

Because sometimes, you just want a mutliline markdown friendly message sent to slack. With variables.

# Usage

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v2
  - name: Notifying via Slack
    uses: aibexhq/slack-rich-notify@v2.0.1
    with:
      token: ${{secrets.SLACK_BOT_KEY}} # your slack bot key
      secret: ${{secrets.SLACK_SIGNING_SECRET}} # your slack signing secret
      channel: ${{secrets.SLACK_CHANNEL}} # your slack channel
      # evals - a string of statements (1 per line), assigning the results of a
      # shell command to the left-hand side of the equal (=). In this example,
      # we are running a `git log` command with specific formatting, and then
      # saving the result to a variable called "changelog"
      #
      # Supports Handlebars templating. Don't forget to escape backticks and
      # quotes as needed
      evals: |
        changelog = git log --reverse --color=never --pretty='tformat:%xe2%x80%xa2 `%h` %s (%ae)' {{context.payload.push.before}}...{{context.payload.push.head}}
      # message - a string to send to Slack
      # Supports Markdown and Handlebars
      message: |
        *Something Got Pushed!*
        `{{context.payload.push.before}}...{{context.payload.push.head}}`
        {{evals.changelog}}
```

# Table of Contents

- [aibexhq/slack-rich-notify@v2.0.1](#aibexhqslack-rich-notifyv201)
- [Usage](#usage)
- [Table of Contents](#table-of-contents)
- [Action Parameters](#action-parameters)
  - [Finding Your Slack Settings](#finding-your-slack-settings)
- [Using the `evals` Parameter](#using-the-evals-parameter)
  - [If running git operations](#if-running-git-operations)
- [Handlebars Usage](#handlebars-usage)
  - [What's in that `context` object?](#whats-in-that-context-object)
  - [Formatting with Handlebars](#formatting-with-handlebars)
    - [cut (Handlebars Helper)](#cut-handlebars-helper)
    - [Accepting PRs for Handlebars Helpers](#accepting-prs-for-handlebars-helpers)
- [Developing (from original readme)](#developing-from-original-readme)
  - [Package for distribution](#package-for-distribution)
  - [Create a release branch](#create-a-release-branch)

# Action Parameters

| name      | description                                                                                                                                                                                                                                                                                                                          |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel` | :warning: **Should be loaded as a Github Secret**<br>Your Slack channel ID you wish to post to.                                                                                                                                                                                                                                      |
| `dry-run` | Do not perform a slack notification, instead dumping the message to your Github Action output                                                                                                                                                                                                                                        |
| `dump`    | Dump the contents of your payload used to format Handlebars messages. `channel`, `secret`, and `token` are masked                                                                                                                                                                                                                    |
| `evals`   | A list of newline-delimited commands to run in order to create variables for your slack message. See [the section on evals](#using-the-evals-parameter) for details                                                                                                                                                                  |
| `message` | The slack message to send                                                                                                                                                                                                                                                                                                            |
| `secret`  | :warning: **Should be loaded as a Github Secret**<br>Your Slack Bot's Signing Secret. We use [@slack/bolt](https://slack.dev/bolt/) for composing messages to avoid maintaining as much code as possible. Bolt requires a signing secret on initialization, even if we're not planning to listen for inbound requests.               |
| `token`   | :warning: **Should be loaded as a Github Secret**<br>Your Slack Bot token, beginning with `xoxb-`. Bot tokens are more resilient than webhook tokens. You'll need the `chat:write`, `chat:write.customize`, and `chat:write.public` permissions **at a minimum** to be able to send messages to any channel in your Slack workspace. |

## Finding Your Slack Settings

- `token`: `https://api.slack.com/apps` > `<your app>` > `OAuth & Permissions` > `field named: "Bot User OAuth Access Token"`
- `secret`: `https://api.slack.com/apps` > `<your app>` > `section named: "App Credentials"` > `field named: "Client Secret"`
- `channel`:
  - **On Desktop** `right click channel and select "Copy Link"` > `https://aibex.slack.com/archives/[this-is-your-channel-id]` (it should begin with `C`)
  - **On Web** `select your channel from the sidebar` > `https://app.slack.com/client/[this-is-your-team]/[this-is-your-channel-id]` (it should begin with `C`)

# Using the `evals` Parameter

Many times, slack notifications need additional information such as git commit subjects or the output of running a shell command. The `evals` block enables you to run any command available via shell code and capture it for usage in your slack message. Each line in `evals` is a command.

```
saveAs = command --to --run remeber_to_escape
```

Commands are spawned using [@actions/exec](https://github.com/actions/toolkit/tree/master/packages/exec) with `stdout` and `stderr` captured for cross platform compatibility.

Each evaluated line is saved to the lefthand side of the assignment and available in all future commands and slack messages as `{{evals.__your_saved_name__}}`.

## If running git operations

If you're planning on calling git operations, remember to update your checkout to **fetch all history**. By default, Github Actions only check out the most recent commit for the purpose of tests. Setting a `fetch-depth` of `0` will enable you to call git commands that span your repo's history.

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v2
    with:
      fetch-depth: 0 # all history required
```

# Handlebars Usage

## What's in that `context` object?

![View The Context In a Job](https://github.com/aibexhq/slack-rich-notify/workflows/Demo%20Output/badge.svg?branch=master&event=push) [View A Sample Dumped Context](https://github.com/aibexhq/slack-rich-notify/actions?query=workflow%3A%22Demo+Output%22)

The `context` object available to your handlebars template is the same context object used by [Octokit](https://github.com/actions/toolkit/tree/master/packages/github). It contains a `payload` object which is your [webhook payload](https://developer.github.com/v3/activity/events/types/), along with a variety of other items connected to your Job, including `sha`, `ref`, and `workflow`.

```js
{
  //...
  "context": {
    "payload": {
      /* Specific based on type of event, sample below */
      "pull_request": {}
    },
    "eventName": "pull_request",
    "sha": "94933e1fe203d34a3ed73033c6fb04eb07715de4",
    "ref": "refs/heads/jakobo/docker_smash_2",
    "workflow": "Pilot",
    "action": "1",
    "actor": "nektos/act"
  }
}
```

## Formatting with Handlebars

Shell commands and the Slack message both support formatting with the [Handlebars](https://handlebarsjs.com/) template engine. You'll receive the following variables inside of the Handlebars template:

| name                | type   | description                                                                            |
| :------------------ | :----- | :------------------------------------------------------------------------------------- |
| `context.payload`   | object | Contains the [webhook payload](https://developer.github.com/v3/activity/events/types/) |
| `context.eventName` | string | One of the triggering Github Action events                                             |
| `env.*`             | object | Contains the current `process.env` as of script execution                              |
| `evals.*`           | object | Contains the assigned output from the `evals` parameter in this action                 |
| `inputs.*`          | object | Contains the inputs `message`, `raw`, and `channel` as provided to this action         |

### cut (Handlebars Helper)

```hbs
# reduce a string to its first N characters
# useful for constructing things such as short hashes
# cut [string]                    [N]
{{cut context.payload.before  8  }}
```

### Accepting PRs for Handlebars Helpers

At creation, it made sense to only include _the absolute minimum_ helpers that would make writing scripts and Slack messages easier. For example, `cut` offers a convienent way to shorten `sha1` hashes. If you have ideas, open an issue or PR. We just ask that you incldue an example of how this helps compared to regular 'ole bash scripting. (And yes, "the bashism to do X is absurd" is valid)

# Developing (from original readme)

This is based on the javascript-action template.

## Package for distribution

GitHub Actions will run the entry point from the action.yml. Packaging assembles the code into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

Actions are run from GitHub repos. Packaging the action will create a packaged action in the dist folder.

Run package

```bash
npm run package
```

Since the packaged index.js is run from the dist folder.

```bash
git add dist
```

## Create a release branch

Users shouldn't consume the action from master since that would be latest code and actions can break compatibility between major versions.

Checkin to the v(x) release branch

```bash
$ git checkout -b v(x)
$ git commit -a -m "v(x) release"
```

```bash
$ git push origin v(x)
```

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
