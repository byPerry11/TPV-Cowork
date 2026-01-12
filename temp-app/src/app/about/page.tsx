"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Quote } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ParticleBackground } from "@/components/particle-background"

export default function AboutPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black text-white selection:bg-white/20">
            <ParticleBackground />

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
                <Link href="/">
                    <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10 gap-2 pl-0">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Button>
                </Link>
            </header>

            <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-20">
                <div className="max-w-3xl w-full space-y-12">

                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent mb-4">
                            About COWork
                        </h1>
                        <div className="h-1 w-20 bg-white/20 mx-auto rounded-full" />
                    </motion.div>

                    {/* Content Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="relative p-8 md:p-12 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl"
                    >
                        <Quote className="absolute top-8 left-8 h-12 w-12 text-white/10 -scale-x-100" />
                        <Quote className="absolute bottom-8 right-8 h-12 w-12 text-white/10" />

                        <div className="space-y-6 text-lg md:text-xl leading-relaxed text-gray-300 relative z-10 font-light">
                            <p>
                                <span className="text-white font-medium">COWork</span> se desarrolló por mí ante la necesidad de fomentar buenas prácticas en el trabajo colaborativo, promoviendo la productividad, la responsabilidad y la obtención de recompensas y reconocimientos por cumplir las labores.
                            </p>
                            <p>
                                Creemos que el éxito de un equipo no solo se mide por los objetivos alcanzados, sino por cómo se sienten sus miembros durante el proceso. Esta plataforma está diseñada para hacer que ese viaje sea más transparente, justo y gratificante para todos.
                            </p>
                            <p className="italic text-white/80">
                                Espero le den el uso y les ayude con lo suyo, tqm.
                            </p>
                        </div>

                        <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-8">
                            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20">
                                <img src="/developer-profile.jpg" alt="Perry Corzo" className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-lg">Perry Corzo</p>
                                <p className="text-sm text-gray-500">Creator of COWork</p>
                            </div>
                        </div>

                    </motion.div>

                </div>
            </main>
        </div>
    )
}
