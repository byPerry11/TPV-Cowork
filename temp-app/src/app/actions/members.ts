'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRandomMemberColor } from '@/lib/utils'

// =====================================================
// SCHEMAS DE VALIDACIÓN
// =====================================================

const inviteMemberToProjectSchema = z.object({
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.enum(['admin', 'manager', 'member']).default('member'),
})

const removeMemberFromProjectSchema = z.object({
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
})

const updateMemberRoleSchema = z.object({
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
    new_role: z.enum(['admin', 'manager', 'member']),
})

const respondToInvitationSchema = z.object({
    project_id: z.string().uuid(),
    accept: z.boolean(),
})

const leaveProjectSchema = z.object({
    project_id: z.string().uuid(),
})

const inviteMemberToGroupSchema = z.object({
    group_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.enum(['admin', 'manager', 'member']).default('member'),
})

const removeMemberFromGroupSchema = z.object({
    group_id: z.string().uuid(),
    user_id: z.string().uuid(),
})

const updateGroupMemberRoleSchema = z.object({
    group_id: z.string().uuid(),
    user_id: z.string().uuid(),
    new_role: z.enum(['admin', 'manager', 'member']),
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

async function canManageProjectMembers(
    supabase: any,
    userId: string,
    projectId: string
): Promise<boolean> {
    const { data: project } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

    if (project?.owner_id === userId) return true

    const { data: member } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

    return member?.role === 'admin' || member?.role === 'manager'
}

async function canManageGroupMembers(
    supabase: any,
    userId: string,
    groupId: string
): Promise<boolean> {
    const { data: group } = await supabase
        .from('work_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single()

    if (group?.owner_id === userId) return true

    const { data: member } = await supabase
        .from('work_group_members')
        .select('role')
        .eq('work_group_id', groupId)
        .eq('user_id', userId)
        .single()

    return member?.role === 'admin' || member?.role === 'manager'
}

// =====================================================
// SERVER ACTIONS - PROYECTOS
// =====================================================

/**
 * Invitar miembro a proyecto
 */
export async function inviteMemberToProject(
    data: z.infer<typeof inviteMemberToProjectSchema>
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

        const validated = inviteMemberToProjectSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProjectMembers(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para invitar miembros',
            }
        }

        // Verificar que el usuario no sea ya miembro
        const { data: existingMember } = await supabase
            .from('project_members')
            .select('status')
            .eq('project_id', validated.project_id)
            .eq('user_id', validated.user_id)
            .single()

        if (existingMember) {
            if (existingMember.status === 'active') {
                return { success: false, error: 'El usuario ya es miembro del proyecto' }
            }
            if (existingMember.status === 'pending') {
                return { success: false, error: 'El usuario ya tiene una invitación pendiente' }
            }
        }

        // Verificar límite de miembros
        const { data: project } = await supabase
            .from('projects')
            .select('max_users')
            .eq('id', validated.project_id)
            .single()

        const { count } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', validated.project_id)
            .eq('status', 'active')

        if (count && project && count >= project.max_users) {
            return { success: false, error: 'El proyecto ha alcanzado el límite de miembros' }
        }

        // Crear invitación
        const { error: inviteError } = await supabase
            .from('project_members')
            .insert({
                project_id: validated.project_id,
                user_id: validated.user_id,
                role: validated.role,
                status: 'pending',
                member_color: getRandomMemberColor(),
            })

        if (inviteError) {
            console.error('Error inviting member:', inviteError)
            return { success: false, error: 'Error al enviar la invitación' }
        }

        // Revalidar caché
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
 * Remover miembro de proyecto
 */
export async function removeMemberFromProject(
    data: z.infer<typeof removeMemberFromProjectSchema>
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

        const validated = removeMemberFromProjectSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProjectMembers(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para remover miembros',
            }
        }

        // No permitir remover al owner
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', validated.project_id)
            .single()

        if (project?.owner_id === validated.user_id) {
            return { success: false, error: 'No puedes remover al propietario del proyecto' }
        }

        // Remover miembro
        const { error: removeError } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', validated.project_id)
            .eq('user_id', validated.user_id)

        if (removeError) {
            console.error('Error removing member:', removeError)
            return { success: false, error: 'Error al remover el miembro' }
        }

        // Revalidar caché
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
 * Actualizar rol de miembro
 */
export async function updateMemberRole(
    data: z.infer<typeof updateMemberRoleSchema>
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

        const validated = updateMemberRoleSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageProjectMembers(
            supabase,
            user.id,
            validated.project_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para cambiar roles',
            }
        }

        // No permitir cambiar rol del owner
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', validated.project_id)
            .single()

        if (project?.owner_id === validated.user_id) {
            return { success: false, error: 'No puedes cambiar el rol del propietario' }
        }

        // Actualizar rol
        const { error: updateError } = await supabase
            .from('project_members')
            .update({ role: validated.new_role })
            .eq('project_id', validated.project_id)
            .eq('user_id', validated.user_id)

        if (updateError) {
            console.error('Error updating role:', updateError)
            return { success: false, error: 'Error al actualizar el rol' }
        }

        // Revalidar caché
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
 * Aceptar o rechazar invitación a proyecto
 */
export async function respondToProjectInvitation(
    data: z.infer<typeof respondToInvitationSchema>
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

        const validated = respondToInvitationSchema.parse(data)

        if (validated.accept) {
            // Aceptar invitación
            const { error: acceptError } = await supabase
                .from('project_members')
                .update({ status: 'active' })
                .eq('project_id', validated.project_id)
                .eq('user_id', user.id)
                .eq('status', 'pending')

            if (acceptError) {
                console.error('Error accepting invitation:', acceptError)
                return { success: false, error: 'Error al aceptar la invitación' }
            }
        } else {
            // Rechazar invitación
            const { error: rejectError } = await supabase
                .from('project_members')
                .update({ status: 'rejected' })
                .eq('project_id', validated.project_id)
                .eq('user_id', user.id)
                .eq('status', 'pending')

            if (rejectError) {
                console.error('Error rejecting invitation:', rejectError)
                return { success: false, error: 'Error al rechazar la invitación' }
            }
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
 * Salir de un proyecto
 */
export async function leaveProject(
    data: z.infer<typeof leaveProjectSchema>
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

        const validated = leaveProjectSchema.parse(data)

        // Verificar que no sea el owner
        const { data: project } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', validated.project_id)
            .single()

        if (project?.owner_id === user.id) {
            return {
                success: false,
                error: 'El propietario no puede salir del proyecto. Transfiere la propiedad primero.',
            }
        }

        // Salir del proyecto
        const { error: leaveError } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', validated.project_id)
            .eq('user_id', user.id)

        if (leaveError) {
            console.error('Error leaving project:', leaveError)
            return { success: false, error: 'Error al salir del proyecto' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado' }
    }
}

// =====================================================
// SERVER ACTIONS - GRUPOS
// =====================================================

/**
 * Invitar miembro a grupo
 */
export async function inviteMemberToGroup(
    data: z.infer<typeof inviteMemberToGroupSchema>
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

        const validated = inviteMemberToGroupSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageGroupMembers(
            supabase,
            user.id,
            validated.group_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para invitar miembros',
            }
        }

        // Verificar que el usuario no sea ya miembro
        const { data: existingMember } = await supabase
            .from('work_group_members')
            .select('user_id')
            .eq('work_group_id', validated.group_id)
            .eq('user_id', validated.user_id)
            .single()

        if (existingMember) {
            return { success: false, error: 'El usuario ya es miembro del grupo' }
        }

        // Añadir miembro
        const { error: addError } = await supabase
            .from('work_group_members')
            .insert({
                work_group_id: validated.group_id,
                user_id: validated.user_id,
                role: validated.role,
            })

        if (addError) {
            console.error('Error adding member:', addError)
            return { success: false, error: 'Error al añadir el miembro' }
        }

        // Revalidar caché
        revalidatePath(`/groups/${validated.group_id}`)

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
 * Remover miembro de grupo
 */
export async function removeMemberFromGroup(
    data: z.infer<typeof removeMemberFromGroupSchema>
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

        const validated = removeMemberFromGroupSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageGroupMembers(
            supabase,
            user.id,
            validated.group_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para remover miembros',
            }
        }

        // No permitir remover al owner
        const { data: group } = await supabase
            .from('work_groups')
            .select('owner_id')
            .eq('id', validated.group_id)
            .single()

        if (group?.owner_id === validated.user_id) {
            return { success: false, error: 'No puedes remover al propietario del grupo' }
        }

        // Remover miembro
        const { error: removeError } = await supabase
            .from('work_group_members')
            .delete()
            .eq('work_group_id', validated.group_id)
            .eq('user_id', validated.user_id)

        if (removeError) {
            console.error('Error removing member:', removeError)
            return { success: false, error: 'Error al remover el miembro' }
        }

        // Revalidar caché
        revalidatePath(`/groups/${validated.group_id}`)

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
 * Actualizar rol de miembro en grupo
 */
export async function updateGroupMemberRole(
    data: z.infer<typeof updateGroupMemberRoleSchema>
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

        const validated = updateGroupMemberRoleSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageGroupMembers(
            supabase,
            user.id,
            validated.group_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para cambiar roles',
            }
        }

        // No permitir cambiar rol del owner
        const { data: group } = await supabase
            .from('work_groups')
            .select('owner_id')
            .eq('id', validated.group_id)
            .single()

        if (group?.owner_id === validated.user_id) {
            return { success: false, error: 'No puedes cambiar el rol del propietario' }
        }

        // Actualizar rol
        const { error: updateError } = await supabase
            .from('work_group_members')
            .update({ role: validated.new_role })
            .eq('work_group_id', validated.group_id)
            .eq('user_id', validated.user_id)

        if (updateError) {
            console.error('Error updating role:', updateError)
            return { success: false, error: 'Error al actualizar el rol' }
        }

        // Revalidar caché
        revalidatePath(`/groups/${validated.group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado' }
    }
}
