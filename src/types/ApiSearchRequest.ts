export default interface ApiSearchRequest {
  searchTerm: string;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortByDirection?: "ASC" | "DESC";
}
