import { Notice, Plugin, MarkdownView, App } from "obsidian";
import { join } from "path";
import { LocalBackupSettingTab } from "./settings";
import {
	replaceDatePlaceholdersWithValues,
	getDefaultPath,
	getDefaultName,
	createFileByArchiver,
	createZipByAdmZip,
	deleteBackupsByLifeCycle,
	deletePerDayBackups
} from "./utils";

interface LocalBackupPluginSettings {
	versionValue: string;
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
	archiveFileTypeValue: string;
	archiverWinPathValue: string;
	archiverUnixPathValue: string;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	versionValue: "",
	startupBackupStatus: false,
	lifecycleValue: "3",
	backupsPerDayValue: "3",
	winSavePathValue: getDefaultPath(),
	unixSavePathValue: getDefaultPath(),
	fileNameFormatValue: getDefaultName(),
	intervalBackupStatus: false,
	backupFrequencyValue: "10",
	callingArchiverStatus: false,
	archiverTypeValue: "sevenZip",
	archiveFileTypeValue: "zip",
	archiverWinPathValue: "",
	archiverUnixPathValue: ""
};

export default class LocalBackupPlugin extends Plugin {
	settings: LocalBackupPluginSettings;
	intervalId: NodeJS.Timeout | null = null;

	async onload() {
		await this.loadSettings();

		// startup notice
		try {
			if (this.settings.versionValue === "") {
				new Notice(`Please recofig \`Local Backup\` after upgrading to ${this.manifest.version}!`, 10000);
			}
		} catch (error) {
			new Notice(`Please recofig \`Local Backup\` after upgrading to ${this.manifest.version}!`, 10000);
		}


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
			let savePathValue = "";
			let archiverPathValue = "";
			if (platform == "win32") {
				savePathValue = this.settings.winSavePathValue;
				archiverPathValue = this.settings.archiverWinPathValue;
			} else if (platform == "linux" || platform == "darwin") {
				savePathValue = this.settings.unixSavePathValue;
				archiverPathValue = this.settings.archiverUnixPathValue;
			}
			// const backupFolderPath = join(parentDir, backupFolderName);
			let backupFilePath = join(savePathValue, backupZipName);

			// call the backup functions
			if (this.settings.callingArchiverStatus) {
				backupFilePath = join(savePathValue, `${fileNameWithDateValues}.${this.settings.archiveFileTypeValue}`);
				await createFileByArchiver(this.settings.archiverTypeValue, archiverPathValue, this.settings.archiveFileTypeValue, vaultPath, backupFilePath);
			}
			else {
				createZipByAdmZip(vaultPath, backupFilePath);
			}

			console.log(`Vault backup created: ${backupFilePath}`);
			new Notice(`Vault backup created: ${backupFilePath}`);

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
		// set current version in data.json
		this.settings.versionValue = this.manifest.version;
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
		this.settings.versionValue = DEFAULT_SETTINGS.versionValue;
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
		this.settings.archiveFileTypeValue = DEFAULT_SETTINGS.archiveFileTypeValue;
		this.settings.archiverWinPathValue = DEFAULT_SETTINGS.archiverWinPathValue;
		this.settings.archiverUnixPathValue = DEFAULT_SETTINGS.archiverUnixPathValue;
		await this.saveSettings();
	}
}
