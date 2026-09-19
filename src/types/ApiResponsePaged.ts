import { Pagination } from "./Pagination";

export default interface ApiResponsePaged<T> {
  success: boolean;
  message?: string;
  data?: T;
  status?: number;
  pagination?: Pagination;
}
