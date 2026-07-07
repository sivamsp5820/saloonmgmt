# Creo Corp Saloon Management System

This project contains the migrated React 19 + Express.js + Aiven PostgreSQL version of the Saloon Management Billing application.

For a full breakdown of the architecture, migrations, and file structure, please read the walkthrough documentation:
[walkthrough.md](file:///C:/Users/Admin/.gemini/antigravity/brain/4bec6371-45a7-4043-8b0b-7d2d2f13c338/artifacts/walkthrough.md)

## Quick Start Instructions

1. **Import Database Schema**: Run the SQL schema script located in `supabase/migrations/20260704000000_init_schema.sql` on your Aiven PostgreSQL instance. Paste your Aiven CA certificate in `backend/ca.pem` to enable secure SSL connections.
2. **Start Backend API**:
   ```bash
   cd backend
   # Duplicate .env.example as .env and configure DATABASE_URL
   npm run dev
   ```
3. **Start Frontend Client**:
   ```bash
   cd frontend
   npm run dev
   ```
