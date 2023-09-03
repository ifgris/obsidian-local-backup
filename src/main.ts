import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { join } from 'path';
import * as path from 'path';
import { copy } from 'fs-extra';
import { mkdir } from 'fs';
import * as fs from 'fs';


interface LocalBackupPluginSettings {
	startupSetting: boolean;
	lifecycleSetting: string;
	savePathSetting: string;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	startupSetting: false,
	lifecycleSetting: '3',
	savePathSetting: getDefaultPath()
}

export default class LocalBackupPlugin extends Plugin {
	settings: LocalBackupPluginSettings;

	async onload() {
		await this.loadSettings();

		// console.log('loading plugin')
		// this.app.workspace.on('window-close', await this.backupRepository.bind(this));
		// await this.backupVaultAsync();

		// Run local backup command
		this.addCommand({
			id: 'run-local-backup',
			name: 'Run local backup',
			callback: () => {
				this.backupVaultAsync();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LocalBackupSettingTab(this.app, this));
	}

	async backupVaultAsync() {
		try {
			const vaultName = this.app.vault.getName();
			const currentDate = new Date().toISOString().split('T')[0];
			const backupFolderName = `${vaultName}-Backup-${currentDate}`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const parentDir = this.settings.savePathSetting;
			const backupFolderPath = join(parentDir, backupFolderName);
			// console.log(backupFolderPath);

			mkdir(backupFolderPath, { recursive: true }, (err) => {
				if (err) {
					console.error('Failed to create directory:', err);
				} else {
					console.log('Directory created successfully');
				}
			});
			// const copy = require("fs-extra")
			await copy(vaultPath, backupFolderPath); // copy vault to target path

			new Notice(`Vault backup created: ${backupFolderPath}`);
		} catch (error) {
			new Notice(`Failed to create vault backup: ${error}`);
			console.log(error);
		}
	}

	async archiveVaultAsync() {
		try {
			// ...
		} catch (error) {
			new Notice(`Failed to create repository backup: ${error}`);
			console.log(error);
		}
	}

	async onunload() {
		console.log('Local Backup unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// run startup codes.
		if (this.settings.startupSetting) {
			await this.backupVaultAsync();
		}

		// run auto delete method
		autoDeleteBackups(this.settings.savePathSetting, this.settings.lifecycleSetting)
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LocalBackupSettingTab extends PluginSettingTab {
	plugin: LocalBackupPlugin;

	constructor(app: App, plugin: LocalBackupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Backup once on startup')
			.setDesc('Run local backup once on Obsidian starts.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.startupSetting)
				.onChange(async (value) => {
					this.plugin.settings.startupSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Backups lifecycle')
			.setDesc('Set local backup kepping days.')
			.addText(toggle => toggle
				.setValue(this.plugin.settings.lifecycleSetting)
				.onChange(async (value) => {
					this.plugin.settings.lifecycleSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Output path')
			.setDesc('Setup backup storage path.')
			.addText(toggle => toggle
				.setValue(this.plugin.settings.savePathSetting)
				.onChange(async (value) => {
					this.plugin.settings.savePathSetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

/**
 * get path of current vault
 * @returns 
 */
function getDefaultPath(): string {
	const defaultPath = path.dirname((this.app.vault.adapter as any).basePath)
	// this.settings.savePathSetting = defaultPath
	return defaultPath;
}

/**
 * auto delete backups
 */
function autoDeleteBackups(savePathSetting: string, lifecycleSetting: string) {

	console.log('Run auto delete method')
	const vaultName = this.app.vault.getName();
	const currentDate = new Date();
	currentDate.setDate(currentDate.getDate() - parseInt(lifecycleSetting));

	// the vault backup naming template
	const vaultBackupDirFormat = `${vaultName}-Backup-`

	// deleting backups before the lifecycle
	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		files.forEach((file) => {
			console.log(file)
			const folderPath = path.join(savePathSetting, file);
			const stats = fs.statSync(folderPath);

			if (stats.isDirectory() && file.contains(vaultBackupDirFormat)) {
				const datePart = file.replace('TestVault-Backup-', '');
				console.log(`backupDate: ${datePart}`)
				const parsedDate = new Date(datePart);

				if (parsedDate < currentDate){
					fs.rmdir(folderPath, { recursive: true }, (err) => {
						if (err) {
							console.error(err);
						} else {
							console.log(`Deleted folder: ${folderPath}`);
						}
					});
				}

			}
		});
	});

}

