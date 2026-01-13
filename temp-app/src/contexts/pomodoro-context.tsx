"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak'

interface PomodoroSession {
    id: string
    phase: PomodoroPhase
    duration_minutes: number
}

interface PomodoroStats {
    todaySessions: number
    totalSessions: number
    totalMinutes: number
}

interface PomodoroContextType {
    // Estado del timer
    phase: PomodoroPhase
    timeLeft: number
    isRunning: boolean
    sessionCount: number
    currentSessionId: string | null
    stats: PomodoroStats
    userId: string | null

    // Acciones
    setUserId: (id: string) => void
    startSession: () => Promise<void>
    pauseSession: () => void
    resumeSession: () => void
    resetSession: () => void
    skipPhase: () => Promise<void>
    loadStats: () => Promise<void>
}

const WORK_DURATION = 25 * 60
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60
const SESSIONS_BEFORE_LONG_BREAK = 4

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null)
    const [phase, setPhase] = useState<PomodoroPhase>('work')
    const [timeLeft, setTimeLeft] = useState(WORK_DURATION)
    const [isRunning, setIsRunning] = useState(false)
    const [sessionCount, setSessionCount] = useState(0)
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [stats, setStats] = useState<PomodoroStats>({
        todaySessions: 0,
        totalSessions: 0,
        totalMinutes: 0
    })

    const loadStats = useCallback(async () => {
        if (!userId) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { count: todayCount } = await supabase
            .from('pomodoro_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true)
            .gte('started_at', today.toISOString())

        const { count: totalCount } = await supabase
            .from('pomodoro_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true)

        const { data: sessions } = await supabase
            .from('pomodoro_sessions')
            .select('duration_minutes')
            .eq('user_id', userId)
            .eq('completed', true)

        const totalMinutes = sessions?.reduce((sum, s) => sum + s.duration_minutes, 0) || 0

        setStats({
            todaySessions: todayCount || 0,
            totalSessions: totalCount || 0,
            totalMinutes
        })
    }, [userId])

    const completeSession = useCallback(async () => {
        if (!currentSessionId) return

        await supabase
            .from('pomodoro_sessions')
            .update({
                completed: true,
                ended_at: new Date().toISOString()
            })
            .eq('id', currentSessionId)

        loadStats()
    }, [currentSessionId, loadStats])

    const handlePhaseComplete = useCallback(async () => {
        setIsRunning(false)
        await completeSession()

        if (phase === 'work') {
            const newCount = sessionCount + 1
            setSessionCount(newCount)

            if (newCount % SESSIONS_BEFORE_LONG_BREAK === 0) {
                setPhase('longBreak')
                setTimeLeft(LONG_BREAK)
                toast.success("¡Tiempo de descanso largo! 🎉")
            } else {
                setPhase('shortBreak')
                setTimeLeft(SHORT_BREAK)
                toast.success("¡Tiempo de descanso corto! ☕")
            }
        } else {
            setPhase('work')
            setTimeLeft(WORK_DURATION)
            toast.success("¡Tiempo de concentración! 🧠")
        }

        setCurrentSessionId(null)
    }, [phase, sessionCount, completeSession])

    // Timer effect - corre globalmente
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handlePhaseComplete()
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isRunning, timeLeft, handlePhaseComplete])

    // Cargar stats cuando se setea el userId
    useEffect(() => {
        if (userId) {
            loadStats()
        }
    }, [userId, loadStats])

    const startSession = async () => {
        if (!userId) {
            toast.error("Usuario no identificado")
            return
        }

        const duration = phase === 'work' ? 25 : phase === 'shortBreak' ? 5 : 15

        const { data, error } = await supabase
            .from('pomodoro_sessions')
            .insert({
                user_id: userId,
                phase,
                duration_minutes: duration,
                completed: false,
                started_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            toast.error("Error al iniciar sesión")
            console.error(error)
            return
        }

        setCurrentSessionId(data.id)
        setIsRunning(true)
    }

    const pauseSession = () => {
        setIsRunning(false)
    }

    const resumeSession = () => {
        setIsRunning(true)
    }

    const resetSession = () => {
        setIsRunning(false)
        setCurrentSessionId(null)
        const duration = phase === 'work' ? WORK_DURATION : phase === 'shortBreak' ? SHORT_BREAK : LONG_BREAK
        setTimeLeft(duration)
    }

    const skipPhase = async () => {
        if (currentSessionId) {
            await supabase
                .from('pomodoro_sessions')
                .update({
                    completed: false,
                    ended_at: new Date().toISOString()
                })
                .eq('id', currentSessionId)
        }

        setIsRunning(false)
        await handlePhaseComplete()
    }

    const value: PomodoroContextType = {
        phase,
        timeLeft,
        isRunning,
        sessionCount,
        currentSessionId,
        stats,
        userId,
        setUserId,
        startSession,
        pauseSession,
        resumeSession,
        resetSession,
        skipPhase,
        loadStats
    }

    return (
        <PomodoroContext.Provider value={value}>
            {children}
        </PomodoroContext.Provider>
    )
}

export function usePomodoro() {
    const context = useContext(PomodoroContext)
    if (!context) {
        throw new Error('usePomodoro must be used within a PomodoroProvider')
    }
    return context
}

// Constantes exportadas
export { WORK_DURATION, SHORT_BREAK, LONG_BREAK, SESSIONS_BEFORE_LONG_BREAK }
export type { PomodoroPhase, PomodoroStats }
