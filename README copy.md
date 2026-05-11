# 🎨 Kreora — Gallery & Creative Portfolio

A full-stack web app for student artwork showcase built with **Next.js 15**, **Supabase**, **Tailwind CSS**, and **Framer Motion**.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the contents of `supabase/schema.sql`
3. Enable storage buckets: `artworks` and `avatars` (both public)

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard → Settings → API

### 4. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Pages

| Route | Description |
|-------|-------------|
| `/` | Home — featured artwork + category sections |
| `/gallery` | Browse all artworks with search & filter |
| `/gallery/[id]` | Artwork detail + comments + likes |
| `/portfolio` | Personal portfolio page |
| `/dashboard` | Auto-redirects by role |
| `/dashboard/student` | Student dashboard (showcase, progress, badges) |
| `/dashboard/teacher` | Teacher dashboard (assignments, grades, feedback, monitoring, curation) |
| `/profile/edit` | Edit profile + avatar upload |
| `/signup` | Register (student or teacher) |
| `/login` | Login |
| `/users` | List all students (teacher view) |

---

## 🗄️ Database Tables

- `profiles` — extends Supabase auth users
- `artworks` — student artwork submissions
- `assignments` — teacher-created tasks
- `comments` — feedback on artworks
- `badges` — student achievement badges
- `events` — school events for curation
- `curations` — teacher-curated artwork selections
- `artwork_likes` — like tracking per user

---

## 🎨 Design System

- **Primary color**: Rose/pink (`#e11d48`)
- **Background**: Warm cream (`#fdf6f0`)
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Animation**: Framer Motion throughout
- **Loading screen**: Animated brush stroke + bouncing dots

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 (App Router) | Framework |
| Supabase | Database, Auth, Storage |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| lucide-react | Icons |
| react-hot-toast | Notifications |
