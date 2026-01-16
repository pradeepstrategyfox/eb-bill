# Frontend-Backend Connection Guide

## ✅ Configuration Complete

Your PowerSense Home application is now configured to connect:
- **Frontend (Vercel):** eb-bill-virid.vercel.app
- **Backend (Render):** https://eb-bill-lkcc.onrender.com

---

## Files Created/Updated

### Frontend Files
1. **`.env`** - Contains `VITE_API_URL=https://eb-bill-lkcc.onrender.com`
2. **`src/api.js`** - Axios client with JWT authentication
3. **`src/App.jsx`** - Connection test component
4. **`package.json`** - Added dependencies:
   - `axios` - HTTP client
   - `react-router-dom` - Routing
   - `zustand` - State management

### Backend Files
1. **`.env`** - Updated `CLIENT_URL=https://eb-bill-virid.vercel.app`

---

## 🚀 Deployment Steps

### Step 1: Test Locally (Optional)

```bash
# In the client folder
cd client
npm run dev
```

Visit `http://localhost:5173` - you should see connection status to your deployed backend.

### Step 2: Deploy Frontend to Vercel

**Option A: Via Git (Recommended)**
```bash
# Commit your changes
git add .
git commit -m "Configure frontend-backend connection"
git push origin main
```
Vercel will automatically redeploy.

**Option B: Manual Deploy**
```bash
cd client
npm run build
# Upload the 'dist' folder to Vercel
```

### Step 3: Update Backend Environment on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your backend service: `eb-bill-lkcc`
3. Go to **Environment**
4. Update `CLIENT_URL` to: `https://eb-bill-virid.vercel.app`
5. Click **Save Changes** (this will trigger a redeploy)

---

## 🔧 Backend Setup (If Not Done)

If you haven't set up the backend yet, you need to:

### 1. Set Up Database

On Render:
1. Create a PostgreSQL database add-on
2. Copy the **Internal Database URL**
3. Add to environment as `DATABASE_URL`

Then run migrations:
```bash
# Connect to your Render database and run:
psql <DATABASE_URL> -f server/migrations/001_create_schema.sql
psql <DATABASE_URL> -f server/seeds/001_tariff_slabs.sql
```

### 2. Set Up Redis

On Render:
1. Create a Redis add-on
2. Copy the **Redis URL**
3. Add to environment as `REDIS_URL`

### 3. Required Backend Environment Variables

```
PORT=3000
NODE_ENV=production
CLIENT_URL=https://eb-bill-virid.vercel.app
DATABASE_URL=<your-postgres-url>
REDIS_URL=<your-redis-url>
JWT_SECRET=<generate-random-secret>
JWT_EXPIRES_IN=7d
```

---

## ✅ Testing the Connection

Once deployed:

1. Visit https://eb-bill-virid.vercel.app
2. You should see:
   - "✅ Connected to backend!" message
   - Backend version, status, and message
3. Check browser console (F12) for any CORS errors

### If you see CORS errors:
- Verify `CLIENT_URL` in Render matches your Vercel URL exactly
- Make sure there's no trailing slash
- Redeploy backend after updating environment variables

---

## 📝 Next Steps - Building the Application

The infrastructure is ready. Now you can build features:

### 1. Authentication Pages
Create login/signup pages using the backend API:
```javascript
import api from './api';

// Example: Login
const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};

// Example: Register
const register = async (name, email, password) => {
  const response = await api.post('/api/auth/register', { name, email, password });
  localStorage.setItem('token', response.data.token);
  return response.data;
};
```

### 2. Home Setup
```javascript
// Create home
const createHome = async (name, totalRooms) => {
  const response = await api.post('/api/homes', { name, totalRooms });
  return response.data;
};

// Add room
const addRoom = async (homeId, roomData) => {
  const response = await api.post(`/api/homes/${homeId}/rooms`, roomData);
  return response.data;
};

// Add appliance
const addAppliance = async (roomId, applianceData) => {
  const response = await api.post(`/api/rooms/${roomId}/appliances`, applianceData);
  return response.data;
};
```

### 3. Real-Time Features
```javascript
// Toggle appliance
const toggleAppliance = async (applianceId) => {
  const response = await api.patch(`/api/appliances/${applianceId}/toggle`);
  return response.data;
};

// Get consumption data
const getConsumption = async (homeId) => {
  const response = await api.get(`/api/homes/${homeId}/consumption/live`);
  return response.data;
};

// Get bill projection
const getBill = async (homeId) => {
  const response = await api.get(`/api/homes/${homeId}/billing/current`);
  return response.data;
};
```

---

## 🎨 Available Backend Endpoints

All endpoints use JWT authentication (except `/api/auth/*`)

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/send-otp` - Send OTP (mock in dev)
- `POST /api/auth/verify-otp` - Verify OTP

### Homes
- `GET /api/homes` - List user's homes
- `POST /api/homes` - Create home
- `GET /api/homes/:id` - Get home details
- `PUT /api/homes/:id` - Update home

### Rooms
- `POST /api/homes/:homeId/rooms` - Add room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Appliances
- `GET /api/appliances/library` - Get appliance library (40+ items)
- `POST /api/rooms/:roomId/appliances` - Add appliance
- `PATCH /api/appliances/:id/toggle` - Toggle ON/OFF
- `PUT /api/appliances/:id` - Update appliance
- `DELETE /api/appliances/:id` - Delete appliance

### Consumption
- `GET /api/homes/:homeId/consumption/live` - Real-time data
- `GET /api/homes/:homeId/consumption/insights` - Top consumers

### Billing
- `GET /api/homes/:homeId/billing/current` - Bill projection
- `GET /api/homes/:homeId/billing/history` - Billing history

### Meter Readings
- `POST /api/homes/:homeId/meter-readings` - Submit reading
- `GET /api/homes/:homeId/meter-readings` - Reading history

---

## 🐛 Troubleshooting

### Connection Test Fails
1. Check if backend is running: Visit https://eb-bill-lkcc.onrender.com directly
2. Should see: `{"message":"PowerSense Home API","status":"running","version":"1.0.0"}`
3. If not, check Render logs for errors

### CORS Errors
- Verify CLIENT_URL in Render environment
- No trailing slashes in URLs
- Redeploy backend after changes

### 401 Unauthorized
- Endpoints (except auth) require JWT token
- Login first to get token
- Token stored in localStorage automatically

### Database Connection Failed
- Verify DATABASE_URL in Render
- Check PostgreSQL is running
- Run migrations if not done

---

## 📚 Additional Resources

- **Backend Code:** `c:\Users\thila\.gemini\antigravity\Bill\server`
- **API Routes:** `server/src/routes/`
- **Models:** `server/src/models/`
- **Services:** `server/src/services/`

### Key Services
- **Appliance Library:** `server/src/services/ApplianceLibrary.js` (40+ appliances)
- **Billing Engine:** `server/src/services/BillingEngine.js` (TNEB calculations)
- **Consumption Engine:** `server/src/services/ConsumptionEngine.js` (Real-time tracking)

---

## ✅ Deployment Checklist

- [x] Frontend deployed to Vercel
- [x] Backend deployed to Render
- [x] Environment variables configured
- [x] API client created with axios
- [x] Dependencies installed
- [ ] Database migrations run
- [ ] Redis configured
- [ ] Backend CLIENT_URL updated
- [ ] Test connection from deployed frontend
- [ ] Build authentication pages
- [ ] Implement home setup flow
- [ ] Add appliance management
- [ ] Create dashboard with real-time data

---

**Your PowerSense Home is ready to build!** 🎉
