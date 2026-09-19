export default interface ApiSearchRequest {
  searchTerm: string;
  searchField?: string[];
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortByDirection?: "ASC" | "DESC";
}
