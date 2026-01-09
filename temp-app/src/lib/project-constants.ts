export const ENGINEERING_CATEGORIES = [
    { value: 'software', label: 'Software', emoji: '💻', color: '#6366f1' },
    { value: 'mechanical', label: 'Mechanical', emoji: '⚙️', color: '#f59e0b' },
    { value: 'electrical', label: 'Electrical', emoji: '⚡', color: '#eab308' },
    { value: 'civil', label: 'Civil', emoji: '🏗️', color: '#84cc16' },
    { value: 'chemical', label: 'Chemical', emoji: '🧪', color: '#10b981' },
    { value: 'industrial', label: 'Industrial', emoji: '🏭', color: '#14b8a6' },
    { value: 'aerospace', label: 'Aerospace', emoji: '✈️', color: '#06b6d4' },
    { value: 'biomedical', label: 'Biomedical', emoji: '🩺', color: '#ec4899' },
    { value: 'monitoring', label: 'Monitorización', emoji: '📊', color: '#8b5cf6' },
    { value: '3d_design', label: 'Diseño 3D', emoji: '🧊', color: '#ec4899' },
    { value: 'maker', label: 'Maker', emoji: '🛠️', color: '#f97316' },
    { value: 'optimization', label: 'Optimización', emoji: '📈', color: '#14b8a6' },
    { value: 'continuous_improvement', label: 'Mejora Continua', emoji: '🔄', color: '#22c55e' },
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
