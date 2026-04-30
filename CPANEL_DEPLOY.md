# DeshiShop Manager cPanel Deploy

## Prerequisites
- cPanel with Node.js support (Node.js 20+ recommended)
- Access to cPanel "Setup Node.js App" feature
- Terminal access or ability to run commands via cPanel

## Step 1: Clone & Push to GitHub (Local Machine)

```bash
git init
git add .
git commit -m "Initial DeshiShop Manager upload"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deshishop-manager.git
git push -u origin main
```

## Step 2: Create `.env.local` on Server

In the application root directory on cPanel, create a file called `.env.local`:

```bash
NODE_ENV=production
JWT_SECRET=your-very-long-secret-key-here-at-least-32-characters
PORT=3000
GEMINI_API_KEY=your-gemini-api-key-if-using-ai-features
APP_BASE=/app
```

**Important:**
- `JWT_SECRET`: Use a strong, unique value (at least 32 characters). Generate one: `openssl rand -base64 32`
- `PORT`: cPanel may assign a custom port. Use what cPanel provides.
- `APP_BASE`: Set to `/app` if the app is served from a subpath, or `/` for root domain.

## Step 3: Use cPanel "Setup Node.js App"

1. Log in to cPanel
2. Find **"Setup Node.js App"** (under Software section)
3. Click **Create Application**
4. Configure:
   - **Node.js version**: 20.x or higher
   - **Application root**: `/home/username/public_html/deshishop-manager` (or your repo path)
   - **Startup file**: `app.js`
   - **Application URL**: Your domain/subdomain

## Step 4: Set Environment Variables in cPanel UI

In the Node.js App settings, add environment variables:

```
NODE_ENV=production
JWT_SECRET=your-long-secret
PORT=3000
GEMINI_API_KEY=your-key
APP_BASE=/app
```

**Do NOT use quotes** around values in the cPanel UI fields.

## Step 5: Install Dependencies & Start

In cPanel Terminal or via SSH, navigate to your app root and run:

```bash
npm install
npm start
```

Or if cPanel provides a "Start App" button in the UI, use that instead.

The server will start and log: `Server running on http://localhost:PORT`

## Step 6: Verify Backend is Running

Test that the API responds:
```bash
curl http://localhost:3000/api/debug-runtime
```

This should return JSON with server info, confirming the backend is alive.

## Step 7: Frontend Configuration

If you get a "Connection error" on login:

1. **Check browser console** (F12 → Console tab) for errors
2. **Check Network tab** (F12 → Network) and see if `/api/auth/login` returns 404 or 500
3. **Verify backend URL**: The frontend tries to call `/api/...` which should proxy to your Node server

### If API calls fail (404/500):

- **Backend not running**: Run `npm start` again or check cPanel logs
- **Wrong PORT**: Check cPanel and ensure frontend can reach it
- **APP_BASE mismatch**: If app is under a subpath, ensure `APP_BASE` matches

## File Structure & What NOT to Upload

```
deshishop-manager/
├── app.js                  ✅ Upload
├── server.ts               ✅ Upload (for development only)
├── package.json            ✅ Upload
├── dist/                   ✅ Upload (pre-built frontend)
├── src/                    ✅ Upload (for rebuilds)
├── node_modules/           ❌ DO NOT upload (npm install creates it)
├── .env.local              ⚠️  Create on server only, NEVER commit
├── shop.db                 ❌ Created by app on first run
├── backups/                ❌ Created by app on first run
├── uploads/                ❌ Created by app on first run
└── .git/                   ✅ Upload for version control
```

## Troubleshooting "Connection error" on Login

### 1. Backend not running
```bash
# SSH to server and check:
npm start
# If it fails, check npm install completed without errors
npm install --force
```

### 2. Port blocked or wrong
```bash
# Check if port is listening:
netstat -tlnp | grep 3000
# If nothing shows, backend not running
```

### 3. CORS issue blocking API calls
- Frontend sends request to `/api/auth/login`
- Check that cPanel reverse proxy is configured correctly
- Ensure Node app can receive requests on its assigned port

### 4. APP_BASE mismatch
If app is served from `domain.com/app/`:
```
Frontend expects: /app/api/auth/login
Backend needs APP_BASE=/app
```

Check via:
```bash
curl -s http://localhost:3000/api/debug-runtime | jq '.appBase'
```

### 5. View Live Logs

In cPanel, go to **Setup Node.js App** → Click your app → **View Logs** to see real errors.

## Important Notes

- The `dist/` folder is committed for cPanel, so `npm run build` is optional on the server
- `shop.db`, `backups/`, and `uploads/` are auto-created on first run
- Keep `.env.local` secure and never commit it to Git
- After code updates, restart the Node app from cPanel or via:
  ```bash
  npm start
  ```

## Support

If login still fails:
1. Check cPanel Node.js App logs
2. Check browser Console (F12) for JavaScript errors
3. Check Network tab (F12) to see actual API response
4. Verify `npm install` completed without errors
5. Ensure `JWT_SECRET` and `NODE_ENV=production` are set
