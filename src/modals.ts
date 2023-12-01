import { App, Modal, Setting } from "obsidian";
import LocalBackupPlugin from "./main";

export class NewVersionNotifyModal extends Modal {
    plugin: LocalBackupPlugin;

    constructor(app: App, plugin: LocalBackupPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        let { contentEl } = this;
        contentEl.createEl("h3", { text: "Local Backup Updates (0.1.4)" });
        contentEl.createDiv({ text: "1. File Archiver Settings changed: Please reconfig `File Archiver Settings` if you are using it." });
        contentEl.createEl("br");
        contentEl.createDiv({ text: "2. New ribbon icon." });
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Okey")
                    .setCta()
                    .onClick(() => {
                        this.plugin.saveSettings();

                        this.close();
                    }));
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}