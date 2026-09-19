export class Pagination {
  public totalResults: number = 0;
  public totalPages: number = 0;
  public pageSize: number = 20;
  public pageNumber: number = 1;
  public resultsExist: boolean = false;
  public hasPreviousPage: boolean = false;
  public hasNextPage: boolean = false;

  constructor(pageSize: number, pageNumber: number, total: number) {
    this.pageSize = pageSize;
    this.pageNumber = pageNumber;
    this.totalResults = total;
    this.resultsExist = total > 0;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    this.hasPreviousPage = pageNumber > 1;
    this.hasNextPage = this.totalPages > pageNumber;
  }
}

export default Pagination;
