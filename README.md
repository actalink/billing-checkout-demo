# 🚀 Recipe Billing Demo

A full-stack web application built with Next.js (Frontend) and Express.js (Backend) featuring subscription-based recipe access with PostgreSQL database and Drizzle ORM.

## ✨ Features

- **🔐 Authentication**: JWT-based user authentication with session management
- **📱 Subscription Plans**: Free (5 recipes), Basic (20 recipes), Pro (unlimited recipes)
- **🍳 Recipe Management**: Fetch recipes from external API with plan-based access control
- **💳 Billing System**: Subscription management with billing history
- **⚡ Real-time Monitoring**: Cron job for checkout session monitoring
- **🛡️ Security**: Helmet, CORS, rate limiting, and secure session handling

## 🏗️ Architecture

```
billing-demo/
├── frontend/          # Next.js 14 App Router
├── backend/           # Express.js API server
├── docker-compose.yml # PostgreSQL & PgAdmin
└── README.md
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context** for state management

### Backend

- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **JWT** authentication
- **bcryptjs** for password hashing

### Database

- **PostgreSQL** with Docker
- **Drizzle Kit** for migrations
- **PgAdmin** for database management

## 📋 Prerequisites

- **Node.js** 18+ and **npm** 8+
- **Docker** and **Docker Compose**
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd billing-demo
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or install individually:
npm install                    # Root dependencies
cd frontend && npm install    # Frontend dependencies
cd backend && npm install  # Backend dependencies
```

### 3. Environment Setup

#### Backend Environment Variables

Create `.env` file in the `backend/` directory:

```bash
cd backend
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_NAME=recipe_billing
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/recipe_billing

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
NODE_ENV=development
PORT=3001

# External API Configuration
APIKEY=your_billing_api_key
ACTALINK_BASE_URL=http://api.acta.link/billing
PAYLINK_ID_1=your_paylink_id_1
PAYLINK_ID_2=your_paylink_id_2
```

#### Frontend Environment Variables

Create `.env.local` file in the `frontend/` directory:

```bash
cd frontend
touch .env.local
```

Add the following:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Database Setup

```bash
cd backend

# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# (Optional) Open Drizzle Studio
npm run db:studio
```

### 6. Start Development Servers

```bash
# Start both frontend and backend (from root directory)
npm run dev

# Or start individually:
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health
- **Database**: localhost:5432
