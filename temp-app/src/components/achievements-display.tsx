"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AchievementWithStatus } from "@/types"
import * as LucideIcons from "lucide-react"
import { Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface AchievementsDisplayProps {
    userId: string
}

const tierColors = {
    bronze: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700",
    silver: "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300 border-gray-300 dark:border-gray-600",
    gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
    platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300 dark:border-purple-700",
}

export function AchievementsDisplay({ userId }: AchievementsDisplayProps) {
    const [achievements, setAchievements] = useState<AchievementWithStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 0,
        earned: 0
    })

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                // Fetch all achievements
                const { data: allAchievements, error: achievementsError } = await supabase
                    .from('achievements')
                    .select('*')
                    .order('tier', { ascending: true })

                if (achievementsError) throw achievementsError

                // Fetch user's earned achievements
                const { data: userAchievements, error: userAchError } = await supabase
                    .from('user_achievements')
                    .select('achievement_id, earned_at')
                    .eq('user_id', userId)

                if (userAchError) throw userAchError

                // Merge data
                const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
                const earnedMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]))

                const mergedAchievements: AchievementWithStatus[] = (allAchievements || []).map(achievement => ({
                    ...achievement,
                    is_earned: earnedIds.has(achievement.id),
                    earned_at: earnedMap.get(achievement.id) || null
                }))

                setAchievements(mergedAchievements)
                setStats({
                    total: mergedAchievements.length,
                    earned: mergedAchievements.filter(a => a.is_earned).length
                })
            } catch (error) {
                console.error("Error fetching achievements:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAchievements()
    }, [userId])

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
            </div>
        )
    }

    const getIcon = (iconName: string | null) => {
        if (!iconName) return Award
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Icon = (LucideIcons as any)[iconName]
        return Icon || Award
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Progreso de Logros</CardTitle>
                    <CardDescription>
                        Has desbloqueado {stats.earned} de {stats.total} logros
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${stats.total > 0 ? (stats.earned / stats.total) * 100 : 0}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium">
                            {stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0}%
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Achievements Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                    const Icon = getIcon(achievement.icon)
                    return (
                        <Card
                            key={achievement.id}
                            className={cn(
                                "transition-all",
                                !achievement.is_earned && "opacity-50 grayscale"
                            )}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        achievement.is_earned ? "bg-primary/10" : "bg-muted"
                                    )}>
                                        <Icon className={cn(
                                            "h-6 w-6",
                                            achievement.is_earned ? "text-primary" : "text-muted-foreground"
                                        )} />
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={tierColors[achievement.tier]}
                                    >
                                        {achievement.tier}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg">{achievement.name}</CardTitle>
                                <CardDescription>{achievement.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {achievement.is_earned && achievement.earned_at && (
                                    <p className="text-xs text-muted-foreground">
                                        Desbloqueado: {new Date(achievement.earned_at).toLocaleDateString()}
                                    </p>
                                )}
                                {!achievement.is_earned && (
                                    <p className="text-xs text-muted-foreground">
                                        🔒 Bloqueado
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
