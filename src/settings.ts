import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import LocalBackupPlugin from "./main";
import "./styles.css";

export class LocalBackupSettingTab extends PluginSettingTab {
	plugin: LocalBackupPlugin;

	constructor(app: App, plugin: LocalBackupPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h3", { text: "General Settings" });

		const ribbonIconDesc = new DocumentFragment();
		ribbonIconDesc.createSpan({
			text: "Show a ribbon icon in the left sidebar.",
		});
		ribbonIconDesc.createDiv({
			text: "Please close and reopen Obsidian for this setting to take effect.",
			cls: "local-backup-text--accent",
		});


		new Setting(containerEl)
			.setName("Show ribbon icon")
			.setDesc(ribbonIconDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showRibbonIcon)
					.onChange(async (value) => {
						this.plugin.settings.showRibbonIcon = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Backup once on startup")
			.setDesc("Run local backup once on Obsidian starts.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.startupBackupStatus)
					.onChange(async (value) => {
						this.plugin.settings.startupBackupStatus = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Backup history length (days)")
			.setDesc(
				"Specify the number of days backups should be retained. (0 -- Infinity)"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.lifecycleValue)
					.onChange(async (value) => {
						// add limits
						const numericValue = parseFloat(value);
						if (isNaN(numericValue) || numericValue < 0) {
							new Notice(
								"Backup lifecycle must be a non-negative number."
							);
							return;
						}
						this.plugin.settings.lifecycleValue = value;
						await this.plugin.saveSettings();
					})
			);
		
		new Setting(containerEl)
			.setName("Backups per day")
			.setDesc(
				"Specify the number of backups per day to keep. (0 -- Infinity)"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.backupsPerDayValue)
					.onChange(async (value) => {
						// add limits
						const numericValue = parseFloat(value);
						if (isNaN(numericValue) || numericValue < 0) {
							new Notice(
								"Backups per day must be a non-negative number."
							);
							return;
						}
						this.plugin.settings.backupsPerDayValue = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Windows output path (optional)")
			.setDesc("Setup a Windows backup storage path. eg. D:\\documents\\Obsidian")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.winSavePathValue)
					.onChange(async (value) => {
						this.plugin.settings.winSavePathValue = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Linux/MacOS output path (optional)")
			.setDesc("Setup a Unix backup storage path. eg. /home/user/Documents/Obsidian")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.unixSavePathValue)
					.onChange(async (value) => {
						this.plugin.settings.unixSavePathValue = value;
						await this.plugin.saveSettings();
					})
			);

		const fileNameFragment = document.createDocumentFragment();
		fileNameFragment.createDiv({
			text: "Name of the backup ZIP file.",
		});
		fileNameFragment.createEl("br");
		fileNameFragment.createDiv({
			text: "You may use date placeholders to add date and time.",
		});
		fileNameFragment.createDiv({
			text: "%Y for year",
		});
		fileNameFragment.createDiv({
			text: "%m for month",
		});
		fileNameFragment.createDiv({
			text: "%d for day",
		});
		fileNameFragment.createDiv({
			text: "%H for hour",
		});
		fileNameFragment.createDiv({
			text: "%M for minute",
		});
		fileNameFragment.createDiv({
			text: "%S for second",
		});
		fileNameFragment.createEl("br");
		fileNameFragment.createDiv({
			text: "Default: {vaultName}-Backup-%Y_%m_%d-%H_%M_%S",
		});

		new Setting(containerEl)
			.setName("File name")
			.setDesc(fileNameFragment)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.fileNameFormatValue)
					.onChange(async (value) => {
						this.plugin.settings.fileNameFormatValue = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Interval backups")
			.setDesc("Enable to create backups at regular intervals")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.intervalBackupStatus)
					.onChange(async (value) => {
						this.plugin.settings.intervalBackupStatus = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Backup frequency (minutes)")
			.setDesc("Set the frequency of backups in minutes.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.backupFrequencyValue)
					.onChange(async (value) => {
						// add limits
						const numericValue = parseFloat(value);
						if (isNaN(numericValue) || numericValue <= 0) {
							new Notice(
								"Backup intervals must be a positive number."
							);
							return;
						}
						else{
							this.plugin.settings.backupFrequencyValue = value;
							await this.plugin.saveSettings();
							await this.plugin.applySettings();
						}
					})
			);
		
		new Setting(containerEl)
			.setName("Retry times")
			.setDesc("Set the retry times after backup failed.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.maxRetriesValue)
					.onChange(async (value) => {
						// add limits
						const numericValue = parseFloat(value);
						if (isNaN(numericValue) || numericValue <= 0) {
							new Notice(
								"Retry times must be a positive number."
							);
							return;
						}
						else{
							this.plugin.settings.maxRetriesValue = value;
							await this.plugin.saveSettings();
							await this.plugin.applySettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Retry interval (ms)")
			.setDesc("Set the retry interval (millisecond).")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.retryIntervalValue)
					.onChange(async (value) => {
						// add limits
						const numericValue = parseFloat(value);
						if (isNaN(numericValue) || numericValue <= 0) {
							new Notice(
								"Backup intervals must be a positive number."
							);
							return;
						}
						else{
							this.plugin.settings.retryIntervalValue = value;
							await this.plugin.saveSettings();
							await this.plugin.applySettings();
						}
					})
			);
		
		containerEl.createEl("h3", { text: "File Archiver Settings (Optional)" });

		new Setting(containerEl)
			.setName("Backup by Calling external file archiver")
			.setDesc("If toggled, backups will be created by calling external file archiver.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.callingArchiverStatus)
					.onChange(async (value) => {
						this.plugin.settings.callingArchiverStatus = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Select file archiver")
			.setDesc("The selected archiver must be installed. eg. 7-Zip for Windows, 7-Zip/p7zip for Unix")
			.addDropdown((dropDown) =>{
				dropDown
				.addOption("sevenZip", "7-Zip")
				.addOption("winRAR", "WinRAR")
				.addOption("bandizip", "bandizip")
				.setValue(this.plugin.settings.archiverTypeValue)
				.onChange(async (value) =>	{
					this.plugin.settings.archiverTypeValue = value;
					await this.plugin.saveSettings();
				});
			});
		
		new Setting(containerEl)
			.setName("Select archive file type")
			.addDropdown((dropDown) =>{
				dropDown
				.addOption("zip", "zip")
				.addOption("7z", "7z")
				.addOption("rar", "rar")
				.setValue(this.plugin.settings.archiveFileTypeValue)
				.onChange(async (value) =>	{
					this.plugin.settings.archiveFileTypeValue = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("File archiver path (Win)")
			.setDesc("Full path of Archiver. eg. D:\\software\\7-Zip\\7z.exe for Windows. Using bz.exe (Bandizip) for Windows is recommended.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.archiverWinPathValue)
					.onChange(async (value) => {
						this.plugin.settings.archiverWinPathValue = value;
						await this.plugin.saveSettings();
					})
			);
		
		new Setting(containerEl)
			.setName("File archiver path (Unix)")
			.setDesc("Full path of Archiver. eg. /usr/bin/7z or 7z for Unix.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.archiverUnixPathValue)
					.onChange(async (value) => {
						this.plugin.settings.archiverUnixPathValue = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.addButton(btn => btn
				.setTooltip("Restore defaults")
				.setButtonText("Restore defaults")
				.onClick(async () => {
					await this.plugin.restoreDefault();
					new Notice("Settings restored to default.");
				})
			);
	}
}
