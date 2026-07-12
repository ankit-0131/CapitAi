# CapitAI

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vite.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![LangChain.js](https://img.shields.io/badge/LangChain.js-0.3-orange.svg)](https://js.langchain.com/)

A production-grade AI investment intelligence platform featuring a dynamic, tool-calling LangChain architecture, real-time financial metrics retrieval, macroeconomic stress testing, and historical backtesting.

---

## Table of Contents

- [About the Project](#about-the-project)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Usage Examples](#usage-examples)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## About the Project

CapitAI resolves the problem of high-friction financial analysis by pairing a conversational AI agent with agentic simulations and real-time market data. Instead of relying on hardcoded heuristics, the platform uses a dynamic, tool-calling LangChain.js backend to parse user queries, fetch real-time financial metrics, execute stress tests, and verify historical predictions on the fly. 

### Built With
- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Recharts, Socket.io-client
- **Backend:** Node.js, Express, Socket.io, LangChain.js, SQLite, Yahoo Finance API

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Web Browser                       │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │   Interactive Dashboard │ │  Advisor Chat UI     │  │
│  └────────────┬────────────┘ └──────────┬───────────┘  │
└───────────────┼─────────────────────────┼──────────────┘
                │ HTTP Requests           │ WebSockets (Real-time logs)
                ▼                         ▼
┌────────────────────────────────────────────────────────┐
│                    Express Backend                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │               /api/chat Endpoint                 │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │        LangChain Agentic Loop              │  │  │
│  │  │  ┌───────────┐ ┌───────────┐ ┌──────────┐  │  │  │
│  │  │  │ RAG       │ │ Memory    │ │ Core     │  │  │  │
│  │  │  │ Retriever │ │ Vector    │ │ Tools    │  │  │  │
│  │  │  │ (Yahoo)   │ │ Store     │ │ (Zod)    │  │  │  │
│  │  │  └───────────┘ └───────────┘ └──────────┘  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Dynamic Multi-Turn AI Advisor (LangChain.js):** Context-aware advisor that automatically captures updates to your investment capital, risk profiles, and goals from conversation context, updating your database preferences dynamically.
- **Real-Time Financial RAG:** Vector-store similarity search pulling live stock quotes, sector valuation benchmarks, and news sentiment headlines to inject into the LLM system context.
- **Interactive Macro Stress Testing:** Interactive controls to simulate macroeconomic shifts (interest rate increments, inflation spikes, and equity drawdowns) and instantly calculate variance against the stock's baseline rating.
- **Historical Backtester:** Backtests historical return predictions over 3 or 5-year horizons using agentic tools.
- **High-Fidelity UI/UX:** Editorial-inspired layout matching clean corporate aesthetics with fluid transitions, low-contrast outlines, and responsive side panels.

---

## Getting Started

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Gemini API Key (`GEMINI_API_KEY`) or OpenAI API Key (`OPENAI_API_KEY`) for live advisor features (system automatically runs a fallback emulator if offline or without keys).

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/ankit-0131/CapitAi.git
   cd CapitAi
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Environment Setup & API Configuration

To enable live LLM integration, create a `.env` file in the `server` directory:
```bash
# server/.env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Create a `.env` file in the `client` directory to point to the backend in production (optional for local testing):
```bash
# client/.env
VITE_API_URL=http://localhost:5000
```

#### API Files & Model Integration Locations:
* **Gemini LLM Chat Flow & Profile Updates:** Configured in `server/src/server.js` (using `@langchain/google-genai`).
* **OpenAI Fallback Chat Flow:** Configured in `server/src/server.js` (using `@langchain/openai`).
* **Dynamic RAG Context Similarity Search:** Integrated in `server/src/lib/ai/retriever.js` (using `GoogleGenerativeAIEmbeddings`).
* **Agentic Tool Definitions:** Coded in `server/src/tools/coreTools.js` (stress tests, financials, backtests).

### Running Locally

To run both services concurrently for local development:

1. **Start the Backend Server (Port 5000):**
   ```bash
   cd server
   npm start
   ```

2. **Start the Frontend Development Server (Port 5173):**
   ```bash
   cd client
   npm run dev
   ```

---

## Usage Examples

### Chatbot Endpoint Query
Post request payload to `/api/chat`:
```json
{
  "message": "What is the P/E ratio and ROE of TSLA?",
  "history": [],
  "ticker": "TSLA",
  "userId": "user-123"
}
```

### Stress Test Simulator
Post request payload to `/api/simulate`:
```json
{
  "ticker": "AAPL",
  "ratesShift": 2,
  "revenueShift": 10,
  "inflationShift": 3,
  "crashShift": 20
}
```

---

## Deployment

### Frontend (Vercel)
1. Import the repository into your Vercel Dashboard.
2. Edit the **Root Directory** setting to `client`.
3. Set the environment variable `VITE_API_URL` to point to your hosted backend URL.
4. Click **Deploy**.

### Backend (Render or Railway)
1. Deploy the `server` directory.
2. Use `npm install` as the build command and `node src/server.js` as the start command.
3. Configure your API keys (`GEMINI_API_KEY` / `OPENAI_API_KEY`) in the provider's Environment settings.

---

## Contributing

1. Fork the project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## AI Assistance & Acknowledgments

This project was built and refactored with the assistance of **Antigravity**, a powerful agentic AI coding companion designed by Google DeepMind. AI support was key in:
* Integrating the LangChain.js agentic loop, vector retrievers, and tool calling features.
* Implementing the dynamic, fuzzy ticker search parsing in the chatbot query router.
* Mapping and refining the light/dark mode CSS tokens and layout components from the Stitch design system.

---

## Contact

Ankit - [@ankit-0131](https://github.com/ankit-0131)

Project Link: [https://github.com/ankit-0131/CapitAi](https://github.com/ankit-0131/CapitAi)

Deployed Link: [Link](https://vercel.com/freelancer18/captai/EzoXcfVP9mDC1ZC9gp2hnFETo5hu)

