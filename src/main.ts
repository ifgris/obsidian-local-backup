import { Notice, Plugin } from "obsidian";
import { join } from "path";
import * as path from "path";
import * as fs from "fs-extra";
import AdmZip from "adm-zip";
import { LocalBackupSettingTab } from "./settings";
import {
	getDatePlaceholdersForISO,
	replaceDatePlaceholdersWithValues,
} from "./utils";
import { exec } from "child_process";

interface LocalBackupPluginSettings {
	startupSetting: boolean;
	lifecycleSetting: string;
	backupsPerDaySetting: string;
	winSavePathSetting: string;
	unixSavePathSetting: string;
	customizeNameSetting: string;
	intervalToggleSetting: boolean;
	intervalValueSetting: string;
	sevenZipBackupToggleSetting: boolean;
	sevenZipPathSetting: string;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	startupSetting: false,
	lifecycleSetting: "3",
	backupsPerDaySetting: "3",
	winSavePathSetting: getDefaultPath(),
	unixSavePathSetting: getDefaultPath(),
	customizeNameSetting: getDefaultName(),
	intervalToggleSetting: false,
	intervalValueSetting: "10",
	sevenZipBackupToggleSetting: false,
	sevenZipPathSetting: ""
};

export default class LocalBackupPlugin extends Plugin {
	settings: LocalBackupPluginSettings;
	intervalId: NodeJS.Timeout | null = null;

	async onload() {
		await this.loadSettings();

		// this.app.workspace.on('window-close', await this.backupRepository.bind(this));

		// Run local backup command
		this.addCommand({
			id: "run-local-backup",
			name: "Run local backup",
			callback: async () => {
				// this.backupVaultAsync();
				await this.archiveVaultAsync();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LocalBackupSettingTab(this.app, this));

		// run startup codes.
		if (this.settings.startupSetting) {
			// await this.backupVaultAsync();
			await this.archiveVaultAsync();
		}

		await this.applySettings();
	}

	/**
	 * Archive vault method
	 */
	async archiveVaultAsync() {
		try {
			await this.loadSettings();

			const fileName = this.settings.customizeNameSetting;
			// const backupFolderName = `${vaultName}-Backup-${currentDate}`;
			const fileNameWithDateValues =
				replaceDatePlaceholdersWithValues(fileName);
			const backupZipName = `${fileNameWithDateValues}.zip`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const os = require("os");
			const platform = os.platform();
			let savePathSetting = "";
			if (platform == "win32") {
				savePathSetting = this.settings.winSavePathSetting;
			} else if (platform == "linux" || platform == "darwin") {
				savePathSetting = this.settings.unixSavePathSetting;
			}
			// const backupFolderPath = join(parentDir, backupFolderName);
			const backupZipPath = join(savePathSetting, backupZipName);

			// call the backup functions
			if (this.settings.sevenZipBackupToggleSetting) {
				await createZipBySevenZip(this.settings.sevenZipPathSetting, vaultPath, backupZipPath);
			}
			else {
				createZipByAdmZip(vaultPath, backupZipPath);
			}

			new Notice(`Vault backup created: ${backupZipPath}`);

			// call the auto delete function to delete backups
			autoDeleteBackups(
				this.settings.winSavePathSetting,
				this.settings.unixSavePathSetting,
				this.settings.customizeNameSetting,
				this.settings.lifecycleSetting,
				this.settings.backupsPerDaySetting)

		} catch (error) {
			new Notice(`Failed to create vault backup: ${error}`);
			console.log(error);
		}
	}

	/**
	 * Start an interval to run archiveVaultAsync method at regular intervals
	 * @param intervalMinutes The interval in minutes
	 */
	async startAutoBackupInterval(intervalMinutes: number) {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}

		this.intervalId = setInterval(async () => {
			await this.archiveVaultAsync();
		}, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

		new Notice(
			`Auto backup interval started: Running every ${intervalMinutes} minutes.`
		);
	}

	/**
	 * Stop the auto backup interval
	 */
	stopAutoBackupInterval() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
			new Notice("Auto backup interval stopped.");
		}
	}

