# Local Backup

![GitHub](https://img.shields.io/github/license/cgcel/obsidian-local-backup)

Automatically creates a local backup of the vault.

## Features

- Backup on startup
- Setup backups'lifecycle
- Setup custom output path

## Installation

### Install from plugin store

- Search `Local Backup` at Obsidian Community Plugins and install it.
- Enable `Local Backup`.

### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

## Contribution

### Build

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Todo

- [x] Backup on startup.
- [ ] Archive the backup dictionary to save disk memory.
- [x] Customize the backup lifecycle.
- [x] Customize the backup storage path.
- [x] Add a command to create a backup.

## License

**Obsidian Local Backup** is licensed under the MIT license. Refer to [LICENSE](https://github.com/cgcel/obsidian-local-backup/blob/master/LICENSE) for more information.
