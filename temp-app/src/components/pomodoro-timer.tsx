"use client"

import { useEffect } from "react"
import { usePomodoro, WORK_DURATION, SHORT_BREAK, LONG_BREAK } from "@/contexts/pomodoro-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, SkipForward, RotateCcw, Coffee, Brain, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PomodoroTimer({ userId }: { userId: string }) {
    const {
        phase,
        timeLeft,
        isRunning,
        sessionCount,
        currentSessionId,
        stats,
        setUserId,
        startSession,
        pauseSession,
        resumeSession,
        resetSession,
        skipPhase,
        loadStats
    } = usePomodoro()

    // Setear el userId cuando el componente se monta
    useEffect(() => {
        setUserId(userId)
    }, [userId, setUserId])

    // Recargar stats cuando se monta
    useEffect(() => {
        loadStats()
    }, [loadStats])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const getPhaseInfo = () => {
        switch (phase) {
            case 'work':
                return {
                    label: 'Concentración',
                    icon: Brain,
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500/10',
                    total: WORK_DURATION
                }
            case 'shortBreak':
                return {
                    label: 'Descanso Corto',
                    icon: Coffee,
                    color: 'text-green-500',
                    bgColor: 'bg-green-500/10',
                    total: SHORT_BREAK
                }
            case 'longBreak':
                return {
                    label: 'Descanso Largo',
                    icon: Moon,
                    color: 'text-purple-500',
                    bgColor: 'bg-purple-500/10',
                    total: LONG_BREAK
                }
        }
    }

    const phaseInfo = getPhaseInfo()
    const PhaseIcon = phaseInfo.icon
    const progress = ((phaseInfo.total - timeLeft) / phaseInfo.total) * 100

    const handlePlayPause = () => {
        if (isRunning) {
            pauseSession()
        } else {
            if (!currentSessionId) {
                startSession()
            } else {
                resumeSession()
            }
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <PhaseIcon className={`h-5 w-5 ${phaseInfo.color}`} />
                        Pomodoro Timer
                    </CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        🍅 {sessionCount}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Fase actual */}
                <div className="text-center space-y-2">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${phaseInfo.bgColor}`}>
                        <PhaseIcon className={`h-4 w-4 ${phaseInfo.color}`} />
                        <span className={`font-medium ${phaseInfo.color}`}>{phaseInfo.label}</span>
                    </div>
                </div>

                {/* Display del tiempo */}
                <div className="text-center">
                    <div className="text-7xl font-bold tabular-nums tracking-tight">
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Barra de progreso */}
                <Progress value={progress} className="h-2" />

                {/* Info de sesión activa */}
                {currentSessionId && (
                    <div className="text-center">
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            ✨ Sesión activa - El timer seguirá corriendo mientras navegas
                        </Badge>
                    </div>
                )}

                {/* Controles */}
                <div className="flex items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={resetSession}
                        disabled={!currentSessionId && timeLeft === phaseInfo.total}
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                        size="lg"
                        onClick={handlePlayPause}
                        className="w-32"
                    >
                        {isRunning ? (
                            <>
                                <Pause className="h-5 w-5 mr-2" />
                                Pausar
                            </>
                        ) : (
                            <>
                                <Play className="h-5 w-5 mr-2" />
                                {currentSessionId ? 'Continuar' : 'Iniciar'}
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={skipPhase}
                        disabled={!isRunning && !currentSessionId}
                    >
                        <SkipForward className="h-4 w-4" />
                    </Button>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stats.todaySessions}</div>
                        <div className="text-xs text-muted-foreground">Hoy</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stats.totalMinutes}</div>
                        <div className="text-xs text-muted-foreground">Minutos</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