	async onunload() {
		console.log("Local Backup unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Apply settings
	 */
	async applySettings() {
		// load settings
		await this.loadSettings();

		// Start the interval if intervalToggleSetting is true and intervalValueSetting is a valid number
		if (
			this.settings.intervalToggleSetting &&
			!isNaN(parseInt(this.settings.intervalValueSetting))
		) {
			const intervalMinutes = parseInt(
				this.settings.intervalValueSetting
			);
			await this.startAutoBackupInterval(intervalMinutes);
		} else if (!this.settings.intervalToggleSetting) {
			this.stopAutoBackupInterval();
		}
	}

	/**
	 * Restore default settings
	 */
	async restoreDefault() {
		this.settings.startupSetting = DEFAULT_SETTINGS.startupSetting;
		this.settings.lifecycleSetting = DEFAULT_SETTINGS.lifecycleSetting;
		this.settings.backupsPerDaySetting = DEFAULT_SETTINGS.backupsPerDaySetting;
		this.settings.winSavePathSetting = DEFAULT_SETTINGS.winSavePathSetting;
		this.settings.unixSavePathSetting = DEFAULT_SETTINGS.unixSavePathSetting;
		this.settings.customizeNameSetting = DEFAULT_SETTINGS.customizeNameSetting;
		this.settings.intervalToggleSetting = DEFAULT_SETTINGS.intervalToggleSetting;
		this.settings.intervalValueSetting = DEFAULT_SETTINGS.intervalValueSetting;
		this.settings.sevenZipBackupToggleSetting = DEFAULT_SETTINGS.sevenZipBackupToggleSetting;
		this.settings.sevenZipPathSetting = DEFAULT_SETTINGS.sevenZipPathSetting;
		await this.saveSettings();
	}
}

/**
 * Get path of current vault
 * @returns
 */
function getDefaultPath(): string {
	const defaultPath = path.dirname((this.app.vault.adapter as any).basePath);
	// this.settings.savePathSetting = defaultPath
	return defaultPath;
}

/**
 * Get default backup name
 * @returns
 */
function getDefaultName(): string {
	const vaultName = this.app.vault.getName();
	const defaultDatePlaceholders = getDatePlaceholdersForISO(true);
	return `${vaultName}-Backup-${defaultDatePlaceholders}`;
}

/**
 * Auto delete backups
 * @param winSavePathSetting 
 * @param unixSavePathSetting 
 * @param customizeNameSetting 
 * @param lifecycleSetting 
 * @param backupsPerDaySetting 
 * @returns 
 */
function autoDeleteBackups(
	winSavePathSetting: string, 
	unixSavePathSetting: string, 
	customizeNameSetting: string, 
	lifecycleSetting: string, 
	backupsPerDaySetting: string) {
	console.log("Run auto delete method");

	const currentDate = new Date();
	currentDate.setDate(currentDate.getDate() - parseInt(lifecycleSetting));

	// select save path depending on platform
	const os = require("os");
	const platform = os.platform();
	let savePathSetting = "";
	if (platform == "win32") {
		savePathSetting = winSavePathSetting;
	} else if (platform == "linux" || platform == "darwin") {
		savePathSetting = unixSavePathSetting;
	}

	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		// delete backups to match lifecycleSetting
		if (parseInt(lifecycleSetting) != 0) {
			files.forEach((file) => {
				// console.log(file);
				const filePath = path.join(savePathSetting, file);
				const stats = fs.statSync(filePath);
				const fileNameRegex = generateRegexFromCustomPattern(customizeNameSetting)
				const matchFileName = file.match(fileNameRegex);
				// console.log(matchFileName)
				if (stats.isFile() && matchFileName != null) {
	
					const stats = fs.statSync(filePath);
					const parseTime = stats.birthtime;
					const createDate = new Date(parseTime.getFullYear(), parseTime.getMonth(), parseTime.getDate());
					if (createDate < currentDate) {
						fs.remove(filePath);
					}
				}
			});
		}

		// delete daily backups to match backupsPerDaySetting
		if (parseInt(backupsPerDaySetting) != 0) {
			console.log(backupsPerDaySetting);
			const backupFiles = files.filter((file) => {
				const filePath = path.join(savePathSetting, file);
				const stats = fs.statSync(filePath);
				const fileNameRegex = generateRegexFromCustomPattern(customizeNameSetting);
				const matchFileName = file.match(fileNameRegex);
				return stats.isFile() && matchFileName !== null;
			});
	
			// Sort backup files by creation date (oldest to newest)
			backupFiles.sort((a, b) => {
				const filePathA = path.join(savePathSetting, a);
				const filePathB = path.join(savePathSetting, b);
				const statsA = fs.statSync(filePathA);
				const statsB = fs.statSync(filePathB);
				return statsA.birthtime.getTime() - statsB.birthtime.getTime();
			});
	
			// Delete excess backup files
			const excessBackupsCount = backupFiles.length - parseInt(backupsPerDaySetting);
			if (excessBackupsCount > 0) {
				for (let i = 0; i < excessBackupsCount; i++) {
					const filePath = path.join(savePathSetting, backupFiles[i]);
					fs.remove(filePath, (err) => {
						if (err) {
							console.error(`Failed to remove backup file: ${filePath}`, err);
						} else {
							console.log(`Backup file removed: ${filePath}`);
						}
					});
				}
			}
		}
	});
}

/**
 * Generate regex from custom pattern,
 * @param customPattern 
 * @returns 
 */
function generateRegexFromCustomPattern(customPattern: string): RegExp {
	// Replace placeholders like %Y, %m, etc. with corresponding regex patterns
	const regexPattern = customPattern
		.replace(/%Y/g, '\\d{4}') // Year
		.replace(/%m/g, '\\d{2}') // Month
		.replace(/%d/g, '\\d{2}') // Day
		.replace(/%H/g, '\\d{2}') // Hour
		.replace(/%M/g, '\\d{2}') // Minute
		.replace(/%S/g, '\\d{2}'); // Second

	// Create a regular expression to match the custom pattern
	return new RegExp(regexPattern);
}

/**
 * Create zip file by adm-zip
 * @param vaultPath 
 * @param backupZipPath 
 */
function createZipByAdmZip(vaultPath: string, backupZipPath: string) {
	// const AdmZip = require("adm-zip");
	const zip = new AdmZip();
	zip.addLocalFolder(vaultPath);
	zip.writeZip(backupZipPath);
}

/**
 * Create zip file by 7-Zip
 * @param sevenZipPath 
 * @param vaultPath 
 * @param backupZipPath 
 * @returns 
 */
async function createZipBySevenZip(sevenZipPath: string, vaultPath: string, backupZipPath: string) {
	return new Promise<void>((resolve, reject) => {
		const command = `"${sevenZipPath}" a "${backupZipPath}" "${vaultPath}"`;

		exec(command, (error, stdout, stderr) => {
			if (error) {
				console.error("Failed to create zip file by 7-Zip:", error);
				reject(error);
			} else {
				console.log("Zip file created by 7-Zip successfully.");
				resolve();
			}
		});
	});
}