import { Notice, Plugin } from 'obsidian';
import { createWriteStream } from 'fs';
import { join } from 'path';
import * as path from 'path';
// import { Archiver } from 'archiver';
// import * as archiver from 'archiver';

new Notice('Hello, you!');

export default class AutoBackupOnClosePlugin extends Plugin {
	onload() {
		console.log('loading plugin')
		this.app.workspace.on('file-open', this.handleWindowClose.bind(this));
	}

	handleWindowClose() {
		try {
			const vaultName = this.app.vault.getName();
			const currentDate = new Date().toISOString().split('T')[0];
			const zipFileName = `${vaultName}-${currentDate}.zip`;
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const parentDir = path.dirname(vaultPath);
			console.log(join(parentDir, zipFileName));

			const output = createWriteStream(join(parentDir, zipFileName));
			const archiver = require('archiver');
			const archive = archiver('zip', {
				zlib: { level: 9 }
			});

			archive.pipe(output);
			archive.directory(vaultPath, false);
			archive.finalize();

			new Notice(`Vault backup created: ${zipFileName}`);
		} catch (error) {
			new Notice(`Failed to create vault backup: ${error}`);
			console.log(error)
		}
	}
}
