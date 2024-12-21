# MikroORM TypeScript POC

The code in this repo demonstrates use of [MikroORM](https://github.com/mikro-orm/mikro-orm) as an ORM using two tables with geography data sets (continents and countries).

This code uses the following libraries:

- [MikroORM](https://github.com/mikro-orm/mikro-orm) - TypeScript ORM for Node.js
- [typescript](https://www.typescriptlang.org/)
- [express](https://expressjs.com/)
- [postgresql](https://www.postgresql.org/)
- [cypress](https://www.cypress.io/) - testing

This code uses MikroORM v6.4 which provides first-class TypeScript support with decorators.

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

See `src/seeders/runSeeders.ts`

Run the following command to seed the database:

`npm run seed:run`

### 6) Run the application

The application is configured to use nodemon to monitor for file changes and you can run command to start the application using it. You will see console information with url and port.

`npm run start`

NOTE: You can also run and debug the application if using vscode via the launch.json profile and debugging capabilities: https://code.visualstudio.com/docs/editor/debugging

### 7) Exercise the application via postman OR thunder client

#### 7.1 - Get a client

1. https://www.thunderclient.com/

2. https://www.getpostman.com - Download and install https://www.getpostman.com

#### 7.2 - Import "postman" collection and run requests

Use the client of your choice to run the requests to see api data and responses after importing the collection in the "postman" folder

#### 7.3 - Run the cypress tests AFTER first starting the app via "npm start"

Open a new terminal and use the cypress test runner to run the tests.

When cypress launches chose end2end test and Electron then run the tests as you wish to see the API that is produced by express and MikroORM.

```
npm run cypress:open
```

And then run

```
npm run cypress:run
```

### 8 Inspiration and Read More

- https://github.com/mikro-orm/mikro-orm
- https://mikro-orm.io/
- https://mikro-orm.io/docs/repositories
- https://mikro-orm.io/docs/migrations  
