# GrowEasy CRM AI-Powered CSV Importer

An intelligent, high-performance, full-stack CSV importer designed for GrowEasy. It extracts standardized CRM lead records from any valid CSV format with arbitrary layouts and headers using a robust, multi-provider AI semantic mapping pipeline and local fallback heuristics.

---

## 🚀 Key Features

1. **Intelligent Upload Zone (Dropzone)**
   - Minimalist drag-and-drop file interface with smooth micro-animations and drop feedback.
   - Built-in type and size validation (limits uploads to `<10MB` CSVs).

2. **Parsed CSV Data Preview**
   - Renders a clean grid layout prior to processing.
   - Fully optimized with pagination controls (10 rows per page) to prevent browser paint lag on large datasets.
   - Sticky header support with horizontal and vertical scrolling.

3. **AI Semantic Mapping with Resilient Batching**
   - **Batch Processing**: Splits input datasets into chunks of **5 rows** each to completely eliminate JSON truncation risks, optimize token usage, and prevent attention degradation in smaller LLMs.
   - **Multi-Provider Fallback Chain**: Sequential fallback architecture designed to guarantee successful imports even under rate-limiting conditions:
     1. **Groq** (First: `llama-3.1-8b-instant`)
     2. **SambaNova** (Second: `Meta-Llama-3.1-8B-Instruct`)
     3. **Cerebras** (Third: `llama3.1-8b`)
     4. **Gemini** (Fourth: `gemini-1.5-flash` / `gemini-1.5-pro` / `gemini-pro`)
     5. **Local Heuristics Engine** (High-fidelity regular expression-based fallback)
   - **Resilience Systems**: Features progressive divide-and-conquer batch subdivision and jittered exponential backoffs for handling API rate limits.

4. **Bento-style Metrics Dashboard & Inline Editing**
   - Informative Bento grid displaying: Total Mapped, Total Skipped, Completeness Score, and AI Processing Time.
   - **Inline Edit/Validation**: Allows users to inspect and edit mapped details (e.g., status, name, company, notes) directly in the table before exporting, or delete invalid rows.
   - **Skipped Leads Audit**: Lists skipped rows along with the exact validation failure reason (e.g. missing contact details).
   - **Programmatic same-origin downloads**: Exports leads to **CSV** or **JSON** locally through programmatic Blob streams, ensuring safe file naming conventions under all environments.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion, TanStack React Query.
- **Backend**: Express, Multer, csv-parser, TypeScript, Google GenAI SDK.
- **Monorepo Structure**: Uses npm workspaces for running frontend and backend concurrently.

```text
groweasy-crm-csv-importer/
├── apps/
│   ├── frontend/     # Next.js SPA
│   └── backend/      # Express REST API & AI Mapper Service
├── package.json      # Workspace runner configuration
└── README.md         # Documentation
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Installation
Clone the repository and navigate to the root workspace directory, then install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file inside `apps/backend/`:
```env
PORT=5000

# Providers Configuration
GROQ_API_KEY=your_groq_api_key_here
SAMBANOVA_API_KEY=your_sambanova_api_key_here
CEREBRAS_API_KEY=your_cerebras_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```
*Note: If no API keys are provided in `.env`, the system automatically defaults to the high-fidelity local heuristics engine to map headers and normalize data without limits or costs.*

### 3. Run Locally
Launch the development servers concurrently from the root directory:
```bash
npm run dev
```
- **Frontend SPA**: `http://localhost:3000`
- **Backend Server**: `http://localhost:5000`

---

## 🧪 Running Unit Tests

The backend includes a validator test suite mapping and validating standard heuristics, date parses, status enum conversions, and source parsing:
```bash
npm run test --workspace=apps/backend
```

---

## 🐳 Docker Deployment

The application is containerized with individual multi-stage Dockerfiles.

- **Frontend Dockerfile**: `apps/frontend/Dockerfile`
- **Backend Dockerfile**: `apps/backend/Dockerfile`

To run using Docker Compose (if configured in your environment):
```bash
docker-compose up --build
```
