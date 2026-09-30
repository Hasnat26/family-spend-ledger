# Privacy model

This project is designed so the public GitHub repository contains the application code, not personal financial records.

## Public repository
Anyone can see/copy the source code if the GitHub repository is public.

## Private financial data
Transactions, budgets, custom settings and imported records are stored in the browser's localStorage for the current browser/origin. They are not committed to GitHub and are not bundled into the public source.

JSON backups are downloaded by the user and should be kept private. Never commit a personal JSON backup to a public repository.

## Important limitation
Local-first storage is private from other visitors, but it is not an encrypted vault. Someone who can access the same browser/device profile may be able to access the local data. A future cloud-sync version should use authentication and encrypted/secured server-side storage.

## Safe deployment rule
Publish only the source-only project bundle. Keep the personal backup file outside the repository.
