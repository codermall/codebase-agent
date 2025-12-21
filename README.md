codebase-agent
=================

A new CLI generated with oclif


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/codebase-agent.svg)](https://npmjs.org/package/codebase-agent)
[![Downloads/week](https://img.shields.io/npm/dw/codebase-agent.svg)](https://npmjs.org/package/codebase-agent)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g codebase-agent
$ ag COMMAND
running command...
$ ag (--version)
codebase-agent/0.0.0 darwin-arm64 node-v22.21.0
$ ag --help [COMMAND]
USAGE
  $ ag COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`ag hello PERSON`](#ag-hello-person)
* [`ag hello world`](#ag-hello-world)
* [`ag help [COMMAND]`](#ag-help-command)
* [`ag plugins`](#ag-plugins)
* [`ag plugins add PLUGIN`](#ag-plugins-add-plugin)
* [`ag plugins:inspect PLUGIN...`](#ag-pluginsinspect-plugin)
* [`ag plugins install PLUGIN`](#ag-plugins-install-plugin)
* [`ag plugins link PATH`](#ag-plugins-link-path)
* [`ag plugins remove [PLUGIN]`](#ag-plugins-remove-plugin)
* [`ag plugins reset`](#ag-plugins-reset)
* [`ag plugins uninstall [PLUGIN]`](#ag-plugins-uninstall-plugin)
* [`ag plugins unlink [PLUGIN]`](#ag-plugins-unlink-plugin)
* [`ag plugins update`](#ag-plugins-update)

## `ag hello PERSON`

Say hello

```
USAGE
  $ ag hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ ag hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/Projects/codebase-agent/blob/v0.0.0/src/commands/hello/index.ts)_

## `ag hello world`

Say hello world

```
USAGE
  $ ag hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ ag hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/Projects/codebase-agent/blob/v0.0.0/src/commands/hello/world.ts)_

## `ag help [COMMAND]`

Display help for ag.

```
USAGE
  $ ag help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ag.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `ag plugins`

List installed plugins.

```
USAGE
  $ ag plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ ag plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/index.ts)_

## `ag plugins add PLUGIN`

Installs a plugin into ag.

```
USAGE
  $ ag plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into ag.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the AG_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the AG_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ ag plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ ag plugins add myplugin

  Install a plugin from a github url.

    $ ag plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ ag plugins add someuser/someplugin
```

## `ag plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ ag plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ ag plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/inspect.ts)_

## `ag plugins install PLUGIN`

Installs a plugin into ag.

```
USAGE
  $ ag plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into ag.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the AG_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the AG_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ ag plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ ag plugins install myplugin

  Install a plugin from a github url.

    $ ag plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ ag plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/install.ts)_

## `ag plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ ag plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ ag plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/link.ts)_

## `ag plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ ag plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ ag plugins unlink
  $ ag plugins remove

EXAMPLES
  $ ag plugins remove myplugin
```

## `ag plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ ag plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/reset.ts)_

## `ag plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ ag plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ ag plugins unlink
  $ ag plugins remove

EXAMPLES
  $ ag plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/uninstall.ts)_

## `ag plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ ag plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ ag plugins unlink
  $ ag plugins remove

EXAMPLES
  $ ag plugins unlink myplugin
```

## `ag plugins update`

Update installed plugins.

```
USAGE
  $ ag plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.54/src/commands/plugins/update.ts)_
<!-- commandsstop -->
