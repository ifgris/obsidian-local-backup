import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { join } from 'path';
import * as path from 'path';
import { copy } from 'fs-extra';
import { mkdir } from 'fs';


interface LocalBackupPluginSettings {
	startupSetting: boolean;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	startupSetting: false
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
			const parentDir = path.dirname(vaultPath);
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

			new Notice(`Repository backup created: ${backupFolderPath}`);
		} catch (error) {
			new Notice(`Failed to create repository backup: ${error}`);
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
		if (this.settings.startupSetting){
			await this.backupVaultAsync();
		}
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
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Backup once on startup')
			.setDesc('Run local backup once on Obsidian starts.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.startupSetting)
				.onChange(async (value) => {
					this.plugin.settings.startupSetting = value;
					await this.plugin.saveSettings();
					// await this.plugin.saveData(this.plugin.settings);
				}));
	}
}
