## Environment Setup

1. Copy the `.env.sample` file to create your `.env.local`:
```bash
cp .env.sample .env.local
```

2. Edit `.env.local` and replace the placeholder API keys with your actual keys:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

## Getting Started

1. Install dependencies:
```bash
pnpm i
```

2. Run the Next.js development server (at http://localhost:3000):
```bash
pnpm run dev
```

3. Run the Electron development environment:
```bash
pnpm run electron-dev
```

4. Build the Electron app:
```bash
pnpm run electron-build
```
