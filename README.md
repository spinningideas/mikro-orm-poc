# MikroORM TypeScript POC

The code in this repo demonstrates use of [MikroORM](https://github.com/mikro-orm/mikro-orm) as an ORM using two tables with geography data sets (continents and countries).

This code uses the following libraries:

- [MikroORM](https://github.com/mikro-orm/mikro-orm) - TypeScript ORM for Node.js
- [typescript](https://www.typescriptlang.org/)
- [express](https://expressjs.com/)
- [postgresql](https://www.postgresql.org/)
- [vitest](https://vitest.dev/) - testing
- [supertest](https://github.com/ladjs/supertest) - HTTP assertions for API tests

This code uses MikroORM v7 which provides first-class TypeScript support with decorators.

This proof of concept uses a repository pattern to access data from the database and uses [express](https://expressjs.com/).

## Get Started

To get started perform the following steps:

### 1) Install PostGreSQL for your Operating System (OS)

https://www.postgresql.org/download/

### 2) Create PostGreSQL database to use in this POC

After installing locally you should have a database server - you will need to do these steps:

#### 2.1 Copy ".env.template" file into standard ".env" file so that you have valid file present and update the values in it to have correct set with valid database name and credentials (DB_USER, DB_PASSWORD)

```
DB_USER=postgres
DB_PASSWORD=CHANGE_ME_TO_VALID_ENTRY
DB_NAME=mikro_orm_poc
DB_HOST=localhost
DB_PORT=5432
```

#### 2.2 Create a database named "mikro_orm_poc" or named the same value you used in the .env var DB_NAME

DB_NAME=mikro_orm_poc OR name of your choice

#### 2.3 enable access to the credentials from mikro-orm.config.ts (username from .env: DB_USER)

### 3) Install npm packages

Install the required packages via standard command:

`npm install`

### 4) Create database schema using MikroORM schema generator

See `mikro-orm.config.ts` for schema configuration.

Run the following command to create the database schema:

`npm run schema:create`

### 5) Populate database with data using MikroORM seeders

See `src/db/seeders/seed.ts`

Run the following command to seed the database:

`npm run seed:run`

### 6) Run the application

The application is configured to use ts-node-dev to monitor for file changes and you can run command to start the application using it. You will see console information with url and port.

1. `npm run dev`

OR

1. `npm run build`
2. `npm run start`

NOTE: You can also run and debug the application if using vscode via the launch.json profile and debugging capabilities: https://code.visualstudio.com/docs/editor/debugging

### 7) Exercise the application via postman OR thunder client

#### 7.1 - Get a client

- https://www.getpostman.com - Download and install https://www.getpostman.com

#### 7.2 - Import "postman" collection and run requests

Use the client of your choice to run the requests to see api data and responses after importing the collection in the "postman" folder

#### 7.3 - Run the tests

The tests use [vitest](https://vitest.dev/) with [supertest](https://github.com/ladjs/supertest) and live in the `tests` folder (`api.test.ts`, `pagination.test.ts`, `search.test.ts`). They run migrations and seeders against the database configured in `.env`, so the PostgreSQL server must be running — the express app does NOT need to be started first.

Run the full test suite once:

```
npm run test
```

Or run vitest in watch mode:

```
npm run test:watch
```

## Pagination

Countries can be retrieved a page at a time via:

```
GET /countries/:continentCode/:pageNumber/:pageSize/:orderBy/:orderDesc
```

Example: `GET /countries/NA/1/10/countryName/DESC`

The response has the shape `{ total, data, pagination }` where `pagination` is a [Pagination](src/types/Pagination.ts) object containing `totalResults`, `totalPages`, `pageSize`, `pageNumber`, `resultsExist`, `hasPreviousPage` and `hasNextPage`.

At the repository layer, pagination is provided by `findWherePagedSorted()` and `paginate()` in [MikroOrmBaseRepository](src/db/repositories/MikroOrmBaseRepository.ts).

See [pagination.md](pagination.md) for background on why paging matters, the shared type definitions (`ApiSearchRequest`, `ApiResponsePaged`, `Pagination`), and client-side examples for walking through pages of results.

## Search

Countries can be searched by name via a POST endpoint that accepts an [ApiSearchRequest](src/types/ApiSearchRequest.ts) JSON body:

```
POST /countries/search
```

```json
{
  "searchTerm": "United",
  "pageNumber": 1,
  "pageSize": 10,
  "sortBy": "countryName",
  "sortByDirection": "ASC"
}
```

The search performs a case-insensitive substring match (`$ilike`) on `countryName` and returns the same paged response shape `{ total, data, pagination }` described above. `pageNumber`, `pageSize`, `sortBy` and `sortByDirection` are optional.

At the repository layer, search is provided by `search()` in [MikroOrmBaseRepository](src/db/repositories/MikroOrmBaseRepository.ts), which accepts the field name, search term, and optional sort/pagination arguments.

### 8 Inspiration and Read More

- https://github.com/mikro-orm/mikro-orm
- https://mikro-orm.io/
- https://mikro-orm.io/docs/repositories
- https://mikro-orm.io/docs/migrations
