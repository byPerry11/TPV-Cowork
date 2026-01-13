import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"

/**
 * Tipos de acciones que disparan verificación de logros
 */
export type AchievementAction =
    | 'project_created'      // Primer Proyecto, Productivo, Experto, Master
    | 'checkpoint_completed' // Primer Éxito, Verificador  
    | 'project_joined'       // Colaborador, Equipo Fuerte

interface UnlockedAchievement {
    id: string
    name: string
    description: string | null
    icon: string | null
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

/**
 * Verifica y desbloquea logros basándose en una acción del usuario.
 * Retorna los logros recién desbloqueados para mostrar notificaciones.
 */
export async function checkAndUnlockAchievements(
    userId: string,
    action: AchievementAction
): Promise<UnlockedAchievement[]> {
    try {
        // Obtener todos los logros relacionados con esta acción
        const requirementTypes = getRequirementTypesForAction(action)

        const { data: achievements, error: achievementsError } = await supabase
            .from('achievements')
            .select('*')
            .in('requirement_type', requirementTypes)

        if (achievementsError || !achievements) {
            console.error("Error fetching achievements:", achievementsError)
            return []
        }

        // Obtener logros ya desbloqueados por el usuario
        const { data: userAchievements } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId)

        const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])

        // Filtrar solo logros no desbloqueados
        const pendingAchievements = achievements.filter(a => !earnedIds.has(a.id))

        if (pendingAchievements.length === 0) return []

        // Obtener conteo actual según la acción
        const count = await getCountForAction(userId, action)

        // Verificar cuáles logros se pueden desbloquear
        const toUnlock: UnlockedAchievement[] = []

        for (const achievement of pendingAchievements) {
            const requiredValue = achievement.requirement_value || 1

            if (count >= requiredValue) {
                // Insertar en user_achievements
                const { error: insertError } = await supabase
                    .from('user_achievements')
                    .insert({
                        user_id: userId,
                        achievement_id: achievement.id,
                        earned_at: new Date().toISOString()
                    })

                if (!insertError) {
                    toUnlock.push({
                        id: achievement.id,
                        name: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon,
                        tier: achievement.tier
                    })
                }
            }
        }

        return toUnlock
    } catch (error) {
        console.error("Error checking achievements:", error)
        return []
    }
}

/**
 * Mapea una acción a los tipos de requerimiento en la BD
 */
function getRequirementTypesForAction(action: AchievementAction): string[] {
    switch (action) {
        case 'project_created':
            return ['projects_created', 'project_created', 'projects']
        case 'checkpoint_completed':
            return ['checkpoints_completed', 'checkpoint_completed', 'checkpoints']
        case 'project_joined':
            return ['projects_joined', 'project_joined', 'collaborations']
        default:
            return []
    }
}

/**
 * Obtiene el conteo actual de la métrica relevante para la acción
 */
async function getCountForAction(userId: string, action: AchievementAction): Promise<number> {
    switch (action) {
        case 'project_created': {
            const { count } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', userId)
            return count || 0
        }
        case 'checkpoint_completed': {
            const { count } = await supabase
                .from('checkpoints')
                .select('*', { count: 'exact', head: true })
                .eq('completed_by', userId)
            return count || 0
        }
        case 'project_joined': {
            // Contar proyectos donde el usuario es miembro activo pero NO es owner
            const { data: memberProjects } = await supabase
                .from('project_members')
                .select('project_id, projects!inner(owner_id)')
                .eq('user_id', userId)
                .eq('status', 'active')

            // Filtrar los que no son owner
            const joinedCount = memberProjects?.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (mp: any) => mp.projects?.owner_id !== userId
            ).length || 0

            return joinedCount
        }
        default:
            return 0
    }
}

/**
 * Muestra notificaciones de toast para logros desbloqueados
 */
export function showAchievementToasts(unlockedAchievements: UnlockedAchievement[]) {
    for (const achievement of unlockedAchievements) {
        const tierEmoji = {
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇',
            platinum: '💎'
        }[achievement.tier]

        toast.success(`${tierEmoji} ¡Logro Desbloqueado!`, {
            description: `${achievement.name}: ${achievement.description || ''}`,
            duration: 5000,
        })
    }
}

/**
 * Helper function que combina verificación y notificación
 */
export async function checkAchievementsAndNotify(
    userId: string,
    action: AchievementAction
): Promise<void> {
    const unlocked = await checkAndUnlockAchievements(userId, action)
    if (unlocked.length > 0) {
        showAchievementToasts(unlocked)
    }
}
