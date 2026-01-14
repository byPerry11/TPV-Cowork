"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, LayoutDashboard, ShieldCheck, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ParticleBackground } from "@/components/particle-background"

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white selection:bg-white/20">
      {/* Background Animation */}
      <ParticleBackground />

      {/* Navigation / Header */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 md:h-10 md:w-10 overflow-hidden rounded-xl border border-white/10 shadow-lg">
            <img
              src="/cowork-logo-dark.png"
              alt="COWork"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-bold tracking-wider text-xl">COWork</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:block">
            <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
              Log In
            </Button>
          </Link>
          <Link href="/login?tab=signup">
            <Button className="bg-white text-black hover:bg-white/90 font-medium px-4 md:px-6 rounded-full text-sm md:text-base h-9 md:h-10">
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center max-w-4xl"
        >
          {/* App Icon / Logo Main */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 relative group"
          >
            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <img
              src="/cowork-logo-dark.png"
              alt="COWork Logo"
              className="h-48 w-48 md:h-64 md:w-64 relative z-10 drop-shadow-2xl rounded-[3.5rem]"
            />
          </motion.div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Collaborate
            </span>
            <br />
            <span className="text-stroke-white text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)" }}>
              Without Limits.
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-base text-gray-400 md:text-xl leading-relaxed">
            The ultimate workspace management platform designed for modern teams.
            Streamline projects, manage members, and boost productivity with an elegant, dark-mode first experience.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link href="/login?tab=signup">
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 text-lg h-12 px-8 rounded-full group w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 text-lg h-12 px-8 rounded-full backdrop-blur-sm w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </motion.div>

          {/* Feature Highlights (Mini Cards) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full max-w-5xl"
          >
            {[
              {
                icon: <LayoutDashboard className="h-6 w-6" />,
                title: "Intuitive Dashboard",
                desc: "Everything you need at a glance. Projects, tasks, and team stats in one place."
              },
              {
                icon: <ShieldCheck className="h-6 w-6" />,
                title: "Secure & Fast",
                desc: "Built with Supabase for enterprise-grade security and real-time performance."
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Real-time Collab",
                desc: "Work together seamlessly. See updates instantly as they happen."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-white/10 bg-black py-12 text-center md:text-left">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-lg border border-white/10">
                  <img src="/cowork-logo-dark.png" alt="Logo" className="h-full w-full object-cover" />
                </div>
                <span className="text-lg font-bold tracking-wider text-white">COWork</span>
              </div>
              <p className="text-sm text-gray-500">
                Empowering teams to build the future. <br /> Simple, fast, and elegant.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between border-t border-white/5 pt-8 md:flex-row text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} COWork Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
