'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRandomMemberColor } from '@/lib/utils'
import { checkAchievementsAndNotify } from '@/lib/achievements'

// =====================================================
// SCHEMAS DE VALIDACIÓN
// =====================================================

const createProjectSchema = z.object({
    title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
    category: z.string().min(1, 'Debes seleccionar una categoría'),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido'),
    project_icon: z.string().min(1, 'Debes seleccionar un ícono'),
    start_date: z.string().datetime(),
    end_date: z.string().datetime().optional(),
    max_users: z.number().min(1, 'Se requiere al menos 1 usuario'),
    is_public: z.boolean().default(false),
    work_group_id: z.string().uuid().optional(),
    invited_users: z.array(z.string().uuid()).optional(),
})

const updateProjectSchema = z.object({
    project_id: z.string().uuid(),
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    project_icon: z.string().optional(),
    end_date: z.string().datetime().optional(),
    max_users: z.number().min(1).optional(),
})

const updateProjectVisibilitySchema = z.object({
    project_id: z.string().uuid(),
    is_public: z.boolean(),
})

const transferProjectOwnershipSchema = z.object({
    project_id: z.string().uuid(),
    new_owner_id: z.string().uuid(),
})

const completeProjectSchema = z.object({
    project_id: z.string().uuid(),
    completion_date: z.string().datetime(),
})

// =====================================================
// TIPOS DE RESPUESTA
// =====================================================

type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string }

// =====================================================
// FUNCIONES HELPER
// =====================================================

async function canManageProject(
    supabase: any,
    userId: string,
    projectId: string
): Promise<boolean> {
    // Verificar si es owner del proyecto
    const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

    if (project?.owner_id === userId) return true

    // Verificar si es admin o manager del proyecto
    const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

    return member?.role === 'admin' || member?.role === 'manager'
}

// =====================================================
// SERVER ACTIONS
// =====================================================

/**
 * Crear un nuevo proyecto
 */
export async function createProject(
    data: z.infer<typeof createProjectSchema>
): Promise<ActionResult<{ id: string }>> {
    try {
        const supabase = await createClient()

        // Obtener usuario autenticado
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Validar datos
        const validated = createProjectSchema.parse(data)

        // Crear proyecto
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert({
                title: validated.title,
                category: validated.category,
                description: validated.description || null,
                color: validated.color,
                project_icon: validated.project_icon,
                owner_id: user.id,
                work_group_id: validated.work_group_id || null,
                start_date: validated.start_date,
                end_date: validated.end_date || null,
                max_users: validated.max_users,
                is_public: validated.is_public,
                status: 'active',
            })
            .select('id')
            .single()

        if (projectError) {
            console.error('Error creating project:', projectError)
            return { success: false, error: 'Error al crear el proyecto' }
        }

        // Añadir owner como admin member
        const { error: memberError } = await supabase
            .from('project_members')
            .insert({
                project_id: projectData.id,
                user_id: user.id,
                role: 'admin',
                status: 'active',
                member_color: getRandomMemberColor(),
            })

        if (memberError) {
            console.error('Error adding owner as member:', memberError)
            // Intentar eliminar el proyecto creado
            await supabase.from('projects').delete().eq('id', projectData.id)
            return { success: false, error: 'Error al configurar el proyecto' }
        }

        // Añadir miembros invitados (si hay)
        if (validated.invited_users && validated.invited_users.length > 0) {
            const invitations = validated.invited_users.map((uid) => ({
                project_id: projectData.id,
                user_id: uid,
                role: 'member' as const,
                status: 'pending' as const,
                member_color: getRandomMemberColor(),
            }))

            const { error: inviteError } = await supabase
                .from('project_members')
                .insert(invitations)

            if (inviteError) {
                console.error('Error inviting users:', inviteError)
                // No fallar, solo log
            }
        }

        // Check achievements
        await checkAchievementsAndNotify(user.id, 'project_created')

        // Revalidar caché
        revalidatePath('/dashboard')
        if (validated.work_group_id) {
            revalidatePath(`/groups/${validated.work_group_id}`)
        }

        return { success: true, data: { id: projectData.id } }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al crear el proyecto' }
    }
}

/**
 * Actualizar un proyecto existente
 */
