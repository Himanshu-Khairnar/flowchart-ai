# Flowchart AI ✨

> AI-powered flowchart generator with automatic database sync

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## ✨ Features

### 🤖 AI Generation
- **Generate flowcharts from text** using Google Gemini
- Natural language to flowchart conversion
- Smart node positioning and connections
- Example prompts included

### 🎨 Visual Editor
- **Drag & drop** flowchart builder
- **Custom nodes**: Process, Decision, Start, End
- **Inline editing**: Click to edit node text
- **Connect nodes**: Drag between handles
- **Delete nodes**: Press Delete key

### 💾 Auto-Save
- **3-second debounced auto-save** to database
- **Instant localStorage backup**
- **Visual save status indicator**
- **Manual save button** for immediate save

### 🗄️ Database
- **Supabase integration** for persistence
- **Flow versioning** with timestamps
- **Structured JSON storage** (JSONB)
- **Cross-device sync**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local and add your keys:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_KEY
# - GEMINI_API_KEY
```

### 3. Set Up Database
1. Create a [Supabase](https://supabase.com) account
2. Run the SQL in `supabase-schema.sql`
3. Get your API keys from Settings → API

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup instructions
- **[AI-SETUP.md](./AI-SETUP.md)** - AI integration guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture

## 🎯 Usage

### Manual Creation
1. Click **"+ Process"** to add nodes
2. **Drag** from node handles to connect
3. **Click** node text to edit
4. **Press Delete** to remove nodes

### AI Generation
1. Click **"✨ AI Generate"** button
2. Enter a description:
   ```
   Create a user login flow with validation
   ```
3. Click **"Generate Flowchart"**
4. Edit the generated flowchart as needed

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Flowchart**: React Flow (@xyflow/react)
- **Database**: Supabase (PostgreSQL + JSONB)
- **AI**: Google Gemini (gemini-1.5-flash)
- **Language**: TypeScript

## 📁 Project Structure

```
flowchart-ai/
├── app/
│   ├── api/
│   │   └── generate-flowchart/   # AI generation API
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AIGenerateDialog.tsx      # AI prompt dialog
│   ├── FlowCanvas.tsx            # Main canvas + logic
│   ├── Header.tsx                # Top bar
│   ├── Sidebar.tsx               # Node palette
│   └── ui/                       # shadcn components
├── lib/
│   ├── db/
│   │   └── flows.ts              # Database operations
│   ├── supabase.ts               # Supabase client
│   └── utils.ts
├── types/
│   └── flow.ts                   # TypeScript types
└── supabase-schema.sql           # Database schema
```

## 🔧 Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_key

# Google Gemini
GEMINI_API_KEY=your_gemini_key
```

### API Keys

- **Supabase**: [supabase.com/dashboard](https://supabase.com/dashboard)
- **Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## 🎨 Features Breakdown

### Phase 1: Basic Flowchart ✅
- React Flow integration
- Custom nodes (Process, Decision)
- Add/delete nodes
- Connect nodes
- Edit node text

### Phase 2: Database ✅
- Supabase integration
- Auto-save (3-second debounce)
- Manual save
- localStorage sync
- Save status indicator

### Phase 3: AI Integration ✅
- Google Gemini API
- Natural language to flowchart
- JSON structure validation
- Example prompts
- Error handling

### Phase 4: Coming Soon 🚧
- User authentication
- Multiple flowcharts per user
- Flow library UI
- Export to image/PDF
- Share flowcharts

## 🐛 Troubleshooting

### AI Generation Issues
```bash
# Check if Gemini API key is set
echo $GEMINI_API_KEY

# Check API logs
# Open browser console → Network tab
```

### Database Issues
```bash
# Verify Supabase connection
# Check browser console for errors
# Verify RLS policies in Supabase dashboard
```

### Auto-save Not Working
1. Check Supabase credentials
2. Verify database schema is created
3. Check browser console for errors

## 📝 License

MIT

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [React Flow](https://reactflow.dev/)
- [Supabase](https://supabase.com/)
- [Google Gemini](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Made with ❤️ by [Himanshu Khairnar](mailto:himanshu@gmail.com)**
