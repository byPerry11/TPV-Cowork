"use client"

import { useState } from "react"
import { usePomodoro, WORK_DURATION, SHORT_BREAK, LONG_BREAK } from "@/contexts/pomodoro-context"
import { Button } from "@/components/ui/button"
import { Play, Pause, X, Maximize2, Brain, Coffee, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function MiniPomodoroTimer() {
    const {
        phase,
        timeLeft,
        isRunning,
        currentSessionId,
        sessionCount,
        pauseSession,
        resumeSession,
        resetSession
    } = usePomodoro()

    const [isExpanded, setIsExpanded] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    // No mostrar si no hay sesión activa o se ha descartado
    if (!currentSessionId || isDismissed) return null

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const getPhaseInfo = () => {
        switch (phase) {
            case 'work':
                return {
                    label: 'Trabajo',
                    icon: Brain,
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500',
                    ringColor: 'ring-blue-500/30',
                    total: WORK_DURATION
                }
            case 'shortBreak':
                return {
                    label: 'Descanso',
                    icon: Coffee,
                    color: 'text-green-500',
                    bgColor: 'bg-green-500',
                    ringColor: 'ring-green-500/30',
                    total: SHORT_BREAK
                }
            case 'longBreak':
                return {
                    label: 'Descanso Largo',
                    icon: Moon,
                    color: 'text-purple-500',
                    bgColor: 'bg-purple-500',
                    ringColor: 'ring-purple-500/30',
                    total: LONG_BREAK
                }
        }
    }

    const phaseInfo = getPhaseInfo()
    const PhaseIcon = phaseInfo.icon
    const progress = ((phaseInfo.total - timeLeft) / phaseInfo.total) * 100

    const handleDismiss = () => {
        setIsDismissed(true)
        resetSession()
    }

    return (
        <div
            className={cn(
                "fixed z-[100] transition-all duration-300 ease-in-out",
                "bottom-20 right-4 md:bottom-6 md:right-6",
                isExpanded ? "w-72" : "w-auto"
            )}
        >
            <div
                className={cn(
                    "bg-card/95 backdrop-blur-lg border shadow-2xl rounded-2xl overflow-hidden",
                    "ring-2",
                    phaseInfo.ringColor,
                    isRunning && "animate-pulse-subtle"
                )}
            >
                {/* Mini version (collapsed) */}
                {!isExpanded && (
                    <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setIsExpanded(true)}
                    >
                        {/* Circular progress indicator */}
                        <div className="relative">
                            <svg className="w-12 h-12 -rotate-90">
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="text-muted"
                                />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={125.6}
                                    strokeDashoffset={125.6 - (progress / 100) * 125.6}
                                    className={phaseInfo.color}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <PhaseIcon className={cn("h-5 w-5", phaseInfo.color)} />
                            </div>
                        </div>

                        {/* Time */}
                        <div className="flex-1">
                            <div className="text-xl font-bold tabular-nums">
                                {formatTime(timeLeft)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                🍅 {sessionCount}
                            </div>
                        </div>

                        {/* Quick controls */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                                e.stopPropagation()
                                isRunning ? pauseSession() : resumeSession()
                            }}
                        >
                            {isRunning ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                )}

                {/* Expanded version */}
                {isExpanded && (
                    <div className="p-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-full", phaseInfo.bgColor + "/10")}>
                                    <PhaseIcon className={cn("h-4 w-4", phaseInfo.color)} />
                                </div>
                                <span className={cn("text-sm font-medium", phaseInfo.color)}>
                                    {phaseInfo.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setIsExpanded(false)}
                                >
                                    <Maximize2 className="h-3.5 w-3.5 rotate-180" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={handleDismiss}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Timer display */}
                        <div className="text-center">
                            <div className="text-5xl font-bold tabular-nums tracking-tight">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                                className={cn("h-1.5 rounded-full transition-all", phaseInfo.bgColor)}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetSession}
                            >
                                Reiniciar
                            </Button>
                            <Button
                                size="sm"
                                className="min-w-[100px]"
                                onClick={() => isRunning ? pauseSession() : resumeSession()}
                            >
                                {isRunning ? (
                                    <>
                                        <Pause className="h-4 w-4 mr-1.5" />
                                        Pausar
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4 mr-1.5" />
                                        Continuar
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Session count */}
                        <div className="text-center text-xs text-muted-foreground">
                            Sesiones hoy: 🍅 {sessionCount}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
