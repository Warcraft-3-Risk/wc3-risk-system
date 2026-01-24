export class StatisticsPage {
	private currentPage: number = 0;
	private totalPages: number = 1;
	private columnsPerPage: number = 11;
	private pinnedColumns: number = 1;
	private totalColumnCount: number;
	private pageIndicator: framehandle;
	private onPageChange: () => void;

	constructor(totalColumnCount: number, pageIndicator: framehandle, columnsPerPage: number, pinnedColumns: number, onPageChange: () => void) {
		this.totalColumnCount = totalColumnCount;
		this.pageIndicator = pageIndicator;
		this.columnsPerPage = columnsPerPage;
		this.pinnedColumns = pinnedColumns;
		this.onPageChange = () => onPageChange();
		this.calculateTotalPages();
		this.updatePageIndicator();
	}

	public nextPage(): boolean {
		if (this.currentPage < this.totalPages - 1) {
			this.currentPage++;
			this.updatePageIndicator();
			this.onPageChange();
			return true;
		}
		return false;
	}

	public previousPage(): boolean {
		if (this.currentPage > 0) {
			this.currentPage--;
			this.updatePageIndicator();
			this.onPageChange();
			return true;
		}
		return false;
	}

	public getCurrentPage(): number {
		return this.currentPage;
	}

	public getTotalPages(): number {
		return this.totalPages;
	}

	public isColumnOnCurrentPage(columnIndex: number): boolean {
		if (columnIndex < this.pinnedColumns) {
			return true;
		}

		const adjustedColumnIndex = columnIndex - this.pinnedColumns;
		const startIndex = this.currentPage * this.columnsPerPage;
		const endIndex = startIndex + this.columnsPerPage - 1;

		return adjustedColumnIndex >= startIndex && adjustedColumnIndex <= endIndex;
	}

	public isPinnedColumn(columnIndex: number): boolean {
		return columnIndex === 0;
	}

	public updatePageIndicator(): void {
		BlzFrameSetText(this.pageIndicator, `Page ${this.currentPage + 1} of ${this.totalPages}`);
	}

	public calculateTotalPages(): void {
		const totalPaginatedColumns = this.totalColumnCount - this.pinnedColumns;
		this.totalPages = Math.ceil(totalPaginatedColumns / this.columnsPerPage);
	}
}
