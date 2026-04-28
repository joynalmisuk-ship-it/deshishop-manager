# DeshiShop Manager cPanel Deploy

## 1. GitHub e upload

```bash
git init
git add .
git commit -m "Initial DeshiShop Manager upload"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deshishop-manager.git
git push -u origin main
```

## 2. cPanel Node.js App setup

Use cPanel's **Setup Node.js App** feature. This project needs Node.js because it has an Express API and SQLite database.

- Node.js version: 20 or newer
- Application root: the folder where this repo is cloned
- Application startup file: `server.ts`
- Application mode: `production`

Add environment variables:

```text
NODE_ENV=production
JWT_SECRET=change-this-to-a-long-secret
PORT=3000
GEMINI_API_KEY=your-key-if-you-use-ai
```

If cPanel assigns its own port, use that port instead of `3000`.

## 3. Install and build

In cPanel Terminal or Node.js app screen, run:

```bash
npm install
npm run build
npm start
```

The production server serves the built React app from `dist/` and the API from the same Node app.

## 4. Important

Do not upload these to GitHub or cPanel manually:

- `node_modules/`
- `.env`
- local log files

The app will create `shop.db`, `backups/`, and `uploads/` on the server when needed.
