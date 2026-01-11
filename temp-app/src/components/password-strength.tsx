"use client"

import { useMemo } from "react"
import { Check, X } from "lucide-react"

interface PasswordStrengthProps {
    password: string
}

const requirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "Uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "Lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "Number", test: (pw: string) => /\d/.test(pw) },
    { label: "Special character (@$!%*?&)", test: (pw: string) => /[@$!%*?&]/.test(pw) },
]

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const strength = useMemo(() => {
        if (!password) return 0
        return requirements.filter(req => req.test(password)).length
    }, [password])

    const strengthPercentage = (strength / requirements.length) * 100

    const getStrengthColor = () => {
        if (strengthPercentage <= 20) return "bg-red-500"
        if (strengthPercentage <= 40) return "bg-orange-500"
        if (strengthPercentage <= 60) return "bg-yellow-500"
        if (strengthPercentage <= 80) return "bg-lime-500"
        return "bg-green-500"
    }

    const getStrengthLabel = () => {
        if (strengthPercentage <= 20) return "Very Weak"
        if (strengthPercentage <= 40) return "Weak"
        if (strengthPercentage <= 60) return "Fair"
        if (strengthPercentage <= 80) return "Strong"
        return "Very Strong"
    }

    if (!password) return null

    return (
        <div className="space-y-2 mt-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                        style={{ width: `${strengthPercentage}%` }}
                    />
                </div>
                <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                    {getStrengthLabel()}
                </span>
            </div>

            {/* Requirements checklist */}
            <div className="grid grid-cols-2 gap-1">
                {requirements.map((req, index) => {
                    const passed = req.test(password)
                    return (
                        <div
                            key={index}
                            className={`flex items-center gap-1 text-xs ${passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                }`}
                        >
                            {passed ? (
                                <Check className="h-3 w-3" />
                            ) : (
                                <X className="h-3 w-3" />
                            )}
                            <span>{req.label}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
