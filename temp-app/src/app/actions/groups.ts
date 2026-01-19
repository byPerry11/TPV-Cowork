'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =====================================================
// SCHEMAS DE VALIDACIÓN
// =====================================================

const createGroupSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    description: z.string().optional(),
})

const updateGroupSchema = z.object({
    group_id: z.string().uuid(),
    name: z.string().min(3).optional(),
    description: z.string().optional(),
})

const transferGroupOwnershipSchema = z.object({
    group_id: z.string().uuid(),
    new_owner_id: z.string().uuid(),
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

async function canManageGroup(
    supabase: any,
    userId: string,
    groupId: string
): Promise<boolean> {
    // Verificar si es owner del grupo
    const { data: group } = await supabase
        .from('work_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single()

    if (group?.owner_id === userId) return true

    // Verificar si es admin del grupo
    const { data: member } = await supabase
        .from('work_group_members')
        .select('role')
        .eq('work_group_id', groupId)
        .eq('user_id', userId)
        .single()

    return member?.role === 'admin'
}

// =====================================================
// SERVER ACTIONS
// =====================================================

/**
 * Crear un nuevo grupo de trabajo
 */
export async function createGroup(
    data: z.infer<typeof createGroupSchema>
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
        const validated = createGroupSchema.parse(data)

        // Crear grupo
        const { data: groupData, error: groupError } = await supabase
            .from('work_groups')
            .insert({
                name: validated.name,
                description: validated.description || null,
                owner_id: user.id,
            })
            .select('id')
            .single()

        if (groupError) {
            console.error('Error creating group:', groupError)
            return { success: false, error: 'Error al crear el grupo' }
        }

        // Añadir owner como admin member
        const { error: memberError } = await supabase
            .from('work_group_members')
            .insert({
                work_group_id: groupData.id,
                user_id: user.id,
                role: 'admin',
            })

        if (memberError) {
            console.error('Error adding owner as member:', memberError)
            // Intentar eliminar el grupo creado
            await supabase.from('work_groups').delete().eq('id', groupData.id)
            return { success: false, error: 'Error al configurar el grupo' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')

        return { success: true, data: { id: groupData.id } }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al crear el grupo' }
    }
}

/**
 * Actualizar un grupo existente
 */
export async function updateGroup(
    data: z.infer<typeof updateGroupSchema>
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

        const validated = updateGroupSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageGroup(
            supabase,
            user.id,
            validated.group_id
        )
        if (!hasPermission) {
            return {
                success: false,
                error: 'No tienes permisos para actualizar este grupo',
            }
        }

        // Construir objeto de actualización
        const updateData: any = {}
        if (validated.name) updateData.name = validated.name
        if (validated.description !== undefined)
            updateData.description = validated.description

        // Actualizar grupo
        const { error: updateError } = await supabase
            .from('work_groups')
            .update(updateData)
            .eq('id', validated.group_id)

        if (updateError) {
            console.error('Error updating group:', updateError)
            return { success: false, error: 'Error al actualizar el grupo' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/groups/${validated.group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al actualizar el grupo' }
    }
}

/**
 * Transferir propiedad del grupo
 */
export async function transferGroupOwnership(
    data: z.infer<typeof transferGroupOwnershipSchema>
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

        const validated = transferGroupOwnershipSchema.parse(data)

        // Verificar que el usuario actual es el owner
        const { data: group } = await supabase
            .from('work_groups')
            .select('owner_id')
            .eq('id', validated.group_id)
            .single()

        if (!group || group.owner_id !== user.id) {
            return {
                success: false,
                error: 'Solo el propietario puede transferir el grupo',
            }
        }

        // Verificar que el nuevo owner es miembro del grupo
        const { data: newOwnerMember } = await supabase
            .from('work_group_members')
            .select('user_id, role')
            .eq('work_group_id', validated.group_id)
            .eq('user_id', validated.new_owner_id)
            .single()

        if (!newOwnerMember) {
            return {
                success: false,
                error: 'El nuevo propietario debe ser miembro del grupo',
            }
        }

        // Transferir propiedad
        const { error: transferError } = await supabase
            .from('work_groups')
            .update({ owner_id: validated.new_owner_id })
            .eq('id', validated.group_id)

        if (transferError) {
            console.error('Error transferring ownership:', transferError)
            return { success: false, error: 'Error al transferir la propiedad' }
        }

        // Actualizar rol del nuevo owner a admin
        await supabase
            .from('work_group_members')
            .update({ role: 'admin' })
            .eq('work_group_id', validated.group_id)
            .eq('user_id', validated.new_owner_id)

        // Actualizar rol del antiguo owner a admin también (puede seguir siendo admin)
        await supabase
            .from('work_group_members')
            .update({ role: 'admin' })
            .eq('work_group_id', validated.group_id)
            .eq('user_id', user.id)

        // Revalidar caché
        revalidatePath('/dashboard')
        revalidatePath(`/groups/${validated.group_id}`)

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
 * Eliminar grupo
 */
export async function deleteGroup(groupId: string): Promise<ActionResult> {
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
        const { data: group } = await supabase
            .from('work_groups')
            .select('owner_id')
            .eq('id', groupId)
            .single()

        if (!group || group.owner_id !== user.id) {
            return {
                success: false,
                error: 'Solo el propietario puede eliminar el grupo',
            }
        }

        // Eliminar grupo (cascada eliminará members, projects, etc.)
        const { error: deleteError } = await supabase
            .from('work_groups')
            .delete()
            .eq('id', groupId)

        if (deleteError) {
            console.error('Error deleting group:', deleteError)
            return { success: false, error: 'Error al eliminar el grupo' }
        }

        // Revalidar caché
        revalidatePath('/dashboard')

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al eliminar el grupo' }
    }
}
