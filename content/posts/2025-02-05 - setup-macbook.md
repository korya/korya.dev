---
title: 'Setting up a Mac in 2025'
date: '2025-02-05'
draft: false
tags: ['howto', 'macbook', 'setup']
ShowToc: true
---

It is the time to reset my MacBook again. Last time was in 2024: [Setting up a Mac in 2024](./2024-01-13---setup-macbook.md).

The main plan is as follows:

1. Configure MacOs to my preferred defaults
2. Install [Homebrew](https://brew.sh/)
3. Install basic tools
4. Install my dotfiles from <https://github.com/korya/dotfiles>
5. Install all required tools
6. Install [Tailscale](https://tailscale.com/)
7. Other configurations

## Configure MacOS

### Change MacOS hostname

By default, MacOS sets the hostname to a ridiculous value based on your name.
Something as "Dmitri's MacBook Pro". I prefer to name my machines after latin or
greek gods. Easy to remember and easy to identify them in the office network.

```sh
NEW_HOSTNAME="mercury"
sudo scutil --set ComputerName "${NEW_HOSTNAME}"
sudo scutil --set LocalHostName "${NEW_HOSTNAME}"
```

### Generate SSH Key

Generate SSH key for the machine:

```sh
ssh-keygen -o -a 256 -t ed25519 -C "${USER}@$(hostname -s)-$(date +'%d-%m-%Y')"
```

### MacOS UI Settings

The only changes I make to the default settings are:

- Trackpad:
  - Enable `Tap to click`. I like tapping rather than clicking.

- Dock:
  - Move the dock to the left. The real estate at the center of the screen is very
     precious and hence, I try to free it up for the content that requires my
     attention at this current moment. Dock is very useful and should be available
     fast when needed. But not that important to be at the bottom of the screen.

  - Turn on magnification effect on the Docker and set it to the mid level.

  - Auto-hide the dock. I don't need to see it all the time.

  - Clean it up. Remove all these stock apps from the dock. Keep Finder,
      Launchpad, Safari (later will be replaced with Chrome) and Notes.

- Desktops:
  - Disable `Automatically rearrange Spaces based on most recent use`. I don't
      want to be distracted by the changes in the desktops order.

- Input languages:
  - Open `Keyboard` group then click `Edit` to the right of `Input Sources`:
    - add Russian and Hebrew

- Time format:
  - In `Date & Time`, turn on `24-hour time` and `Show 24-hour time on Lock Screen`

- Shortcuts:
  - On the same screen, `Keyboard`, ensure that 🌐 is set to `Change Input Source`
  - On the same screen, `Keyboard`, click `Keyboard Shortcuts`:
    - In `Modifier Keys`, change Caps Lock to Escape
    - In `Mission Control`, enable shortcuts for switching to Desktops: `^1`, `^2`, etc.

Below are CLI commands suggested by ChatGPT (o3-mini-high):

```sh
#!/bin/bash
# --- Trackpad ---
# Enable "Tap to click" (for both current host and global settings)
defaults write com.apple.AppleMultitouchTrackpad Clicking -bool true
defaults -currentHost write NSGlobalDomain com.apple.mouse.tapBehavior -int 1
defaults write NSGlobalDomain com.apple.mouse.tapBehavior -int 1

# --- Dock ---
# 1. Move the Dock to the left side of the screen
defaults write com.apple.dock orientation -string "left"

# 2. Enable magnification and set the magnification size to a mid-level value (adjust "64" if needed)
defaults write com.apple.dock magnification -bool true
defaults write com.apple.dock largesize -int 64

# 3. Auto-hide the Dock
defaults write com.apple.dock autohide -bool true

# --- Desktops (Spaces) ---
# Disable "Automatically rearrange Spaces based on most recent use"
defaults write com.apple.dock mru-spaces -bool false

# --- Apply Changes ---
# Restart the Dock to immediately apply all the above changes.
killall Dock
```

## Install Homebrew

Homebrew is my default package manager in MacOS.

Follow the instructions at <https://brew.sh/>. At this moment, they are:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then configure Homebrew temporarily:

```sh
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Note: This must be done manually until the dotfiles are installed.

## Install Basic Tools

Basic tools (GBU core utils and other CLI utils):

```sh
brew install coreutils binutils diffutils ed findutils moreutils \
  gawk gnu-indent gnu-sed gnu-tar gnu-which gnutls grep gzip gpg2 \
  watch wdiff gpatch m4 make cmake file-formula \
  bash bash-completion@2 less wget curl socat git openssh python \
  rsync svn unzip tree rename jq just ag fzf zellij gh \
  macvim nvim bat
```

New tools:

- [just](https://github.com/casey/just) is a modern replacement for `make`
- [ag](https://github.com/ggreer/the_silver_searcher) is a super-fast "grep"
- [fzf](https://github.com/junegunn/fzf) is an interactive Unix filter for
   command-line that can be used with any list; files, command history, processes,
   hostnames, bookmarks, git commits, etc. `fzf` stands for fuzzy finder.
   There are infinite ways to use it. Read
   <https://github.com/junegunn/fzf?tab=readme-ov-file#examples> for some insights.
   The most essential use is the integration in your shell:
- [zellij](https://github.com/zellij-org/zellij) is a modern alternative to GNU `screen` and `tmux`
- [bat](https://github.com/sharkdp/bat) is a great substitution for `cat`
   (make sure to add `alias cat=bat`)

## Install my dotfiles

Now that the basic tools are installed (including `git`), the dotfile can be
installed from Github.

My dotfiles are available at <https://github.com/korya/dotfiles>

```sh
cd ~
git init .
git remote add origin https://github.com/korya/dotfiles
git pull origin master
```

Unfortunately, all conflicts need to be resolved manually.

## Install All Required Tools

Install AWS CLI:

```sh
brew install awscli
```

## Install Rerquired Tools

### Producivity Tools

[fzf](https://github.com/junegunn/fzf) is an interactive Unix filter for
command-line that can be used with any list; files, command history, processes,
hostnames, bookmarks, git commits, etc. `fzf` stands for fuzzy finder.

There are infinite ways to use it. Read
<https://github.com/junegunn/fzf?tab=readme-ov-file#examples> for some insights.
The most essential use is the integration in your shell:

- Use `<CTRL-R>` to search command history.
- Use `<CTRL-T>` to find a file.
- Use `[PATTERN]**<TAB>` to run fuzzy completion.

```sh
brew install fzf
# To install useful key bindings and fuzzy completion:
$(brew --prefix)/opt/fzf/install --all
```

[zellij](https://github.com/zellij-org/zellij) is a modern alternative to GNU `screen` and `tmux`:

```sh
brew install zellij
```

### iTerm2

[iTerm2](https://iterm2.com/) is the best terminal emulator available for MacOS
for now.

```sh
brew install --cask iterm2
```

Configure iTerm2:

1. Copy profiles JSON to *Downloads* folder

   ```sh
   cp ~/.korya.d/iTerm2-Profiles.json ~/Downloads/
   ```

2. Import it:
   1. Open *Settings*
   2. Select *Profiles* tab
   3. Click *Other Actions...* dropdown
   4. Then *Import JSON Profiles*
   5. Select the file from *Downloads* folder
   6. Set the imported Default profile as default
   7. Delete the old default profile

### Docker

Docker Desktop
[Docker](https://www.docker.com/) is the easiest and the most reliable way to ship reproducible software:

```sh
brew install --cask docker
brew install docker-credential-helper
```

### IDEs

[MS VSCode](https://code.visualstudio.com/) is used by a lot of people and has a lot of plugins. This is the mainstream IDE today so I install it by default.

But I try to experiment with modern IDEs coming with integrated agentic AI such as [Cursor](https://www.cursor.com/) and [Windsurf](https://codeium.com/windsurf).

```sh
brew install --cask visual-studio-code cursor windsurf
```

Here is a list of great extensions I use (excluding language specific ones):

- [VSCodeVim](https://marketplace.visualstudio.com/items?itemName=vscodevim.vim)
   is a vim emulator
- [Error lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)
   highlights errors in the code. I am not really sure why this is not part of
   the core VSCode.
- [Remote SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
   allows to develop on a remote server via SSH.
- [Modelines](https://marketplace.visualstudio.com/items?itemName=chrislajoie.vscode-modelines)
   allows to configure VSCode via modelines in the files.
- [Github Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) is
   a great tool for generating code. It is not perfect but it is a great help.
- [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)
   is a nice tool for previewing changes inside VSCode. It is also great for
   making basic commits. Unfortunately, I was not able to use it for more
   advanced scenarios requiring rebasing.
- [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter)
   is a great tool for working with Jupyter notebooks.

### Bitwarden

I use [Bitwarden](https://bitwarden.com/) as my password manager. Migrated to it
recently from LastPass and it is great!

```sh
brew install --cask bitwarden
```

## Install Tailscale

[Tailscale](https://tailscale.com/) is one of the best software I've discovered
in the recent years. I've been using it for a very long time. I think that I've
discovered it in some newsletter early on after they made their product
available. I gave it a try and it just worked, and it just made my life so much
easier. I recommend everyone to try it out. It is an amazing product that just
works!

```sh
brew install --cask tailscale
```

Configuration:

1. Grant all required permissions:
   1. Unblock the app in *System Preferences > Security & Privacy > General*
   2. Grant Sharing permissions in *System Preferences > Security & Privacy > Privacy*
2. Login to Tailscale
3. Enable run on start up
4. Configure password-less SSH; e.g.

   ```sh
   cat ~/.ssh/id_rsa.pub | ssh '<YOUR IP>' tee ~/.ssh/authorized_keys
   ```

## Other Configurations

### Git

Recommended default settings for Git:

- `credential.helper=osxkeychain` uses the MacOS KeyChain for storing Git
   credentials.
- `pull.rebase=true` uses git rebase instead of the default git merge when
   pulling from a remote.
- `fetch.prune=true` runs git remote prune on every fetch and will automatically
   delete inaccessible Git objects in your local repository that aren’t on
   remote. In short, all branches and their commits that are merged into master
   on Github gets deleted automatically in your local repo.
- `diff.colorMoved=zebra` uses a different color in git diff for code that just
   moved within a file. This makes it easier to distinguish moved code from
   other changes.

```sh
git config --global credential.helper osxkeychain
git config --global pull.rebase true
git config --global fetch.prune true
git config --global diff.colorMoved zebra
```

### Vim

```sh
vim +PlugInstall +PlugUpgrade +PlugUpdate
```

### NeoVim

```sh
# Start neovim
nvim
# Install and sync all plugins
```

### Upload SSH Key to Github

Then upload the generated SSH key to Github:

1. Open *Settings / SSH and GPG keys* in Github: <https://github.com/settings/keys>
2. Create a new SSH key:
   1. Click *New SSH key*
   2. Enter a title for the new key:

      ```
      awk '{ print "Developer key for " $3 }' ~/.ssh/id_ed25519.pub | pbcopy
      ```

   2. Paste the public key from `~/.ssh/id_ed25519.pub`:

      ```sh
      pbcopy <~/.ssh/id_ed25519.pub
      ```

   3. Click *Add SSH key*

## Last Words

That is it. This environment should be good enough to start.

Something I need to look into in the future:

- Automate the installation of Chrome
- Fully automate the bootstrapping of a new macBook
