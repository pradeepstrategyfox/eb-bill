# PowerSense Home - Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ installed
- PostgreSQL database access
- Redis instance access
- Vercel account (for frontend)
- Render account (for backend)

---

## Local Development Setup

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 2. Set Up PostgreSQL Database

Create a PostgreSQL database:
```sql
CREATE DATABASE powersense;
```

Run the migration script:
```bash
cd server
# Connect to your database and run the migration
psql -U postgres -d powersense -f migrations/001_create_schema.sql
```

Seed the tariff data:
```bash
psql -U postgres -d powersense -f seeds/001_tariff_slabs.sql
```

### 3. Set Up Redis

Install and start Redis locally:
```bash
# On Windows (using Chocolatey)
choco install redis-64

# On macOS
brew install redis
brew services start redis

# On Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 4. Configure Environment Variables

**Backend (.env):**
```
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/powersense
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3000
```

### 5. Run Development Servers

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

Access the application at `http://localhost:5173`

---

## Production Deployment

### Backend Deployment (Render)

1. **Create New Web Service:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** `powersense-api`
     - **Root Directory:** `server`
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`

2. **Add PostgreSQL Database:**
   - In Render Dashboard → "New +" → "PostgreSQL"
   - Name it `powersense-db`
   - Copy the **Internal Database URL**

3. **Add Redis Instance:**
   - "New +" → "Redis"
   - Name it `powersense-redis`
   - Copy the **Internal Redis URL**

4. **Configure Environment Variables in Render:**
   ```
   PORT=3000
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.vercel.app
   DATABASE_URL=<Internal Database URL from Render>
   REDIS_URL=<Internal Redis URL from Render>
   JWT_SECRET=<Generate strong random string>
   JWT_EXPIRES_IN=7d
   ```

5. **Run Database Migrations:**
   - Connect to your Render PostgreSQL database
   - Use Render Shell or external tool to run:
   ```bash
   psql <DATABASE_URL> -f migrations/001_create_schema.sql
   psql <DATABASE_URL> -f seeds/001_tariff_slabs.sql
   ```

6. **Deploy:**
   - Render will automatically deploy when you push to GitHub
   - Note your backend URL (e.g., `https://powersense-api.onrender.com`)

---

### Frontend Deployment (Vercel)

1. **Import Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository

2. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Add Environment Variable:**
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
   ⚠️ Replace with your actual Render backend URL

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - You'll get a URL like `https://powersense-home.vercel.app`

5. **Update Backend CORS:**
   - Go back to Render
   - Update `CLIENT_URL` environment variable with your Vercel URL
   - Redeploy backend

---

## Post-Deployment Tasks

### 1. Test Authentication
- Visit your frontend URL
- Create an account
- Verify login works

### 2. Create Test Home
- Use API or implement the setup wizard
- Test appliance toggling
- Verify consumption tracking

### 3. Verify Bill Calculation
- Check that TNEB tariff slabs are loaded correctly
- Test bill projection with sample data

### 4. Monitor Logs
- **Render:** Check logs in Render dashboard
- **Vercel:** Check function logs in Vercel dashboard

---

## Database Management

### Connecting to Production Database

Using psql:
```bash
psql "<DATABASE_URL_from_Render>"
```

Using DBeaver or pgAdmin:
- Host: Extract from DATABASE_URL
- Port: Usually 5432
- Database: Extract from DATABASE_URL
- User: Extract from DATABASE_URL
- Password: Extract from DATABASE_URL

### Backup Database

```bash
pg_dump "<DATABASE_URL>" > backup_$(date +%Y%m%d).sql
```

### Update Tariff Slabs

Connect to database and run:
```sql
UPDATE tariff_slabs SET is_active = false WHERE id = '<old_slab_id>';
INSERT INTO tariff_slabs (...) VALUES (...);
```

---

## Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists

**Redis Connection Failed:**
- Verify `REDIS_URL` is correct
- Check Redis is running

**CORS Errors:**
- Verify `CLIENT_URL` matches your frontend URL exactly
- No trailing slashes

### Frontend Issues

**API Calls Failing:**
- Check `VITE_API_URL` points to correct backend
- Verify backend is running
- Check browser console for errors

**Build Failures:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check all imports are correct

---

## Scaling Considerations

### Database Optimization
- Add indexes for frequently queried fields (already included in schema)
- Consider read replicas for heavy traffic
- Archive old billing cycles

### Caching Strategy
- Redis already handles session data
- Consider caching tariff slabs
- Cache consumption data with TTL

### Rate Limiting
- Implement rate limiting on API routes
- Protect authentication endpoints

---

## Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS (automatic with Vercel/Render)
- [ ] Implement proper input validation
- [ ] Add rate limiting
- [ ] Regular security updates (`npm audit fix`)
- [ ] Backup database regularly
- [ ] Monitor for suspicious activity

---

## Support & Maintenance

### Regular Tasks
- Weekly: Check error logs
- Monthly: Review and optimize slow queries
- Quarterly: Update dependencies
- Annually: Review and update tariff slabs

### Monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error tracking (Sentry)
- Monitor database size and performance

---

## Next Steps

1. Implement full Setup Wizard with room layout generation
2. Add 2D house layout visualization
3. Implement real-time updates with WebSockets
4. Add data export functionality
5. Build mobile app (React Native)
6. Add email/SMS notifications for bill alerts
7. Implement admin dashboard for user management

---

**Deployment Complete!** 🎉

Your PowerSense Home application is now live and ready to help users track their electricity consumption.
