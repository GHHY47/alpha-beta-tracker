ALPHA BETA TRACKER

An end-to-end quantitative financial analytics platform designed to calculate, visualize, and analyze Capital Asset Pricing Model (CAPM) metrics (Alpha and Beta) for equities. 

This platform was engineered to showcase a transition of rigorous problem-solving skills from complex hardware product integration into the software domain. It emphasizes clean code, scalable cloud infrastructure, and the seamless fusion of quantitative math with modern web technologies.


ARCHITECTURE & TECH STACK

The system is built with fault tolerance and high-performance computing in mind. Much like tactical positions on a soccer pitch, each microservice plays a specialized, strict role to maintain the overall system's shape and efficiency.

- Frontend (React, D3.js, Tailwind CSS, Vite): Deployed via AWS S3 and CloudFront. Features high-fidelity interactive data visualizations, avoiding heavy browser-side math by relying on pre-computed backend distributions.

- Serverless Backend (AWS SAM, API Gateway, Lambda):
  -- Python (Math & AI): Handles on-demand, heavy Pandas/NumPy matrix calculations for individual stock queries. Acts as a secure bridge to the Google Gemini API for the AI Chat feature. Hot responses are cached in DynamoDB.
  -- Go (Data Pipeline): Forms a robust, concurrent data ingestion engine. A producer schedules tasks via Amazon SQS, while worker nodes fetch external market data (Twelve Data API), perform core calculations, and write state to a PostgreSQL database (RDS).

- CI/CD (GitHub Actions): Fully automated deployment pipelines (deploy.yml) managing Go/Python builds, AWS SAM stack updates, and frontend asset synchronization.


KEY FEATURES

- Quantitative Deep Dive: Calculates 5-Year Average and 1-Year Rolling Alpha/Beta, directly comparing individual equities against the S&P 500 benchmark.

- AI Analyst Integration: Embeds a Gemini-powered conversational agent. The backend injects raw statistical distributions and historical time-series data into the prompt context, allowing the AI to provide instantaneous, mathematically grounded financial summaries without hallucinating.

- Interactive Visualizations: Custom D3.js implementations for rolling metrics and statistical bell curves (histograms) featuring interactive crosshairs and state-locked data inspection.

- Group Screener: A ranking dashboard allowing users to filter and sort a subset of the S&P 500 via tabular data, histogram comparisons, and quadrant scatter plots.


LOCAL DEVELOPMENT SETUP

Prerequisites
- Docker & Docker Compose
- AWS SAM CLI
- Node.js 20+ & npm
- Go 1.26+ & Python 3.10+

Quick Start
1. Database: Navigate to /backend and run "docker-compose up -d" to spin up the local PostgreSQL instance. The database schema will automatically initialize via init.sql.

2. Environment Variables: Create .env and env.json files in the /backend directory. You will need to provide your own TWELVE_DATA_API_KEY and GEMINI_API_KEY.

3. Backend Services: Use "sam build" and "sam local start-api" to test the AWS Lambda functions and API routes locally.

4. Frontend: Navigate to /frontend, run "npm install", and then execute "npm run dev" to start the Vite development server.

Designed and developed by He Yan.