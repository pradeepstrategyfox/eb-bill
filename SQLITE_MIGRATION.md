# SQLite Migration Guide

## ✅ Changes Made

Converted from **PostgreSQL** to **SQLite** for easier deployment on Render's free tier.

---

## 🔧 What Changed

### 1. Database Configuration
**File:** `server/src/config/database.js`
- Changed from PostgreSQL to SQLite
- Uses file-based storage: `database.sqlite`
- No external database service needed

### 2. Dependencies
**File:** `server/package.json`
- Removed: `pg` and `pg-hstore`
- Added: `sqlite3`

### 3. Environment Variables
**File:** `server/.env`
```env
# OLD (PostgreSQL)
DATABASE_URL=postgresql://...

# NEW (SQLite)
DATABASE_PATH=./database.sqlite
REDIS_URL=redis://red-d5li359r0fns73eb4na0:6379
```

### 4. Gitignore
Added `*.sqlite`, `*.sqlite3`, `*.db` to ignore database files

---

## 🚀 Deployment to Render

### Environment Variables on Render

Set these in your Render backend service environment:

```
PORT=3000
NODE_ENV=production
CLIENT_URL=https://eb-bill-virid.vercel.app

# SQLite - Leave empty to use default location
DATABASE_PATH=

# Your Redis URL
REDIS_URL=redis://red-d5li359r0fns73eb4na0:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email (optional)
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

### Build & Start Commands

**Root Directory:** `server`

**Build Command:** `npm install`

**Start Command:** `npm start`

---

## 📝 Database Initialization

The database will be **automatically created** on first run. Sequelize will:
1. Create `database.sqlite` file
2. Create all tables from models
3. Insert tariff data (if you add seed logic)

### Optional: Pre-seed Tariff Data

Add this to `server/src/index.js` after database sync:

```javascript
import TariffSlab from './models/TariffSlab.js';

// After sequelize.sync()
async function seedTariffs() {
  const count = await TariffSlab.count();
  if (count === 0) {
    console.log('Seeding tariff slabs...');
    await TariffSlab.bulkCreate([
      { minUnits: 0, maxUnits: 100, ratePerUnit: 2.50, fixedCharge: 20, subsidyPercentage: 50, effectiveFrom: '2024-01-01' },
      { minUnits: 101, maxUnits: 200, ratePerUnit: 3.00, fixedCharge: 30, subsidyPercentage: 25, effectiveFrom: '2024-01-01' },
      { minUnits: 201, maxUnits: 400, ratePerUnit: 4.50, fixedCharge: 50, subsidyPercentage: 0, effectiveFrom: '2024-01-01' },
      { minUnits: 401, maxUnits: 500, ratePerUnit: 6.00, fixedCharge: 75, subsidyPercentage: 0, effectiveFrom: '2024-01-01' },
      { minUnits: 501, maxUnits: 800, ratePerUnit: 7.50, fixedCharge: 100, subsidyPercentage: 0, effectiveFrom: '2024-01-01' },
      { minUnits: 801, maxUnits: null, ratePerUnit: 9.00, fixedCharge: 150, subsidyPercentage: 0, effectiveFrom: '2024-01-01' },
    ]);
    console.log('✓ Tariff slabs seeded');
  }
}
```

---

## 🧪 Testing Locally

```bash
cd server
npm install  # Installs sqlite3
npm run dev
```

You should see:
```
✓ Database connected successfully
✓ Database models synchronized
✓ Redis connected successfully
✓ Server running on port 3000
```

The `database.sqlite` file will be created automatically.

---

## ⚠️ Important Notes

### SQLite Limitations
- **Single writer at a time** (fine for small-medium apps)
- **Max database size:** 281 TB (more than enough!)
- **No network access** (perfect for Render's file system)

### Data Persistence on Render
- SQLite file is stored on Render's disk
- **Render Free Tier:** Disk is ephemeral (resets on redeploy)
- **Render Paid Tier:** Use persistent disk for data retention

For production with data persistence, either:
1. Upgrade to Render paid tier with persistent disk
2. Use an external PostgreSQL service (Supabase, Neon, etc.)
3. Regular backups if using free tier

---

## 🔄 Migrating Back to PostgreSQL Later

If you want to switch back:

1. Revert `database.js` to PostgreSQL config
2. Update `package.json` dependencies
3. Update `.env` with `DATABASE_URL`
4. Export SQLite data and import to PostgreSQL

---

## ✅ Benefits of SQLite for This Project

✅ No external database service needed  
✅ Zero configuration  
✅ Perfect for development  
✅ Fast for read-heavy workloads  
✅ Works on Render free tier  
✅ Automatic database creation  

---

## 📦 Next Steps

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Test locally:**
   ```bash
   npm run dev
   ```

3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Convert to SQLite database"
   git push
   ```

4. **Render will auto-redeploy** with SQLite!

---

**Your backend is now SQLite-powered and ready for Render deployment!** 🚀
