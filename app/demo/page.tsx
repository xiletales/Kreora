/*
 * Demo account setup (one-time, manual in Supabase):
 *
 * 1. Create a teacher auth user in Supabase Auth:
 *      Email:    demo_teacher@kreora.teacher
 *      Password: demo123
 *
 * 2. Insert a matching row into the `teachers` table:
 *      {
 *        username:   'demo_teacher',
 *        name:       'Demo Teacher',
 *        grade:      'X',
 *        class:      'A',
 *        department: 'Visual Arts',
 *        subject:    'Illustration',
 *      }
 *
 * The login page resolves `demo_teacher` → demo_teacher@kreora.teacher
 * and signs in with the password `demo123`.
 */
import Link from 'next/link'
import { LogIn, KeyRound, User, Mail } from 'lucide-react'

const CREDS = [
  { label: 'Username',  value: 'demo_teacher',              Icon: User    },
  { label: 'Password',  value: 'demo123',                   Icon: KeyRound },
  { label: 'Login as',  value: 'demo_teacher@kreora.teacher', Icon: Mail   },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#FFF5F8] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#FFDBE5] shadow-sm p-8">

        <div className="mb-6 pl-4 border-l-4 border-[#337357]">
          <h1 className="font-display text-2xl font-bold text-[#1a2e25]">
            Try Kreora — Demo Account
          </h1>
          <p className="text-sm text-[#5a7a6a] mt-1">
            Use these credentials to explore the teacher dashboard
          </p>
        </div>

        <div className="bg-[#FFDBE5]/30 border border-[#FFDBE5] rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#337357] mb-4">
            Teacher Login
          </p>
          <div className="space-y-3">
            {CREDS.map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#FFDBE5] flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#337357]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5a7a6a]">{label}</p>
                  <p className="text-sm font-semibold text-[#1a2e25] truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full bg-[#337357] hover:bg-[#285e46] text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-sm"
        >
          <LogIn size={15} />
          Login as Demo Teacher
        </Link>

        <p className="text-xs text-[#5a7a6a] text-center mt-4">
          Read-only friendly. Please be kind to demo data.
        </p>
      </div>
    </div>
  )
}
