# Recora

## Overview
Recora is a lightweight, agentic platform designed to streamline the technical hiring process. It features a continuous, floating AI assistant that can autonomously execute tasks such as drafting job descriptions, extracting data from PDF resumes, ranking candidates, scheduling interviews, and generating analytics reports.

The application is built with a strong focus on privacy and minimal infrastructure dependency. All recruitment data is stored locally in the browser, and AI interactions are securely proxied through a minimal Node.js server to protect API keys.

## Architecture & Technology Stack

### Frontend
- **Core**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Styling**: Custom CSS combined with Tailwind CSS utility classes (via CDN).
- **Data Persistence**: Browser `localStorage` (no external database required).
- **PDF Processing**: `pdf.js` for completely client-side resume text extraction.
- **Data Visualization**: `Chart.js` for analytics and pipeline rendering.
- **Exporting**: `jsPDF` for text-based PDF report generation.

### Backend Proxy
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Purpose**: Serves static frontend files and proxies LLM requests to the Groq API securely, preventing client-side exposure of API keys.

### AI Integration
- **Provider**: Groq API
- **Models**: `llama-3.3-70b-versatile` (Primary), `llama-3.1-8b-instant` (Fallback).

## Project Structure
```text
/
├── .env.example            # Template for required environment variables
├── package.json            # Node.js dependencies and scripts
├── server.js               # Express server and API proxy configuration
└── frontend/               # Static client files
    ├── index.html          # Main application entry point
    ├── dashboard.html      # Pipeline and high-level metrics
    ├── jobs.html           # Job description management
    ├── candidates.html     # Candidate database and AI ranking
    ├── upload.html         # Client-side PDF resume parsing
    ├── schedule.html       # Interview coordination
    ├── analytics.html      # Hiring intelligence charts
    ├── css/
    │   └── styles.css      # Core application styling and layout
    └── js/
        ├── ai-agent.js       # Core LLM communication and prompting
        ├── analytics-agent.js# Chart data formatting
        ├── candidate-agent.js# Candidate scoring and evaluation logic
        ├── data-store.js     # LocalStorage state management
        ├── job-agent.js      # Job formatting logic
        ├── main.js           # UI logic, quick actions, and routing
        └── resume-parser.js  # PDF text extraction utility
```

## Setup and Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- A valid Groq API Key

### Installation Steps

1. **Install Dependencies**
   Navigate to the project root and install the required Node modules.
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the project root directory. Use the provided `.env.example` as a reference.
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   GROQ_FALLBACK_MODEL=llama-3.1-8b-instant
   PORT=3000
   ```

3. **Start the Server**
   Start the Express proxy server.
   ```bash
   npm start
   ```

4. **Access the Application**
   Open a modern web browser and navigate to:
   ```text
   http://localhost:3000/index.html
   ```

## Key Features & Workflows

- **Client-Side Parsing**: Upload candidate resumes in PDF format. The text is parsed directly in the browser to maintain data privacy.
- **Agentic Actions**: Click black action buttons (e.g., "Ask Assistant", "Rank with AI") across the platform to immediately prompt the AI contextually.
- **PDF Export**: Generate readable, text-based PDF reports directly from the UI for Job Descriptions, Analytics, and Schedules.
- **Offline Storage**: Refreshing or closing the browser will not destroy data; state is persisted in `localStorage`.
