# Ai-ChatApp - AI-Powered Chat Application

A modern, full-stack AI chat application built with Next.js, featuring multi-model AI support, real-time streaming, and persistent chat history. Experience seamless conversations with various AI models through a beautiful, intuitive interface.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.16.3-336791?style=flat-square&logo=postgresql)

## ✨ Features

### 🤖 Multi-Model AI Support
- **OpenRouter Integration**: Access 30+ Free AI models through a single API
- **Model Selection**: Switch between different AI models on the fly
- **Smart Compatibility**: Automatically handles models with different capabilities (system prompts, reasoning, etc.)

### 💬 Advanced Chat Features
- **Real-time Streaming**: Real-time streaming for instant feedback
- **Chat History**: Full conversation history with context preservation
- **Message Regeneration**: Retry and regenerate AI responses


### 🔐 Authentication & Security
- **OAuth Integration**: Sign in with GitHub or Google
- **Better Auth**: Secure, modern authentication system



## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) + [OpenRouter](https://openrouter.ai/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)


## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** database
- **OpenRouter API Key** ([Get one here](https://openrouter.ai/))
- **OAuth Credentials** (GitHub and/or Google)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chatapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="your-database-url"

   # OpenRouter AI
   OPENROUTER_API_KEY="your-openrouter-api-key"

   # Authentication - GitHub
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"

   # Authentication - Google
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run migrations
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

Built with ❤️ using Next.js, React, and TypeScript
