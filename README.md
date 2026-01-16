# PowerSense Home

A production-grade web application for electricity consumption visualization and bill prediction for households in Tamil Nadu, India.

## Overview

PowerSense Home helps users:
- Configure their house with rooms and appliances
- View auto-generated 2D house layouts
- Toggle appliances in real-time
- Track electricity consumption
- See projected bills based on TNEB tariffs
- Eliminate bill shock with accurate predictions

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Zustand** for state management
- **React Router** for navigation
- **Recharts** for data visualization
- **Axios** for API communication

### Backend
- **Node.js** with Express
- **PostgreSQL** for data persistence
- **Redis** for session and real-time state
- **Sequelize** ORM
- **JWT** authentication
- **Bcrypt** for password hashing

## Project Structure

```
Bill/
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone the repository**
   ```bash
   cd Bill
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run migrate
   npm run seed
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd client
   npm install
   cp .env.example .env
   # Edit .env with your API URL
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Development

### Frontend Development
```bash
cd client
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
```

### Backend Development
```bash
cd server
npm run dev        # Start with nodemon
npm run migrate    # Run migrations
npm run seed       # Seed database
npm test           # Run tests
```

## Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set root directory to `client`
4. Add environment variable:
   - `VITE_API_URL`: Your backend URL (e.g., https://your-app.onrender.com)
5. Deploy

### Backend (Render)

1. Create new Web Service in Render
2. Connect your GitHub repository
3. Configuration:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables:
   - `PORT`: 3000 (Render provides this)
   - `CLIENT_URL`: Your Vercel frontend URL
   - `DATABASE_URL`: PostgreSQL connection string (use Render PostgreSQL add-on)
   - `REDIS_URL`: Redis connection string (use Render Redis add-on)
   - `JWT_SECRET`: Random secure string
   - `NODE_ENV`: production
5. Add PostgreSQL and Redis add-ons
6. Deploy

## Features

### Core Features
- ✅ User authentication (email/phone OTP)
- ✅ Multi-step home setup wizard
- ✅ Auto-generated 2D house layout
- ✅ Real-time appliance control
- ✅ Live power consumption tracking
- ✅ TNEB bill projection
- ✅ Meter reading integration
- ✅ Slab-wise cost breakdown

### Analytics & Insights
- ✅ Top power consuming appliances
- ✅ Cost per appliance analysis
- ✅ "What If" scenario calculator
- ✅ Usage alerts and recommendations
- ✅ Bill explanation mode

### Admin Panel
- ✅ Tariff slab management
- ✅ Appliance library updates
- ✅ Usage statistics (anonymized)

## Architecture

### Data Flow
1. User toggles appliance → Frontend updates state
2. API call to backend → Logs usage with timestamp
3. Consumption engine calculates energy → Updates Redis cache
4. Billing engine projects bill → Returns to frontend
5. Real-time updates → User sees live consumption

### Real-Time Calculation
- Appliances track ON time with timestamps
- Energy = Power (kW) × Time (hours)
- Aggregated at room, home, and billing cycle levels
- Redis stores current state for fast access
- PostgreSQL stores historical logs

### TNEB Billing
- Bi-monthly billing cycles (60 days)
- Slab-based pricing with government subsidies
- Fixed charges per slab
- Clear breakdown of costs

## API Documentation

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify and login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Email/password login

### Home Management
- `POST /api/homes` - Create home
- `GET /api/homes/:id` - Get home details
- `PUT /api/homes/:id` - Update home

### Consumption
- `GET /api/homes/:id/consumption/live` - Live data
- `GET /api/homes/:id/consumption/today` - Today's usage
- `GET /api/homes/:id/consumption/cycle` - Billing cycle

### Billing
- `GET /api/homes/:id/billing/current` - Current projection
- `POST /api/homes/:id/billing/explain` - Explain actual bill
- `POST /api/homes/:id/billing/what-if` - Calculate scenarios

## Database Schema

### Core Models
- **User**: Authentication and profile
- **Home**: House configuration
- **Room**: Individual rooms with layout positions
- **Appliance**: Devices with wattage and state
- **ApplianceUsageLog**: Timestamped usage records
- **MeterReading**: Manual meter readings
- **BillingCycle**: Bi-monthly billing periods
- **TariffSlab**: TNEB pricing structure

## Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Environment variable management
- SQL injection protection via Sequelize ORM
- XSS prevention
- Rate limiting (planned)

## Performance

- Redis caching for real-time data
- Optimized database queries with indexes
- Lazy loading of components
- Code splitting in Vite
- Responsive images
- Minimal bundle size

## Contributing

This is a production application. For contributions:
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.

---

**Built with ❤️ for Tamil Nadu households**
