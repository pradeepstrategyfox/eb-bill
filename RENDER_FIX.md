# Render Backend Configuration Fix

## ❌ Current Error

```
Error: Could not find Prisma Schema
```

**Cause:** Build command is looking for Prisma, but we're using Sequelize.

---

## ✅ Fix: Update Render Configuration

### Step 1: Go to Render Dashboard
1. Visit https://dashboard.render.com/
2. Click on your backend service: **eb-bill-lkcc**
3. Go to the **Settings** tab

### Step 2: Update Build & Start Commands

**Root Directory:**
```
server
```

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```

### Step 3: Environment Variables

Ensure these are set in the **Environment** tab:

```
PORT=3000
NODE_ENV=production
CLIENT_URL=https://eb-bill-virid.vercel.app

# Database (from Render PostgreSQL add-on)
DATABASE_URL=<your-postgres-internal-url>

# Redis (from Render Redis add-on)
REDIS_URL=<your-redis-url>

# JWT
JWT_SECRET=<generate-a-strong-random-string>
JWT_EXPIRES_IN=7d

# Email (optional for now)
EMAIL_FROM=noreply@powersense.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# SMS (optional)
SMS_ENABLED=false
SMS_API_KEY=
SMS_SENDER_ID=PWRSNS
```

### Step 4: Save and Redeploy

1. Click **Save Changes**
2. Render will automatically trigger a new deployment
3. Monitor the logs for successful deployment

---

## 🔧 If You Don't Have Database/Redis Yet

### Create PostgreSQL Database
1. In Render Dashboard → **New +** → **PostgreSQL**
2. Name: `powersense-db`
3. After creation, copy the **Internal Database URL**
4. Add to your backend environment as `DATABASE_URL`

### Create Redis Instance
1. In Render Dashboard → **New +** → **Redis**
2. Name: `powersense-redis`
3. After creation, copy the **Redis URL**
4. Add to your backend environment as `REDIS_URL`

### Run Database Migrations

You need to connect to your Render PostgreSQL and run:

```bash
# Get the DATABASE_URL from Render environment
# Then connect with psql and run migrations:

psql "YOUR_DATABASE_URL" -c "$(cat server/migrations/001_create_schema.sql)"
psql "YOUR_DATABASE_URL" -c "$(cat server/seeds/001_tariff_slabs.sql)"
```

Or manually:
1. Copy contents of `server/migrations/001_create_schema.sql`
2. In Render Dashboard → Your PostgreSQL → **Shell**
3. Paste and execute the SQL
4. Repeat for `server/seeds/001_tariff_slabs.sql`

---

## ✅ Expected Successful Deployment

After fixing, you should see:
```
==> Running build command 'npm install'...
added 213 packages, and audited 214 packages in 3s
==> Build succeeded 🎉
==> Starting service with 'npm start'...
✓ Database connected successfully
✓ Database models synchronized
✓ Redis connected successfully
✓ Server running on port 3000
```

---

## 🧪 Test After Deployment

Visit: https://eb-bill-lkcc.onrender.com

Should return:
```json
{
  "message": "PowerSense Home API",
  "status": "running",
  "version": "1.0.0"
}
```

---

## 📝 Quick Reference

**What we're using:**
- ORM: **Sequelize** (NOT Prisma)
- Database: **PostgreSQL**
- Cache: **Redis**
- Server: **Express**

**Folder structure:**
```
Bill/
├── client/   ← Vercel (React + Vite)
└── server/   ← Render (Express + Sequelize)
```

---

## 🚨 Common Issues

### Issue: "Cannot find module"
- **Fix:** Ensure Root Directory is set to `server`

### Issue: "Database connection failed"
- **Fix:** Add DATABASE_URL to environment

### Issue: "Redis connection failed"
- **Fix:** Add REDIS_URL to environment

### Issue: Still seeing Prisma error
- **Fix:** Clear build cache in Render:
  - Settings → Advanced → Clear Build Cache
  - Trigger manual deploy

---

**After fixing, your backend will deploy successfully!** 🚀
