

# Warehouse Project

This project is a warehouse management system that includes both frontend and backend components. The frontend is built with React and TypeScript, while the backend is built with Express and MySQL.

## Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication and authorization
- Inventory management
- Billing management
- Bulk import and export of data
- Responsive design

## Technologies

### Frontend

- React
- TypeScript
- Zustand (state management)
- Tailwind CSS

### Backend

- Express
- MySQL
- Vercel (deployment)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MySQL

### Installation

1. Clone the repository:
   
   sh
   git clone https://github.com/your-username/warehouse-project.git
   cd warehouse-project
   

2. Install dependencies for both frontend and backend:

   sh
   cd frontend
   npm install
   cd ../backend
   npm install
   

## Environment Variables

Create a `.env` file in both the frontend and backend directories and add the following environment variables:

### Frontend

env
REACT_APP_BACKEND_URL=https://your-backend-url.vercel.app


### Backend

env
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name


## Running the Project

### Frontend

1. Navigate to the frontend directory:

   sh
   cd frontend
   

2. Start the development server:

   sh
   npm start
   

### Backend

1. Navigate to the backend directory:

   sh
   cd backend
   

2. Start the development server:

   sh
   npm start
   

## Deployment

### Frontend

The frontend is deployed to Vercel. Follow these steps to deploy:

1. Install the Vercel CLI:

   sh
   npm install -g vercel
   

2. Deploy the frontend:

   sh
   cd frontend
   vercel
   

### Backend

The backend is also deployed to Vercel. Follow these steps to deploy:

1. Install the Vercel CLI:

   sh
   npm install -g vercel
   

2. Deploy the backend:

   sh
   cd backend
   vercel
   

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

