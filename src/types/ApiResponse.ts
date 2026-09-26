import { Pagination } from "@/types/Pagination";

export default interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  status?: number;
  pagination?: Pagination;
}
