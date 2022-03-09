# 3.0.0

**BREAKING CHANGES**

- To ensure the project has a long term owner, the repository was moved to the lead developer's github account at `jakobo/slack-rich-notify`, where it is expected to live for the forseeable future. There's one more migration required, but that should also be the last one. Huge apollogies as I know folks depend on this Github Action; I felt it best to get the module into a stable place as quickly as I could.

# 2.0.0

**BREAKING CHANGES**

- The repository was moved from `aibexhq/slack-notify` to `aibexhq/slack-rich-notify` to match the definition in the `action.yml` file.<br>**Migrating** Update your references from `slack-notify` to `slack-rich-notify` per the change above.
  <br><br>
- :warning: [January 2022] The organization was renamed from `aibexhq` to `aibex` <br>**Migrating** Update your references from `aibexhq` to `aibex` per the change above.

**Features**
n/a

**Fixes**

- Added support for possible integers in the `raw` param. This allows you to set `raw: 0` and have it behave the same as `raw: false` making it more yaml-like
