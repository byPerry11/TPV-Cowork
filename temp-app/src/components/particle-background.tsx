"use client"

import { useEffect, useRef } from "react"

export function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId: number
        let particles: Particle[] = []
        let mouseX = 0
        let mouseY = 0

        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initParticles()
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX
            mouseY = e.clientY
        }

        class Particle {
            x: number
            y: number
            size: number
            speedX: number
            speedY: number
            baseX: number
            baseY: number
            density: number

            constructor(x: number, y: number) {
                this.x = x
                this.y = y
                this.baseX = x
                this.baseY = y
                this.size = Math.random() * 2 + 1
                this.speedX = Math.random() * 2 - 1
                this.speedY = Math.random() * 2 - 1
                this.density = (Math.random() * 30) + 1
            }

            draw() {
                if (!ctx) return
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
                ctx.closePath()
                ctx.fill()
            }

            update() {
                const dx = mouseX - this.x
                const dy = mouseY - this.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const forceDirectionX = dx / distance
                const forceDirectionY = dy / distance
                const maxDistance = 150
                const force = (maxDistance - distance) / maxDistance
                const directionX = forceDirectionX * force * this.density
                const directionY = forceDirectionY * force * this.density

                if (distance < maxDistance) {
                    this.x -= directionX
                    this.y -= directionY
                } else {
                    if (this.x !== this.baseX) {
                        const dx = this.x - this.baseX
                        this.x -= dx / 10
                    }
                    if (this.y !== this.baseY) {
                        const dy = this.y - this.baseY
                        this.y -= dy / 10
                    }
                }

                // Add subtle floating movement
                this.x += this.speedX * 0.1
                this.y += this.speedY * 0.1

                // Wrap around edges for floating (optional, but keeping it bound to base for this effect is better)
                if (this.x - this.baseX > 20) this.speedX *= -1
                if (this.x - this.baseX < -20) this.speedX *= -1
                if (this.y - this.baseY > 20) this.speedY *= -1
                if (this.y - this.baseY < -20) this.speedY *= -1

                this.draw()
            }
        }

        const initParticles = () => {
            particles = []
            const numberOfParticles = (canvas.width * canvas.height) / 9000 // Adjust density
            for (let i = 0; i < numberOfParticles; i++) {
                const x = Math.random() * canvas.width
                const y = Math.random() * canvas.height
                particles.push(new Particle(x, y))
            }
        }

        const animate = () => {
            if (!ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            for (let i = 0; i < particles.length; i++) {
                particles[i].update()
            }
            // Draw connecting lines
            connect()
            animationFrameId = requestAnimationFrame(animate)
        }

        const connect = () => {
            if (!ctx) return
            const opacityValue = 1
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x
                    const dy = particles[a].y - particles[b].y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 100) { // Connect distance
                        const opacity = 1 - (distance / 100)
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`
                        ctx.lineWidth = 1
                        ctx.beginPath()
                        ctx.moveTo(particles[a].x, particles[a].y)
                        ctx.lineTo(particles[b].x, particles[b].y)
                        ctx.stroke()
                    }
                }
            }
        }

        window.addEventListener("resize", handleResize)
        window.addEventListener("mousemove", handleMouseMove)

        handleResize()
        animate()

        return () => {
            window.removeEventListener("resize", handleResize)
            window.removeEventListener("mousemove", handleMouseMove)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 bg-black pointer-events-none"
        />
    )
}
