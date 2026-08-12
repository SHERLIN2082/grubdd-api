# Grubdd API

Simple NestJS + MySQL backend for the Grubdd Flutter application.

## First-time setup

Install MySQL locally and make sure the MySQL service is running. In MySQL
Workbench, create the database with:

```sql
CREATE DATABASE grubdd;
```

Then configure and start the API:

```powershell
Copy-Item .env.example .env
npm install
npm run start:dev
```

Update the values in `.env` to match your local MySQL username and password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_DATABASE=grubdd
DB_SYNCHRONIZE=true
```

The API runs at `http://localhost:3000` and Swagger is available at
`http://localhost:3000/docs`.

Add your Google key to `.env` before using the location or Start Swiping APIs:

```env
GOOGLE_PLACES_API_KEY=your-key
```

## Basic flow

1. Call `POST /auth/guest` with `{ "deviceId": "phone-123" }`.
2. Copy `accessToken` from the response.
3. Send `Authorization: Bearer YOUR_TOKEN` for every other endpoint.
4. Complete the profile with `PATCH /users/profile`.
5. Create or join a session and continue through the session endpoints.

`DB_SYNCHRONIZE=true` automatically creates the tables in your local database.
Set it to `false` in production and use database migrations instead.
