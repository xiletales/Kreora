'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'

const LETTERS = ['K', 'r', 'e', 'o', 'r', 'a']

export default function LoadingScreen() {
  const [show, setShow] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + Math.random() * 18 + 8
      })
    }, 130)
    const timer = setTimeout(() => setShow(false), 1400)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fdf6f0 50%, #ffe4e6 100%)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
        >
          {/* Background animated blobs */}
          <motion.div
            className="absolute top-[-10%] right-[-10%] w-[380px] h-[380px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(253,164,175,0.35) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], x: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-5%] left-[-8%] w-[320px] h-[320px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(251,113,133,0.25) 0%, transparent 70%)' }}
            animate={{ scale: [1.1, 1, 1.1], y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)' }}
            animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Brand icon with animation */}
            <motion.div
              className="mb-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #337357 0%, #285e46 100%)' }}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 200 }}
            >
              <Palette size={26} className="text-white" />
            </motion.div>

            {/* Animated letter-by-letter logo */}
            <div className="flex items-end gap-0.5 mb-1">
              {LETTERS.map((letter, i) => (
                <motion.span
                  key={i}
                  className="font-display font-bold text-brand-500"
                  style={{
                    fontSize: i === 0 ? '3.5rem' : '3rem',
                    lineHeight: 1,
                    display: 'block',
                  }}
                  initial={{ opacity: 0, y: 24, rotateX: -90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.3 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* Tagline */}
            <motion.p
              className="text-brand-300 text-xs font-semibold tracking-[0.25em] uppercase mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              Gallery &amp; Creative Portfolio
            </motion.p>

            {/* Progress bar */}
            <div className="mt-8 w-40 h-1 bg-rose-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6D9F71, #337357)',
                  width: `${Math.min(progress, 100)}%`,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              />
            </div>

            {/* Bouncing dots */}
            <div className="flex gap-2 mt-5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-300"
                  animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.75, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
