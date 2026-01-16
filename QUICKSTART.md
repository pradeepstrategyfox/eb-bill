# Quick Start - PowerSense Home

## 🚀 Start Developing

### Frontend
```bash
cd client
npm run dev
```
Visit: http://localhost:5173

### Backend
```bash
cd server
npm install
npm run dev
```
API: http://localhost:3000

---

## 🌐 Deployed URLs

- **Frontend:** https://eb-bill-virid.vercel.app
- **Backend:** https://eb-bill-lkcc.onrender.com

---

## 📝 Essential API Calls

```javascript
import api from './api';

// Auth
await api.post('/api/auth/register', { name, email, password });
await api.post('/api/auth/login', { email, password });

// Homes
await api.post('/api/homes', { name: 'My Home', totalRooms: 3 });
await api.get('/api/homes/:id');

// Appliances
await api.get('/api/appliances/library'); // 40+ appliances
await api.post('/api/rooms/:roomId/appliances', { name, type, wattage });
await api.patch('/api/appliances/:id/toggle'); // ON/OFF

// Consumption
await api.get('/api/homes/:homeId/consumption/live');
await api.get('/api/homes/:homeId/billing/current');
```

---

## ✅ Setup Status

- [x] Project structure created
- [x] 8 database models
- [x] 25+ API endpoints
- [x] API client with JWT
- [x] Environment configured
- [ ] Database migrations (see DEPLOYMENT.md)
- [ ] Build UI pages

---

See **CONNECTION_GUIDE.md** for full documentation.
