# 🏗️  CRM AI Platform - Backend Server

**🚀 AI-Powered Sales & CRM System**

This project is a comprehensive backend server for a next-generation CRM platform that leverages Artificial Intelligence to optimize sales processes, predict outcomes, and automate repetitive tasks.

## 📋 Table of Contents

- [✨ Features](#-features)
- [📊 Technology Stack](#-technology-stack)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🔌 API Documentation](#-api-documentation)
- [⚙️ Configuration](#️-configuration)
- [🔐 Authentication](#-authentication)
- [🧠 AI Features](#-ai-features)
- [🗄️ Database](#-database)
- [🔄 Development](#-development)
- [🧪 Testing](#-testing)
- [📦 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🤖 AI-Powered Sales Intelligence
- **Lead Scoring**: Predict lead conversion probability
- **Sales Forecasting**: Advanced prediction models
- **Opportunity Insights**: AI-driven recommendations
- **Sentiment Analysis**: Customer sentiment detection

### 👥 Customer Management
- **Contact Management**: 360° customer view
- **Account Management**: Company/organization tracking
- **Activity Tracking**: Call logs, meetings, emails
- **Interaction History**: Complete communication timeline

### 📈 Sales Automation
- **Pipeline Management**: Visual sales pipeline
- **Task Automation**: Automated follow-ups
- **Workflow Engine**: Custom sales workflows
- **Calendar Integration**: Sync meetings and tasks

### 📊 Analytics & Reporting
- **Real-time Dashboards**: Live sales metrics
- **Custom Reports**: Generate insightful reports
- **Trend Analysis**: Identify sales patterns
- **Performance Tracking**: Individual/team performance

### 📧 Communication
- **Email Integration**: Send/track emails
- **Meeting Scheduling**: Automated scheduling
- **Notifications**: Real-time alerts

## 📊 Technology Stack

### Core
- **Node.js** - Server-side JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM library

### AI & Machine Learning
- **TensorFlow.js** - Machine learning in JavaScript
- **Brain.js** - Neural networks
- **Python** - AI/ML (for more complex models)

### Security
- **JWT** - JSON Web Tokens
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-Origin Resource Sharing

### Utilities
- **Axios** - HTTP client
- **Node-cron** - Scheduled tasks
- **Nodemon** - Development auto-reload
- **Multer** - File uploads

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or Atlas)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/shine25-ai/crm-ai-platform-server.git
   cd crm-ai-platform-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration.

4. Run the server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`.

## 📁 Project Structure

```



```



## 🔌 API Documentation

The API follows RESTful conventions. Here are the main endpoint groups:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Opportunities
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity
- `GET /api/opportunities/:id` - Get opportunity by ID
- `PUT /api/opportunities/:id` - Update opportunity

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead by ID
- `PUT /api/leads/:id` - Update lead
- `POST /api/leads/:id/convert` - Convert lead to opportunity

### AI Features
- `POST /api/ai/lead-score` - Calculate lead score
- `POST /api/ai/sales-forecast` - Get sales forecast
- `POST /api/ai/sentiment` - Analyze sentiment

### Reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/pipeline` - Pipeline reports
- `GET /api/reports/trends` - Trend analysis

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/crm-ai

# JWT
JWT_SECRET=your-jwt-secret
JWT_ACCESS_TOKEN_EXPIRY=900
JWT_REFRESH_TOKEN_EXPIRY=2592000

# Server
PORT=5000

# AI Configuration
AI_MODEL_PATH=./src/ai/models
PYTHON_PATH=python3

# Other
NODE_ENV=development
```

## 🔐 Authentication

### Token-Based Authentication

All protected routes require a valid JWT token.

1. **Login** to get tokens:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "[EMAIL_ADDRESS]", "password": "[PASSWORD]"}'
   ```

2. **Include token** in requests:
   ```bash
   curl -X GET http://localhost:5000/api/customers \
     -H "Authorization: Bearer <access-token>"
   ```

### Password Hashing
Passwords are encrypted using bcrypt with a salt factor of 10.

## 🧠 AI Features

### Lead Scoring
Uses a neural network to predict lead conversion probability.

**Endpoint**: `POST /api/ai/lead-score`

**Request**:
```json
{
  "companySize": 50,
  "industry": "technology",
  "leadSource": "website",
  "interactionScore": 8
}
```

**Response**:
```json
{
  "score": 85,
  "prediction": "high_potential",
  "model": "neural_network"
}
```

### Sales Forecasting
Uses time series analysis to predict future sales.

**Endpoint**: `POST /api/ai/sales-forecast`

**Request**:
```json
{
  "timePeriod": "next_quarter",
  "historicalData": [
    {
      "date": "2023-01-01",
      "sales": 10000
    },
    {
      "date": "2023-02-01",
      "
