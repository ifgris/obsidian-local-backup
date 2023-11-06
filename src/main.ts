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
	startupBackupStatus: boolean;
	lifecycleValue: string;
	backupsPerDayValue: string;
	winSavePathValue: string;
	unixSavePathValue: string;
	fileNameFormatValue: string;
	intervalBackupStatus: boolean;
	backupFrequencyValue: string;
	callingArchiverStatus: boolean;
	archiverTypeValue: string;
	archiverPathValue: string;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	startupBackupStatus: false,
	lifecycleValue: "3",
	backupsPerDayValue: "3",
	winSavePathValue: getDefaultPath(),
	unixSavePathValue: getDefaultPath(),
	fileNameFormatValue: getDefaultName(),
	intervalBackupStatus: false,
	backupFrequencyValue: "10",
	callingArchiverStatus: false,
	archiverTypeValue: "",
	archiverPathValue: ""
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
		if (this.settings.startupBackupStatus) {
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

			const fileName = this.settings.fileNameFormatValue;
			// const backupFolderName = `${vaultName}-Backup-${currentDate}`;
			const fileNameWithDateValues =
				replaceDatePlaceholdersWithValues(fileName);
			const backupZipName = `${fileNameWithDateValues}.zip`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const os = require("os");
			const platform = os.platform();
			let savePathSetting = "";
			if (platform == "win32") {
				savePathSetting = this.settings.winSavePathValue;
			} else if (platform == "linux" || platform == "darwin") {
				savePathSetting = this.settings.unixSavePathValue;
			}
			// const backupFolderPath = join(parentDir, backupFolderName);
			const backupZipPath = join(savePathSetting, backupZipName);

			// call the backup functions
			if (this.settings.callingArchiverStatus) {
				await createZipByArchiver(this.settings.archiverTypeValue, this.settings.archiverPathValue, vaultPath, backupZipPath);
			}
			else {
				createZipByAdmZip(vaultPath, backupZipPath);
			}

			new Notice(`Vault backup created: ${backupZipPath}`);

			// run deleteBackupsByLifeCycle
			deleteBackupsByLifeCycle(
				this.settings.winSavePathValue,
				this.settings.unixSavePathValue,
				this.settings.fileNameFormatValue,
				this.settings.lifecycleValue);

			// run deletePerDayBackups
			deletePerDayBackups(
				this.settings.winSavePathValue,
				this.settings.unixSavePathValue,
				this.settings.fileNameFormatValue,
				this.settings.backupsPerDayValue);

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
			this.settings.intervalBackupStatus &&
			!isNaN(parseInt(this.settings.backupFrequencyValue))
		) {
			const intervalMinutes = parseInt(
				this.settings.backupFrequencyValue
			);
			await this.startAutoBackupInterval(intervalMinutes);
		} else if (!this.settings.intervalBackupStatus) {
			this.stopAutoBackupInterval();
		}
	}

	/**
	 * Restore default settings
	 */
	async restoreDefault() {
		this.settings.startupBackupStatus = DEFAULT_SETTINGS.startupBackupStatus;
		this.settings.lifecycleValue = DEFAULT_SETTINGS.lifecycleValue;
		this.settings.backupsPerDayValue = DEFAULT_SETTINGS.backupsPerDayValue;
		this.settings.winSavePathValue = DEFAULT_SETTINGS.winSavePathValue;
		this.settings.unixSavePathValue = DEFAULT_SETTINGS.unixSavePathValue;
		this.settings.fileNameFormatValue = DEFAULT_SETTINGS.fileNameFormatValue;
		this.settings.intervalBackupStatus = DEFAULT_SETTINGS.intervalBackupStatus;
		this.settings.backupFrequencyValue = DEFAULT_SETTINGS.backupFrequencyValue;
		this.settings.callingArchiverStatus = DEFAULT_SETTINGS.callingArchiverStatus;
		this.settings.archiverTypeValue = DEFAULT_SETTINGS.archiverTypeValue;
		this.settings.archiverPathValue = DEFAULT_SETTINGS.archiverPathValue;
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
 * Delete backups by lifecycleSetting
 * @param winSavePath
 * @param unixSavePath
 * @param fileNameFormat 
 * @param lifecycle 
 * @returns 
 */
function deleteBackupsByLifeCycle(
	winSavePath: string,
	unixSavePath: string,
	fileNameFormat: string,
	lifecycle: string,
) {
	console.log("Run deleteBackupsByLifeCycle");

	const os = require("os");
	const platform = os.platform();
	let savePathSetting = "";

	if (platform === "win32") {
		savePathSetting = winSavePath;
	} else if (platform === "linux" || platform === "darwin") {
		savePathSetting = unixSavePath;
	}

	const currentDate = new Date();

	// calculate the target date
	if (parseInt(lifecycle) !== 0) {
		currentDate.setDate(currentDate.getDate() - parseInt(lifecycle));
	}

	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		// lifecycleSetting
		if (parseInt(lifecycle) !== 0) {
			files.forEach((file) => {
				const filePath = path.join(savePathSetting, file);
				const stats = fs.statSync(filePath);
				const fileNameRegex = generateRegexFromCustomPattern(fileNameFormat);
				const matchFileName = file.match(fileNameRegex);

				if (stats.isFile() && matchFileName !== null) {
					const parseTime = stats.mtime;
					const createDate = new Date(parseTime.getFullYear(), parseTime.getMonth(), parseTime.getDate());

					if (createDate < currentDate) {
						fs.remove(filePath);
						console.log(`Backup removed by deleteBackupsByLifeCycle: ${filePath}`);
					}
				}
			});
		}
	});
}

