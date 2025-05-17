import { Notice, Plugin, TFolder, TFile, TAbstractFile } from 'obsidian';
import { ExportSelecter } from 'src/suggester';
import { parse } from "src/parser";
import { generateOutput } from 'src/exporter';
import { SettingsTab } from './settings';
import { ColorPicker } from 'src/colorpicker';

export interface MoonReaderSettings {
	exportsPath: string;
	enableSRSSupport: boolean;
	outputNotesPath?: string; // New: directory for exported notes
}

const MOONREADER_DEFAULT_SETTINGS: MoonReaderSettings = {
	exportsPath: 'Book Exports',
	enableSRSSupport: false,
	outputNotesPath: 'MoonReader Exports' // Default output directory
}

export default class MoonReader extends Plugin {
	settings: MoonReaderSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('book', 'Moon Reader', async () => await this.start());

		this.addCommand({
			id: 'parse-exports',
			name: 'Parse an export',
			editorCallback: async () =>
				await this.start()
		});
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	async start() {
		const currentTFile = this.app.workspace.getActiveFile();
		if (!currentTFile) {
			new Notice("No active file!");
		}
		const rootPath: string = this.settings.exportsPath;
		const exportTFolder: TAbstractFile = this
			.app
			.vault
			.getAbstractFileByPath(rootPath);
		let exportedFiles: TFile[];
		if (exportTFolder instanceof TFolder) {
			exportedFiles = exportTFolder
				.children
				?.filter(
					(t) => (t instanceof TFile) && t.basename && t.extension == `mrexpt`
				)
				.map(t => t as TFile);
		} else {
			//sanity check
			new Notice("Invalid Folder Path");
			return;
		}
		if (!exportedFiles.length) {
			new Notice("Folder does not have any Moon+ Reader exports!");
			return;
		}
		const suggesterModal = new ExportSelecter(this.app, exportedFiles);
		//TODO: raise error for no input?
		const mrexptChoice = await suggesterModal.openAndGetValue().catch(e => { new Notice("Prompt cancelled"); }) as TFile;
		if (!mrexptChoice) {
			return;
		}
		const parsedOutput = await parse(mrexptChoice);
		if (parsedOutput) {
			const colorChoices = new Set<number>();
			parsedOutput.forEach(t => colorChoices.add(t.signedColor))
			const colorChoicesArr = Array.from(colorChoices);
			colorChoicesArr.unshift(-1); // -1 for All colors
			const colorModal = new ColorPicker(this.app, colorChoicesArr);
			const colorChoice = await colorModal.openAndGetValue()
			// .catch(e=>console.log(e));
			const output = colorChoice === -1
				? generateOutput(parsedOutput, mrexptChoice, null, this.settings.enableSRSSupport)
				: generateOutput(parsedOutput, mrexptChoice, colorChoice, this.settings.enableSRSSupport);

			// New logic: export to a new file in outputNotesPath
			const outputDir = this.settings.outputNotesPath || 'MoonReader Exports';
			const { bookName } = parsedOutput[0];
			const safeBookName = bookName.replace(/[/\\?%*:|"<>]/g, "_");
			const fileName = `${safeBookName}.md`;
			const fullPath = `${outputDir}/${fileName}`;

			// Ensure directory exists
			let outputFolder = this.app.vault.getAbstractFileByPath(outputDir);
			if (!outputFolder) {
				await this.app.vault.createFolder(outputDir);
			}

			// Create or overwrite the file
			let outputFile = this.app.vault.getAbstractFileByPath(fullPath);
			if (outputFile) {
				await this.app.vault.modify(outputFile, output);
			} else {
				await this.app.vault.create(fullPath, output);
			}
			new Notice(`Exported to ${fullPath}`);
		} else {
			new Notice("Nothing added!");
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, MOONREADER_DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
