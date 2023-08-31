import { Notice, Plugin } from 'obsidian';
import { join } from 'path';
import * as path from 'path';
import { copy } from 'fs-extra';
import { mkdir } from 'fs';


export default class AutoBackupOnClosePlugin extends Plugin {
	async onload() {
		// console.log('loading plugin')
		// this.app.workspace.on('ready', this.backupRepository.bind(this));
		await this.backupRepository();
	}

	async backupRepository() {
		try {
			const vaultName = this.app.vault.getName();
			const currentDate = new Date().toISOString().split('T')[0];
			const backupFolderName = `${vaultName}-Backup-${currentDate}`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const parentDir = path.dirname(vaultPath);
			const backupFolderPath = join(parentDir, backupFolderName);
			console.log(backupFolderPath);

			mkdir(backupFolderPath, { recursive: true }, (err) => {
				if (err) {
				  console.error('Failed to create directory:', err);
				} else {
				  console.log('Directory created successfully');
				}
			  });
			await copy(vaultPath, backupFolderPath);

			new Notice(`Repository backup created: ${backupFolderName}`);
		} catch (error) {
			new Notice(`Failed to create repository backup: ${error}`);
			console.log(error);
		}
	}

	onunload() {
		console.log('Backup plugin unloaded');
	}
}
