"use client"

import { useState } from "react"
import { PROJECT_ICONS } from "@/lib/project-constants"
import { cn } from "@/lib/utils"

interface EmojiPickerProps {
    value: string
    onChange: (emoji: string) => void
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
    const [selectedEmoji, setSelectedEmoji] = useState(value || PROJECT_ICONS[0])

    const handleEmojiChange = (emoji: string) => {
        setSelectedEmoji(emoji)
        onChange(emoji)
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-2 border rounded-md">
                {PROJECT_ICONS.map((emoji, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleEmojiChange(emoji)}
                        className={cn(
                            "h-10 w-10 flex items-center justify-center text-2xl rounded-md transition-all hover:scale-110 hover:bg-muted",
                            selectedEmoji === emoji && "bg-primary/10 ring-2 ring-primary"
                        )}
                        title={emoji}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <div className="h-10 w-10 flex items-center justify-center text-2xl border rounded-md flex-shrink-0">
                    {selectedEmoji}
                </div>
                <input
                    type="text"
                    value={selectedEmoji}
                    onChange={(e) => handleEmojiChange(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    placeholder="📁"
                    maxLength={2}
                />
            </div>
        </div>
    )
}
