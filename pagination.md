# Paging Data

Paging (or pagination) is the practice of dividing a large result set into smaller, discrete chunks and returning one chunk at a time. It is a foundational pattern for any system that retrieves data over HTTP.

## Why Page Data?

**Performance & Scalability**

- Fetching millions of rows at once saturates database connection pools, exhausts server memory, and causes queries to time out.
- Network payloads grow linearly with row count. A single unbounded response can take seconds to transfer and parse on the client.
- Databases execute `LIMIT`/`OFFSET` (or keyset/cursor) queries far faster than full-table scans, enabling query plans that use indexes efficiently.

**User Experience**

- Humans cannot meaningfully consume thousands of records at once. Presenting 10–50 results per page reduces cognitive load and improves discoverability.
- Faster first-byte and render times make interfaces feel responsive even over slow connections.

**Resource Protection**

- Unbounded queries are a common cause of accidental DDoS against your own database. Paging puts a hard ceiling on the work done per request.
- Memory pressure on API servers is reduced - the server never needs to hold an entire table in memory to serialize a response.
- Client-side rendering (virtual lists, infinite scroll) is only tractable when data arrives in small, predictable increments.

**Consistency & Predictability**

- Fixed page sizes make API contracts stable and easy to cache at the CDN or HTTP layer.
- Clients can calculate progress (e.g. "showing 1–20 of 47 results") and render navigation controls reliably.

## Sources & Further Reading

- **SQL paging patterns (OFFSET vs keyset):** https://use-the-index-luke.com/sql/partial-results/fetch-next-page - Use The Index, Luke - practical guide to efficient pagination in SQL with real query plans.
- **PostgreSQL LIMIT/OFFSET performance:** https://www.postgresql.org/docs/current/queries-limit.html - official docs covering `LIMIT`, `OFFSET`, and cursor-based approaches.
- **HTTP API design for pagination:** https://developers.google.com/apis-explorer - Google API design guide covers `pageToken`, `pageSize`, and standard pagination patterns used in production REST APIs.
- **Web performance & payload size:** https://web.dev/performance/ - Google web performance guidance, including payload budgets and time-to-first-byte.

## JavaScript/TypeScript Paging

The examples below show a complete set of type definitions and a practical example using the standard `fetch` API to make paginated requests against a REST API.

### Type Definitions

**`ApiSearchRequest`** - sent to the server to request a page of results.

```typescript
export default interface ApiSearchRequest {
  searchTerm: string;
  searchField?: string[];
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortByDirection?: "ASC" | "DESC";
}
```

**`Pagination`** - returned by the server, carries all metadata needed to render pagination controls.

```typescript
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
    this.hasNextPage =
      this.pageSize === 1
        ? this.totalResults > this.pageSize
        : this.totalPages > pageNumber;
  }
}
```

**`ApiResponse<T>`** - generic wrapper for non-paged responses.

```typescript
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  status?: number;
}
```

**`ApiResponsePaged<T>`** - generic wrapper for paged responses; extends the base response with a `pagination` field.

```typescript
export default interface ApiResponsePaged<T> {
  success: boolean;
  message?: string;
  data?: T;
  status?: number;
  pagination?: Pagination;
}
```

---

### Example: Paginated Fetch Client

The example below shows a typed fetch helper and a small set of calls demonstrating how to walk through pages of results.

```typescript
// types.ts  (all definitions above combined)
import type ApiSearchRequest from "./types";
import type ApiResponsePaged from "./types";

// -------------------------------------------------------
// Domain type for this example
// -------------------------------------------------------
interface Product {
  id: number;
  name: string;
  price: number;
}

// -------------------------------------------------------
// Generic paged fetch helper
// -------------------------------------------------------
async function fetchPaged<T>(
  url: string,
  request: ApiSearchRequest,
): Promise<ApiResponsePaged<T[]>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error - status: ${response.status}`);
  }

  return response.json() as Promise<ApiResponsePaged<T[]>>;
}

// -------------------------------------------------------
// Example 1 - Fetch the first page
// -------------------------------------------------------
const request: ApiSearchRequest = {
  searchTerm: "widget",
  searchField: ["name"],
  pageNumber: 1,
  pageSize: 10,
  sortBy: "name",
  sortByDirection: "ASC",
};

const page1 = await fetchPaged<Product>(
  "https://api.example.com/products/search",
  request,
);

if (page1.success && page1.data) {
  console.log("Page 1 results:", page1.data);
  console.log("Pagination:", page1.pagination);
  // { totalResults: 47, totalPages: 5, pageSize: 10,
  //   pageNumber: 1, resultsExist: true,
  //   hasPreviousPage: false, hasNextPage: true }
}

// -------------------------------------------------------
// Example 2 - Fetch the next page (if one exists)
// -------------------------------------------------------
if (page1.pagination?.hasNextPage) {
  const page2 = await fetchPaged<Product>(
    "https://api.example.com/products/search",
    { ...request, pageNumber: 2 },
  );

  if (page2.success && page2.data) {
    console.log("Page 2 results:", page2.data);
  }
}

// -------------------------------------------------------
// Example 3 - Walk all pages automatically
// -------------------------------------------------------
async function fetchAllPages<T>(
  url: string,
  baseRequest: ApiSearchRequest,
): Promise<T[]> {
  const allResults: T[] = [];
  let pageNumber = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetchPaged<T>(url, {
      ...baseRequest,
      pageNumber,
    });

    if (!response.success || !response.data) break;

    allResults.push(...response.data);

    hasNextPage = response.pagination?.hasNextPage ?? false;
    pageNumber += 1;
  }

  return allResults;
}

const allProducts = await fetchAllPages<Product>(
  "https://api.example.com/products/search",
  { searchTerm: "widget", pageNumber: 1, pageSize: 10 },
);

console.log(`Fetched ${allProducts.length} products across all pages`);
```

---

### Example: Server-Side Response Shape

Below is a reference showing how a server would construct a properly shaped `ApiResponsePaged` response (e.g. in an Express route handler):

```typescript
import { Pagination } from "./types";
import type ApiResponsePaged from "./types";

// Simulated route handler
app.post("/products/search", async (req, res) => {
  const { searchTerm, pageNumber, pageSize } = req.body as ApiSearchRequest;

  // Query your data source
  const totalResults = 47;
  const products: Product[] = await db.products.findMany({
    where: { name: { contains: searchTerm } },
    skip: (pageNumber - 1) * pageSize,
    take: pageSize,
  });

  const response: ApiResponsePaged<Product[]> = {
    success: true,
    data: products,
    status: 200,
    pagination: new Pagination(pageSize, pageNumber, totalResults),
  };

  res.json(response);
});
```
