"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, LayoutDashboard, ShieldCheck, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ParticleBackground } from "@/components/particle-background"

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Background Animation */}
      <ParticleBackground />

      {/* Navigation / Header */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          {/* Small logo placeholder if needed, or just text */}
          <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold tracking-wider text-xl">COWork</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
              Log In
            </Button>
          </Link>
          <Link href="/login?tab=signup">
            <Button className="bg-white text-black hover:bg-white/90 font-medium px-6">
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
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
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
            <img
              src="/main-logo.png"
              alt="COWork Logo"
              className="h-32 w-auto relative z-10 drop-shadow-2xl brightness-200 contrast-100"
            />
          </motion.div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Collaborate
            </span>
            <br />
            <span className="text-stroke-white text-transparent" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.3)" }}>
              Without Limits.
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-lg text-gray-400 md:text-xl leading-relaxed">
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
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 text-lg h-12 px-8 rounded-full group">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-lg h-12 px-8 rounded-full backdrop-blur-sm">
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
    </div>
  )
}
