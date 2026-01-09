"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { PROJECT_COLORS } from "@/lib/project-constants"

interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
    const [selectedColor, setSelectedColor] = useState(value || PROJECT_COLORS[0].value)

    const handleColorChange = (color: string) => {
        setSelectedColor(color)
        onChange(color)
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-8 gap-2">
                {PROJECT_COLORS.map((color) => (
                    <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorChange(color.value)}
                        className={cn(
                            "h-10 w-10 rounded-md border-2 transition-all hover:scale-110",
                            selectedColor === color.value
                                ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                                : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                    >
                        {selectedColor === color.value && (
                            <Check className="h-5 w-5 text-white mx-auto drop-shadow-md" />
                        )}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <div
                    className="h-10 w-10 rounded-md border flex-shrink-0"
                    style={{ backgroundColor: selectedColor }}
                />
                <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
                    placeholder="#6366f1"
                    maxLength={7}
                />
            </div>
        </div>
    )
}
