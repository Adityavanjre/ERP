# Klypso - Premium Digital Agency Website

A full-stack MERN (MongoDB, Express, React, Node.js) application built for a high-end IT services agency. This project features a stunning, responsive frontend with advanced animations and a robust backend for handling data.

## 🚀 Features

-   **Modern Frontend**: Built with React (Vite), styled with Tailwind CSS, and animated with Framer Motion.
-   **Responsive Design**: Mobile-first architecture ensuring perfect display on all devices.
-   **SEO Optimized**: Integrated `react-helmet-async` for dynamic meta tags and Open Graph data.
-   **Backend API**: Node.js & Express server handling enquiries and data management.
-   **Database**: MongoDB integration for storing enquiries and project data.
-   **Contact System**: Functional enquiry form with validation and email notification support (Nodemailer).

## � API Documentation

See [API.md](./API.md) for detailed API endpoints and security features.

## �🛠 Tech Stack

-   **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, React Router DOM, Lucide React.
-   **Backend**: Node.js, Express.js, Mongoose, Nodemailer, Dotenv, Cors.
-   **Database**: MongoDB.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
-   **Node.js** (v18 or higher)
-   **npm** (Node Package Manager)
-   **MongoDB** (running locally or a compiled connection string)

## ⚙️ Installation & Setup

1.  **Clone the Repository** (if applicable) or navigate to your project folder.

2.  **Install Dependencies**
    We have a convenience script to install dependencies for both client and server at once:
    ```bash
    npm run install-app
    ```
    *Alternatively, install manually:*
    ```bash
    cd server && npm install
    cd ../client && npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the `server` directory:
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/klypso
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_specific_password
    ```

## 🏃‍♂️ Running the Application

This project uses `concurrently` to run both the backend and frontend with a single command.

### Development Mode
To start both the Server (port 5000) and Client (port 5173):

```bash
npm start
```

-   **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser.
-   **Backend API**: Running at [http://localhost:5000](http://localhost:5000).

### Running Separately
If you prefer to run them in separate terminals:

**Server**:
```bash
cd server
npm run dev
```

**Client**:
```bash
cd client
npm run dev
```

## 📂 Project Structure

```
klypso/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components (Header, Footer, etc.)
│   │   ├── pages/          # Page views (Home, Services, Portfolio, etc.)
│   │   ├── App.tsx         # Main application component & Routing
│   │   └── main.tsx        # Entry point
│   └── tailwind.config.js  # Styling configuration
│
├── server/                 # Express Backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   └── index.js            # Server entry point
│
└── package.json            # Root configuration & scripts
```

## 🛡️ License

This project is licensed under the ISC License.
