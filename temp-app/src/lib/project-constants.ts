export const ENGINEERING_CATEGORIES = [
    { value: 'software', label: 'Software Engineering', emoji: '💻', color: '#6366f1' },
    { value: 'mechanical', label: 'Mechanical Engineering', emoji: '⚙️', color: '#f59e0b' },
    { value: 'electrical', label: 'Electrical Engineering', emoji: '⚡', color: '#eab308' },
    { value: 'civil', label: 'Civil Engineering', emoji: '🏗️', color: '#84cc16' },
    { value: 'chemical', label: 'Chemical Engineering', emoji: '🧪', color: '#10b981' },
    { value: 'industrial', label: 'Industrial Engineering', emoji: '🏭', color: '#14b8a6' },
    { value: 'aerospace', label: 'Aerospace Engineering', emoji: '✈️', color: '#06b6d4' },
    { value: 'biomedical', label: 'Biomedical Engineering', emoji: '🩺', color: '#ec4899' },
    { value: 'environmental', label: 'Environmental Engineering', emoji: '🌱', color: '#22c55e' },
    { value: 'petroleum', label: 'Petroleum Engineering', emoji: '⛽', color: '#f97316' },
    { value: 'other', label: 'Other', emoji: '📦', color: '#64748b' },
] as const

export const PROJECT_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#64748b' },
] as const

export const PROJECT_ICONS = [
    '📁', '📂', '📊', '📈', '📉', '💡', '🚀', '⚡',
    '🔬', '🧪', '⚙️', '🔧', '🔨', '🛠️', '🏗️', '🏭',
    '💻', '🖥️', '⌨️', '🖱️', '📱', '📡', '🛰️', '✈️',
    '🚗', '🚢', '🚁', '🔋', '💊', '🩺', '🌱', '🌍',
    '⛽', '🔥', '💧', '⚡', '☀️', '🌙', '⭐', '🎯',
    '📝', '📋', '📌', '📍', '🎨', '🎭', '🎪', '🎬',
] as const

export type EngineeringCategory = typeof ENGINEERING_CATEGORIES[number]['value']
export type ProjectColor = typeof PROJECT_COLORS[number]['value']
export type ProjectIcon = typeof PROJECT_ICONS[number]