/**
 * Delete backups by backupsPerDayValue
 * @param winSavePath
 * @param unixSavePath 
 * @param fileNameFormat 
 * @param backupsPerDay 
 */
function deletePerDayBackups(
	winSavePath: string,
	unixSavePath: string,
	fileNameFormat: string,
	backupsPerDay: string
) {
	console.log("Run deletePerDayBackups");

	const os = require("os");
	const platform = os.platform();
	let savePathSetting = "";

	if (platform === "win32") {
		savePathSetting = winSavePath;
	} else if (platform === "linux" || platform === "darwin") {
		savePathSetting = unixSavePath;
	}

	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const fileNameRegex = generateRegexFromCustomPattern(fileNameFormat);

		const backupFiles = files.filter((file) => {
			const filePath = path.join(savePathSetting, file);
			const stats = fs.statSync(filePath);
			const matchFileName = file.match(fileNameRegex);

			return stats.isFile() && matchFileName !== null;
		});

		const todayBackupFiles = backupFiles.filter((file) => {
			const filePath = path.join(savePathSetting, file);
			const stats = fs.statSync(filePath);
			const parseTime = stats.mtime;
			const createDate = new Date(parseTime.getFullYear(), parseTime.getMonth(), parseTime.getDate());

			return createDate.getTime() === currentDate.getTime();
		});

		if (todayBackupFiles.length > parseInt(backupsPerDay)) {
			const filesToDelete = todayBackupFiles.slice(0, todayBackupFiles.length - parseInt(backupsPerDay));

			filesToDelete.forEach((file) => {
				const filePath = path.join(savePathSetting, file);
				fs.remove(filePath, (err) => {
					if (err) {
						console.error(`Failed to remove backup file: ${filePath}`, err);
					} else {
						console.log(`Backup removed by deletePerDayBackups: ${filePath}`);
					}
				});
			});
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
 * Create zip file by external archiver
 * @param archiverType 
 * @param archiverPath 
 * @param vaultPath 
 * @param backupZipPath 
 * @returns 
 */
async function createZipByArchiver(archiverType: string, archiverPath: string, vaultPath: string, backupZipPath: string) {

	switch (archiverType) {
		case "sevenZip":
			const promise = new Promise<void>((resolve, reject) => {
				const command = `"${archiverPath}" a "${backupZipPath}" "${vaultPath}"`;
		
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
			return promise;

		default:
			break;
	}
	
}