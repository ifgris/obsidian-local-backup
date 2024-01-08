import { Notice, Plugin, addIcon } from "obsidian";
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
import { ICON_DATA } from "./constants";
import { NewVersionNotifyModal } from "./modals";

interface LocalBackupPluginSettings {
	versionValue: string;
	startupBackupStatus: boolean;
	lifecycleValue: string;
	backupsPerDayValue: string;
	maxRetriesValue: string;
	retryIntervalValue: string;
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
	showRibbonIcon: boolean;
}

const DEFAULT_SETTINGS: LocalBackupPluginSettings = {
	versionValue: "",
	startupBackupStatus: false,
	lifecycleValue: "3",
	backupsPerDayValue: "3",
	maxRetriesValue: "1",
	retryIntervalValue: "100",
	winSavePathValue: getDefaultPath(),
	unixSavePathValue: getDefaultPath(),
	fileNameFormatValue: getDefaultName(),
	intervalBackupStatus: false,
	backupFrequencyValue: "10",
	callingArchiverStatus: false,
	archiverTypeValue: "sevenZip",
	archiveFileTypeValue: "zip",
	archiverWinPathValue: "",
	archiverUnixPathValue: "",
	showRibbonIcon: true,
};

export default class LocalBackupPlugin extends Plugin {
	settings: LocalBackupPluginSettings;
	intervalId: NodeJS.Timeout | null = null;

	async onload() {
		await this.loadSettings();

		const settingTab = new LocalBackupSettingTab(this.app, this);
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(settingTab);

		// startup notice
		try {
			if (this.settings.versionValue !== this.manifest.version) {
				new NewVersionNotifyModal(this.app, this).open();
				this.saveSettings();
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

		// Add ribbon icon
		if (this.settings.showRibbonIcon){
			addIcon("sidebar-icon", ICON_DATA);
			this.addRibbonIcon("sidebar-icon", "Run local backup", () => {
				new Notice("Running local backup...");
				this.archiveVaultAsync();
			});
		}

		// run startup codes.
		if (this.settings.startupBackupStatus) {
			// await this.backupVaultAsync();
			// await this.archiveVaultAsync();
			await this.archiveVaultAsyncWithRetry();
		}

		await this.applySettings();
	}

	/**
	 * Archive vault with retry method
	 */
	async archiveVaultAsyncWithRetry() {
		const maxRetries = parseInt(this.settings.maxRetriesValue);
		let retryCount = 0;

		const retryInterval = parseInt(this.settings.retryIntervalValue);
	
		while (retryCount < maxRetries) {
			try {
				await this.archiveVaultAsync();
				break;
			} catch (error) {
				// handle errors
				console.error(`Error during archive attempt ${retryCount + 1}: ${error}`);
				retryCount++;
	
				if (retryCount < maxRetries) {
					// customized delay
					await this.delay(retryInterval); // delay
					console.log(`Retrying archive attempt ${retryCount + 1}...`);
				} else {
					// throw exceptions
					console.error(`Failed to create vault backup after ${maxRetries} attempts.`);
					new Notice(`Failed to create vault backup after ${maxRetries} attempts: ${error}`);
				}
			}
		}
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
	 * delay function
	 * @param ms 
	 * @returns 
	 */
	async delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
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
		this.settings.maxRetriesValue = DEFAULT_SETTINGS.maxRetriesValue;
		this.settings.retryIntervalValue = DEFAULT_SETTINGS.retryIntervalValue;
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
