import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LoadingScreen from '@/components/LoadingScreen'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Kreora – Gallery & Creative Portfolio',
  description: 'Showcase Students Artworks and Inspire',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <LoadingScreen />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#fff',
                border: '1px solid #fecdd3',
                color: '#374151',
                fontFamily: 'DM Sans, sans-serif',
              },
              success: { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
