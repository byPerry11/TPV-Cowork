"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSameDay, format, parseISO } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"

// Exact same interface as in page.tsx to match
interface MemberProfile {
    user_id: string;
    role: string;
    status: string;
    member_color?: string;
    profile: {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
    } | null;
}

interface ProjectCalendarProps {
    projectId: string
    startDate: Date
    endDate?: Date
    className?: string
    members: MemberProfile[]
}

export function ProjectCalendar({ projectId, startDate, endDate, members, className }: ProjectCalendarProps) {
    const [completedDates, setCompletedDates] = useState<{ date: Date, color: string, userId: string }[]>([])

    useEffect(() => {
        const fetchCompletedCheckpoints = async () => {
            const { data } = await supabase
                .from('checkpoints')
                .select('completed_at, completed_by')
                .eq('project_id', projectId)
                .eq('is_completed', true)
                .not('completed_at', 'is', null)

            if (data) {
                // Map to dates with colors
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dates = data.map((cp: any) => {
                    const completer = members.find((m) => m.user_id === cp.completed_by)
                    const color = completer ? (completer.role === 'admin' ? '#a855f7' : (completer.member_color || '#808080')) : '#808080'
                    return {
                        date: parseISO(cp.completed_at),
                        color,
                        userId: cp.completed_by
                    }
                })
                setCompletedDates(dates)
            }
        }

        if (projectId) {
            fetchCompletedCheckpoints()
        }
    }, [projectId, members])

    // Create dynamic modifiers
    const userModifiers: Record<string, Date[]> = {}
    const userStyles: Record<string, React.CSSProperties> = {}

    completedDates.forEach(item => {
        const key = `user_${item.userId}`
        if (!userModifiers[key]) {
            userModifiers[key] = []
            userStyles[key] = {
                backgroundColor: item.color,
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '100%' // Circle
            }
        }
        // Avoid duplicates if multiple checkpoints same day same user
        if (!userModifiers[key].some(d => isSameDay(d, item.date))) {
            userModifiers[key].push(item.date)
        }
    })

    const modifiers = {
        start: startDate,
        end: endDate || undefined,
        ...userModifiers
    }

    const modifiersStyles = {
        start: { color: 'white', backgroundColor: '#22c55e' }, // Green overrides
        end: { color: 'white', backgroundColor: '#ef4444' },   // Red overrides
        ...userStyles
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                    Project Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex flex-col items-center">
                <Calendar
                    mode="single"
                    defaultMonth={startDate}
                    modifiers={modifiers as any}
                    modifiersStyles={modifiersStyles}
                    className="rounded-md border shadow-sm w-full flex justify-center p-2"
                />

                <div className="flex flex-col gap-2 mt-4 w-full text-xs text-muted-foreground px-2">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            Start: {format(startDate, "PP")}
                        </span>
                    </div>
                    {endDate && (
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                End: {format(endDate, "PP")}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
