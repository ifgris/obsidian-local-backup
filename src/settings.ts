import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import LocalBackupPlugin from './main';

export class LocalBackupSettingTab extends PluginSettingTab {
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
			.setName('Backup lifecycle (Days)')
			.setDesc('Set local backup keeping days. (0 -- Infinity)')
			.addText(text => text
				.setValue(this.plugin.settings.lifecycleSetting)
				.onChange(async (value) => {

					// add limits
					const numericValue = parseFloat(value);
					if (isNaN(numericValue) || numericValue < 0) {
						new Notice('Backup lifecycle must be a non-negative number.');
						return;
					}

					this.plugin.settings.lifecycleSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Output path')
			.setDesc('Setup backup storage path.')
			.addText(text => text
				.setValue(this.plugin.settings.savePathSetting)
				.onChange(async (value) => {
					this.plugin.settings.savePathSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Customize file name')
			.setDesc('Customizing zip file name. Default: {vaultName}-Backup')
			.addText(text => text
				.setValue(this.plugin.settings.customizeNameSetting)
				.onChange(async (value) => {
					this.plugin.settings.customizeNameSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Interval backups')
			.setDesc('The switch of interval backups')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.intervalToggleSetting)
				.onChange(async (value) => {
					this.plugin.settings.intervalToggleSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Backup intervals')
			.setDesc('Set interval (minutes).')
			.addText(text => text
				.setValue(this.plugin.settings.intervalValueSetting)
				.onChange(async (value) => {

					// add limits
					const numericValue = parseFloat(value);
					if (isNaN(numericValue) || numericValue <= 0) {
						new Notice('Backup intervals must be a positive number.');
						return;
					}

					this.plugin.settings.intervalValueSetting = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.addButton(btn => btn
				.setTooltip('Apply settings now')
				.setButtonText('Apply settings')
				.onClick(async () => {
					new Notice(`Applying Local Backup settings.`);
					await this.plugin.applySettings();
				})
			);
	}
}
