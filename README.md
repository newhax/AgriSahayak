# AgriSahayak — Multilingual Farmer's Helper

AgriSahayak is a multilingual, voice-first digital public good designed to provide Indian smallholder farmers with actionable crop advisories and pathologistic diagnostics.

---

## 1. Architectural Diagram

```
[ Farmer Client (React SPA) ]
      ▲                 │
      │ (Base64 Audio   │ (Voice / Image / Text Queries)
      │  & JSON advice) │
      │                 ▼
[ Full-Stack Server Node (Express) ] ──(process.env.GEMINI_API_KEY)──► [ Google Gemini AI Models ]
      │                                                                  ├─ gemini-3.8-flash (Text & Vision)
      │                                                                  └─ gemini-3.1-flash-tts-preview (Speech Synthesis)
      ├─► [ Open-Meteo Weather service ] (Coordinates-based 7-day telemetry)
      └─► [ ICAR Seeded Soil database ] (pH, Organic Carbon, NDVI vegetation health)
```

---

## 2. Real vs. Synthetic Datasets

- **Real & Live Integrations**:
  - **Open-Meteo Weather Forecasts**: Dynamic 7-day district weather summaries are fetched live using district longitude/latitude values.
  - **Google Gemini Generative AI**: Both advisory generation and multimodal vision diagnosis are handled live in the secure Express backend using Google GenAI models.
  - **Google Gemini Text-to-Speech**: Speech synthesis is run live on demand to speak answers back to the farmers.

- **Synthetic & Seeded Datasets (Labeled "Illustrative")**:
  - **Soil Zone Profile Reference**: Seeded using publishing ICAR profiles for 6 major districts across Punjab, Maharashtra, and Tamil Nadu.
  - **Anonymized Outbreak Reports**: A simulated dataset of 240+ statistically realistic reports across common Indian crops (Rice, Wheat, Cotton, Grapes) to showcase the Digital Public Good shared warning systems in Flow 3.

---

## 3. How a New State Onboards

Onboarding a new state node takes less than 10 minutes and does not require core code modifications:
1. **Append Soil metadata**: Insert the district constants (soil type, pH average, organic carbon, NDVI baseline) to `src/data.ts`.
2. **Assign GPS Coordinates**: Maps coordinates to `DISTRICT_COORDS` in `src/data.ts` to automatically activate Open-Meteo forecast fetching.
3. **Toggle Regional Language support**: Simply select the language (e.g. Marathi, Bengali) in the landing screen to propagate target system translations dynamically in Gemini prompts.

---

## 4. Deployment & Dependency Management Note

- `package-lock.json` is intentionally excluded from version control via `.gitignore`.
- This ensures that cloud build platforms (such as Vercel on Linux x64) run `npm install` directly on the target OS architecture to resolve native Rollup/Vite optional dependencies (`@rollup/rollup-linux-x64-gnu`) without platform-specific lockfile mismatches from local macOS or Windows development machines.
- Vercel Install Command: `npm install` (default when no lockfile is present).

