import { Notice, Plugin } from 'obsidian';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LocalBackupSettingTab } from './settings';


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

		// this.app.workspace.on('window-close', await this.backupRepository.bind(this));

		// Run local backup command
		this.addCommand({
			id: 'run-local-backup',
			name: 'Run local backup',
			callback: async () => {
				// this.backupVaultAsync();
				await this.archiveVaultAsync();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LocalBackupSettingTab(this.app, this));
	}

	/**
	 * Archive vault method
	 */
	async archiveVaultAsync() {
		try {
			const vaultName = this.app.vault.getName();
			const currentDate = new Date().toISOString().split('T')[0];
			// const backupFolderName = `${vaultName}-Backup-${currentDate}`;
			const backupZipName = `${vaultName}-Backup-${currentDate}.zip`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const parentDir = this.settings.savePathSetting;
			// const backupFolderPath = join(parentDir, backupFolderName);
			const backupZipPath = join(parentDir, backupZipName);

			const AdmZip = require("adm-zip");
			const zip = new AdmZip();
			zip.addLocalFolder(vaultPath);
			zip.writeZip(backupZipPath);
			new Notice(`Vault backup created: ${backupZipPath}`);
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
			// await this.backupVaultAsync();
			await this.archiveVaultAsync();
		}

		// run auto delete method
		autoDeleteBackups(this.settings.savePathSetting, this.settings.lifecycleSetting)
	}

	async saveSettings() {
		await this.saveData(this.settings);
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

	if (parseInt(lifecycleSetting) == 0) {
		return;
	}

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
			const filePath = path.join(savePathSetting, file);
			const stats = fs.statSync(filePath);

			if (stats.isFile() && file.contains(vaultBackupDirFormat)) {
				const regex = /(\d{4}-\d{2}-\d{2})/;
				const match = file.match(regex);

				if (match && match.length > 1) {
					const dateStr = match[1];
					console.log(dateStr);

					const parsedDate = new Date(dateStr);
	
					if (parsedDate < currentDate) {
						fs.remove(filePath);
					}
				} else {
					console.log("DateStr Not Found.");
				}
			}
		});
	});

}
