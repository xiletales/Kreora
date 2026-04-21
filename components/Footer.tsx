import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

const links = {
  Explore: [
    { label: 'Gallery', href: '/gallery' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'About', href: '/about' },
    { label: 'Dashboard', href: '/dashboard' },
  ],
  Account: [
    { label: 'Sign Up', href: '/signup' },
    { label: 'Log In', href: '/login' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display text-xl font-bold text-white">Kreora</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              A platform for students to showcase their creative artworks, build portfolios, and inspire others.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {['Instagram', 'Twitter', 'GitHub'].map(label => (
                <div
                  key={label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-brand-500 flex items-center justify-center cursor-pointer transition-colors duration-200 group"
                  aria-label={label}
                  title={label}
                >
                  <ExternalLink size={13} className="text-gray-400 group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
                {title}
              </h4>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-500 hover:text-brand-300 transition-colors duration-200"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-12 pt-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © 2026 Kreora. All rights reserved.
          </p>
          <div className="flex gap-4">
            {['Privacy', 'Terms'].map(label => (
              <span key={label} className="text-xs text-gray-600 hover:text-brand-300 cursor-pointer transition-colors">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
