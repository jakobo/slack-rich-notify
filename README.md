<p align="center">
  <a href="https://github.com/aibexhq/slack-notify"><img alt="aibexhq/slack-notify status" src="https://github.com/aibexhq/slack-notify/workflows/units-test/badge.svg"></a>
</p>

# aibexhq/slack-notify (Unstable - In Development)

Because sometimes, you just want a mutliline markdown friendly message sent to slack. With variables.

# Usage

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v2
  - name: Notifying via Slack
    uses: aibexhq/slack-notify@master
    with:
      token: ${{secrets.SLACK_BOT_KEY}} # slack bot key
      secret: ${{secrets.SLACK_SIGNING_SECRET}} # slack signing secret
      channel: ${{secrets.SLACK_CHANNEL}} # your channel
      eval: |
        changelog = git log --reverse --color=never --pretty='format:* %h %s (%ae)' {{github.event.push.before}}...{{github.event.push.head}}
      message: |
        *Something Happened!*
        `{{context.payload.before}}...{{context.payload.head}}`
        {{eval.changelog}}
```

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

Checkin to the v1 release branch

```bash
$ git checkout -b v1
$ git commit -a -m "v1 release"
```

```bash
$ git push origin v1
```

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
