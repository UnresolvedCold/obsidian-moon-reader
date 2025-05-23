import { App, FuzzyMatch, FuzzySuggestModal } from 'obsidian';
import integerToRGBA from './util';

export class ColorPicker extends FuzzySuggestModal<number> {
	suggestions: number[];
	private resolve: (value: number) => void;
	private reject: (reason?: string) => void;
	submitted: boolean;

	constructor(app: App, suggestions: number[]) {
		super(app);
		this.setPlaceholder("Choose your color");
		// TODO: better folder handling
		this.suggestions = suggestions;
		this.submitted = false;
	}

	getItems(): number[] {
		return this.suggestions;
	}

	getItemText(item: number): string {
		if (item === -1) return "All colors";
		return `${integerToRGBA(item)}`;
	}

	onChooseItem(item: number ,_evt: MouseEvent | KeyboardEvent): void {
		this.resolve(item);
	}

	selectSuggestion(value: FuzzyMatch<number>, evt: MouseEvent | KeyboardEvent): void {
		this.submitted = true;
		this.onChooseSuggestion(value, evt);
		this.close();
	}

	onClose(): void {
		if (!this.submitted) {
			this.reject();
		}
	}

	async openAndGetValue(
	): Promise<number> {
		return new Promise(
			(resolve, reject) => {
				try {
					this.resolve = resolve;
					this.reject = reject;
					this.open();
				}
				catch (e) {
					console.log(e)
				}
			}
		)
	}
	
	renderSuggestion(item: FuzzyMatch<number>, el: HTMLElement): void {
		el.addClass("colorpicker");
		if (item.item === -1) {
			const grid = el.createDiv({ cls: "color-grid" });
			const gridColors = [
				"#FF5252", "#FFD600", "#69F0AE",
				"#40C4FF", "#B388FF", "#FF4081",
				"#FFAB40", "#8D6E63", "#607D8B"
			];
			for (let i = 0; i < 9; i++) {
				const cell = grid.createDiv({ cls: "color-grid-cell" });
				cell.style.backgroundColor = gridColors[i];
			}
			const div = el.createDiv();
			div.setText("All colors");
			return;
		}
		const colorDiv = el.createDiv("color-box");
		colorDiv.style.backgroundColor = `#${integerToRGBA(item.item).slice(0,6)}`;
		const div = el.createDiv();
		div.setText(`${integerToRGBA(item.item).slice(0,6)}`);
	}
}