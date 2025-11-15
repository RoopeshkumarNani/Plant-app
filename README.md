# Plant Companion — Gift Demo

This is a single-user web prototype for a personalized "plant companion" gift app.
It supports photo upload, simple plant area analysis, and personality-driven responses.

This demo is intended to be exclusive to one person — deploy to a private Netlify/Vercel URL and share it.

Prerequisites

- Node.js 16+ and npm

Install

```bash
cd c:/Users/NANI/OneDrive/Desktop/app/plant-app
npm install
```

Run

```bash
npm start
```

Open http://localhost:3000 in your browser.

Notes

- This demo uses the Web Speech API (browser) for TTS.
- If you set `OPENAI_API_KEY` as an environment variable, the server will attempt to use OpenAI to generate richer plant messages.
- PlantNet integration is left as a placeholder; you can wire a plant identification API where indicated.

Deployment

- Deploy on Netlify/Vercel by pushing this folder to a Git repo and connecting the project.
- For exclusive access, use the default free subdomain and only share the link with her.
