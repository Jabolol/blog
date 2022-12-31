---
title: Setting up Neovim as an IDE
publish_date: 2022-12-31
abstract: In this blog entry we will set up Neovim as a fully-fledged, privacy-conscious alternative to Visual Studio Code
---

Since I started coding, Visual Studio Code has been my preferred editor. It may
be due to its simplicity, its support for a plethora of languages or its vast
extensions marketplace. Nonetheless, it has some flaws. For instance, it is
[not privacy-aware](https://code.visualstudio.com/docs/getstarted/telemetry).

Nonetheless, I couldn't use Visual Studio Code during my `pool` at
[Epitech](https://epitech.eu/), so I needed to use something else. In my quest
for a worthy replacement for Visual Studio Code, I stumbled upon some timeless
editors such as vim and emacs. The former features an extensible, "drop-in" vim
with support for [Lua](https://lua.org/) plugins and a built-in
[LSP client](https://neovim.io/doc/user/lsp.html) update, called
[Neovim](https://neovim.io/).

## Installing Neovim

Grab a package manager of your own choice and install Neovim. Take into
consideration that we will need Neovim `0.8.X` to have everything working
flawlessly. I will use [brew](https://brew.sh/).

```
javii@mbp % brew install neovim
```

Once that's done check the version. The command alias for Neovim is `nvim`.

```
javii@mbp % nvim --version
NVIM v0.8.2
```

## Preparing Neovim

Neovim's default appearance bears a lot of resemblance to Vim's. That is because
they are almost the same! We will use a handy, highly customizable base
configuration called [NvChad](https://nvchad.com), which does the heavy lifting
for us. It already comes with a wide variety of plugins installed for us.

To take advantage of NvChad, you must have a
[NerdFont](https://www.nerdfonts.com/font-downloads) setup for your terminal.
Don't forget to remove `~/.local/share/nvim`, and backup `~/.config/nvim` in
case you already had a configuration setup.

Now, let's install NvChad by running the following command.

```
javii@mbp % git clone https://github.com/NvChad/NvChad ~/.config/nvim --depth 1 && nvim
```

## Configuring Neovim

If we navigate to `~/.config/nvim`, we will see a folder structure like this.

```
javii@mbp % tree ~/.config/nvim
/Users/javii/.config/nvim
├── LICENSE
├── init.lua
├── lua
│   ├── core
│   │   ├── default_config.lua
│   │   ├── init.lua
│   │   ├── lazy_load.lua
│   │   ├── mappings.lua
│   │   ├── options.lua
│   │   └── utils.lua
│   └── plugins
│       ├── configs
│       │   ├── alpha.lua
│       │   ├── cmp.lua
│       │   ├── lspconfig.lua
│       │   ├── mason.lua
│       │   ├── nvimtree.lua
│       │   ├── nvterm.lua
│       │   ├── others.lua
│       │   ├── telescope.lua
│       │   ├── treesitter.lua
│       │   └── whichkey.lua
│       └── init.lua
└── plugin
    └── packer_compiled.lua
```

All the interesting stuff happens in the `lua` folder. The `core` folder has all
the default configurations. We will not directly override this. The `plugins`
folder has all the configurations for the pre-installed plugins.

NvChad has a built-in update system. It pulls the most recent changes from
GitHub and overwrites both the `core` and `plugins` directories. Due to this, we
will create a new directory, `custom`, inside the `lua` directory, in which we
will add our custom configuration.

We will first create an important file, `chadrc.lua`. It is in charge of
overriding NvChad's default config. Here we set `onedark` as our default theme,
and we disable transparency for the background.

```js
local M = {};

M.ui = {
    theme = "onedark",
    transparency = false,
}

M.plugins = require "custom.plugins"

M.mappings = require "custom.mappings"

return M;
```

Let's create some custom mappings for Neovim. To do that, we create
`mappings.lua` in the same folder. The general Object is divided into `i`nsert,
`n`ormal, `t`erminal, e`x` and `v`isual, which are some of Neovim's modes.

```js
local M = {}

M.general = {
  n = {
    [";s"] = { ":wq", "Save and exit", opts = { nowait = true } },
  },
}

return M
```

We mapped the sequence `;s` in the `n`ormal mode to execute the command `wq`,
which writes the file and quits. This is just an example to show how to create
or overwrite already existing mappings by `core/mappings.lua` configuration.

## Adding plugins

NvChad already comes with a wide variety of plugins installed, and it is
extremely easy to add new ones. Create a folder `plugins` inside `custom`, and
add this to `init.lua`. The first entry overrides NvChad's lspconfig, and the
second one adds a new plugin.

```js
return {
    ["neovim/nvim-lspconfig"] = {
        config = function ()
            require "plugins.configs.lspconfig"
            require "custom.plugins.lspconfig"
        end,
    },
    ["andweeb/presence.nvim"] = {
        config = function()
            require("presence"):setup({
                auto_update = true,
                main_image = "file",
                buttons = false,
            })
    },
}
```

Now we need to create `lspconfig.lua` inside the same directory as `init.lua` to
add our custom config, and add the following code. Take into consideration that
you must have the `LSP`s installed via `:MasonInstall <lsp>` inside Neovim.
Check
[this file](https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md)
for all the available `LSP`s, and when installed, add them to the `servers`
variable.

```js
local on_attach = require("plugins.configs.lspconfig").on_attach
local capabilities = require("plugins.configs.lspconfig").capabilities

local lspconfig = require "lspconfig"

local servers = {"hls", "denols", "clangd", "solargraph" }

for _, lsp in ipairs(servers) do
  lspconfig[lsp].setup {
    on_attach = on_attach,
    capabilities = capabilities,
  }
end
```

Once everything is done, your `custom` folder structure should look like this.

```
javii@mbp % tree ~/.config/nvim/lua/custom
/Users/javii/.config/nvim/lua/custom
├── chadrc.lua
├── init.lua
├── mappings.lua
└── plugins
    ├── init.lua
    └── lspconfig.lua
```

In order to finish, run this command to re-compile the new plugins we are using.

```
javii@mbp % nvim +:PackerSync
```

## Wrapping up

Now that we have successfully configured everything, try creating a new file
`main.c` and start typing this, for instance.

```c
#include <stdio.h>

int main(void) {
    printf("Hello %s!\n", "neovim");
    return 0;
}
```

You should see `clang` helping you with the autocomplete! All the key mappings
are located in `~/.config/nvim/lua/core/mappings.lua`, try to take a look and
discover new mappings. You can easily override them.

You will also see some mappings being `<leader>` and some letters. In case of
NvChad, it corresponds to the `space` key. One cool command is `<leader>th`, to
change themes, and `<leader>uu`, to update NvChad. Should you want to delete
NvChad, execute the following commands.

```
javii@mbp % rm -rf ~/.config/nvim
javii@mbp % rm -rf ~/.local/share/nvim
javii@mbp % rm -rf ~/.cache/nvim
```
