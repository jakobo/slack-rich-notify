# 2.0.0

**BREAKING CHANGES**

- The repository was moved from `aibexhq/slack-notify` to `aibexhq/slack-rich-notify` to match the definition in the `action.yml` file.<br>**Migrating** Update your references from slack-notify to slack-rich-notify per the change above.

**Features**
n/a

**Fixes**

- Added support for possible integers in the `raw` param. This allows you to set `raw: 0` and have it behave the same as `raw: false` making it more yaml-like