export async function updateProject(
    data: z.infer<typeof updateProjectSchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = updateProjectSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProject(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para actualizar este proyecto',
            }
        }

        // Construir objeto de actualización
        const updateData: any = {}
        if (validated.title) updateData.title = validated.title
        if (validated.description !== undefined)
            updateData.description = validated.description
        if (validated.color) updateData.color = validated.color
        if (validated.project_icon) updateData.project_icon = validated.project_icon
        if (validated.end_date !== undefined) updateData.end_date = validated.end_date
        if (validated.max_users) updateData.max_users = validated.max_users

        // Actualizar proyecto
        const { error: updateError } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', validated.project_id)

        if (updateError) {
            console.error('Error updating project:', updateError)
            return { success: false, error: 'Error al actualizar el proyecto' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/projects/${validated.project_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al actualizar el proyecto' }
    }
}

/**
 * Actualizar visibilidad del proyecto (público/privado)
 */
export async function updateProjectVisibility(
    data: z.infer<typeof updateProjectVisibilitySchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = updateProjectVisibilitySchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProject(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para cambiar la visibilidad',
            }
        }

        // Actualizar visibilidad
        const { error: updateError } = await supabase
            .from('projects')
            .update({ is_public: validated.is_public })
            .eq('id', validated.project_id)

        if (updateError) {
            console.error('Error updating visibility:', updateError)
            return { success: false, error: 'Error al cambiar la visibilidad' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/projects/${validated.project_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado' }
    }
}

/**
 * Transferir propiedad del proyecto
 */
export async function transferProjectOwnership(
    data: z.infer<typeof transferProjectOwnershipSchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = transferProjectOwnershipSchema.parse(data)

        // Verificar que el usuario actual es el owner
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', validated.project_id)
            .single()

        if (!project || project.owner_id !== user.id) {
            return {
                success: false,
                error: 'Solo el propietario puede transferir el proyecto',
            }
        }

        // Verificar que el nuevo owner es miembro del proyecto
        const { data: newOwnerMember } = await supabase
            .from('project_members')
            .select('user_id, role')
            .eq('project_id', validated.project_id)
            .eq('user_id', validated.new_owner_id)
            .eq('status', 'active')
            .single()

        if (!newOwnerMember) {
            return {
                success: false,
                error: 'El nuevo propietario debe ser miembro activo del proyecto',
            }
        }

        // Transferir propiedad
        const { error: transferError } = await supabase
            .from('projects')
            .update({ owner_id: validated.new_owner_id })
            .eq('id', validated.project_id)

        if (transferError) {
            console.error('Error transferring ownership:', transferError)
            return { success: false, error: 'Error al transferir la propiedad' }
        }

        // Actualizar rol del nuevo owner a admin
        await supabase
            .from('project_members')
            .update({ role: 'admin' })
            .eq('project_id', validated.project_id)
            .eq('user_id', validated.new_owner_id)

        // Actualizar rol del antiguo owner a member
        await supabase
            .from('project_members')
            .update({ role: 'member' })
            .eq('project_id', validated.project_id)
            .eq('user_id', user.id)

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/projects/${validated.project_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al transferir' }
    }
}

/**
 * Marcar proyecto como completado
 */
export async function completeProject(
    data: z.infer<typeof completeProjectSchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = completeProjectSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProject(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para completar este proyecto',
            }
        }

        // Marcar como completado
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                status: 'completed',
                completion_date: validated.completion_date,
            })
            .eq('id', validated.project_id)

        if (updateError) {
            console.error('Error completing project:', updateError)
            return { success: false, error: 'Error al completar el proyecto' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/projects/${validated.project_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado' }
    }
}

/**
 * Eliminar proyecto
 */
export async function deleteProject(projectId: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Verificar que el usuario es el owner
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id, work_group_id')
            .eq('id', projectId)
            .single()

        if (!project || project.owner_id !== user.id) {
            return {
                success: false,
                error: 'Solo el propietario puede eliminar el proyecto',
            }
        }

        // Eliminar proyecto (cascada eliminará members, checkpoints, etc.)
        const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)

        if (deleteError) {
            console.error('Error deleting project:', deleteError)
            return { success: false, error: 'Error al eliminar el proyecto' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')
        if (project.work_group_id) {
            revalidatePath(`/groups/${project.work_group_id}`)
        }

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al eliminar el proyecto' }
    }
}
