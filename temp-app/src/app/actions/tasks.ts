'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Task, Role } from '@/types'

// =====================================================
// SCHEMAS DE VALIDACIÓN
// =====================================================

const createTaskSchema = z.object({
    work_group_id: z.string().uuid(),
    title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
    description: z.string().optional(),
    is_free: z.boolean(),
    member_limit: z.number().min(1).optional(),
})

const updateTaskSchema = z.object({
    task_id: z.string().uuid(),
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    member_limit: z.number().min(1).optional(),
})

const updateTaskStatusSchema = z.object({
    task_id: z.string().uuid(),
    status: z.enum(['pending', 'in_progress', 'completed']),
})

const assignMemberSchema = z.object({
    task_id: z.string().uuid(),
    user_id: z.string().uuid(),
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

async function getUserRole(supabase: any, userId: string, workGroupId: string): Promise<Role | null> {
    const { data, error } = await supabase
        .from('work_group_members')
        .select('role')
        .eq('work_group_id', workGroupId)
        .eq('user_id', userId)
        .single()

    if (error || !data) return null
    return data.role as Role
}

async function canManageTasks(supabase: any, userId: string, workGroupId: string): Promise<boolean> {
    const role = await getUserRole(supabase, userId, workGroupId)
    return role === 'admin' || role === 'manager'
}

// =====================================================
// SERVER ACTIONS
// =====================================================

/**
 * Crear una nueva tarea
 * Solo admins y managers pueden crear tareas
 */
export async function createTask(
    data: z.infer<typeof createTaskSchema>
): Promise<ActionResult<Task>> {
    try {
        const supabase = await createClient()

        // Obtener usuario autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Validar datos
        const validated = createTaskSchema.parse(data)

        // Verificar permisos
        const hasPermission = await canManageTasks(supabase, user.id, validated.work_group_id)
        if (!hasPermission) {
            return { success: false, error: 'No tienes permisos para crear tareas' }
        }

        // Validar member_limit solo si is_free es true
        if (validated.is_free && !validated.member_limit) {
            return { success: false, error: 'Las tareas libres deben tener un límite de miembros' }
        }

        // Crear tarea
        const { data: task, error } = await supabase
            .from('tasks')
            .insert({
                work_group_id: validated.work_group_id,
                title: validated.title,
                description: validated.description,
                is_free: validated.is_free,
                member_limit: validated.is_free ? validated.member_limit : null,
                created_by: user.id,
                status: 'pending',
            })
            .select(`
        *,
        assignments:task_assignments(
          user_id,
          assigned_at,
          user:profiles(username, avatar_url)
        )
      `)
            .single()

        if (error) {
            console.error('Error creating task:', error)
            return { success: false, error: 'Error al crear la tarea' }
        }

        // Revalidar caché
        revalidatePath(`/groups/${validated.work_group_id}`)

        return { success: true, data: task as Task }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al crear la tarea' }
    }
}

/**
 * Actualizar una tarea existente
 * Solo admins y managers pueden actualizar tareas
 */
export async function updateTask(
    data: z.infer<typeof updateTaskSchema>
): Promise<ActionResult<Task>> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = updateTaskSchema.parse(data)

        // Obtener la tarea para verificar permisos
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id, is_free, member_limit')
            .eq('id', validated.task_id)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar permisos
        const hasPermission = await canManageTasks(supabase, user.id, task.work_group_id)
        if (!hasPermission) {
            return { success: false, error: 'No tienes permisos para actualizar esta tarea' }
        }

        // Si se intenta reducir member_limit, verificar que no haya más asignados
        if (validated.member_limit && task.is_free) {
            const { count } = await supabase
                .from('task_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('task_id', validated.task_id)

            if (count && count > validated.member_limit) {
                return {
                    success: false,
                    error: `No puedes reducir el límite a ${validated.member_limit} porque ya hay ${count} miembros asignados`
                }
            }
        }

        // Actualizar tarea
        const updateData: any = {}
        if (validated.title) updateData.title = validated.title
        if (validated.description !== undefined) updateData.description = validated.description
        if (validated.member_limit) updateData.member_limit = validated.member_limit

        const { data: updatedTask, error: updateError } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', validated.task_id)
            .select(`
        *,
        assignments:task_assignments(
          user_id,
          assigned_at,
          user:profiles(username, avatar_url)
        )
      `)
            .single()

        if (updateError) {
            console.error('Error updating task:', updateError)
            return { success: false, error: 'Error al actualizar la tarea' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: updatedTask as Task }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al actualizar la tarea' }
    }
}

/**
 * Actualizar el estado de una tarea
 * Solo admins, managers o miembros asignados pueden cambiar el estado
 */
export async function updateTaskStatus(
    data: z.infer<typeof updateTaskStatusSchema>
): Promise<ActionResult<Task>> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = updateTaskStatusSchema.parse(data)

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id')
            .eq('id', validated.task_id)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar si es admin/manager o está asignado
        const isManager = await canManageTasks(supabase, user.id, task.work_group_id)

        const { data: assignment } = await supabase
            .from('task_assignments')
            .select('user_id')
            .eq('task_id', validated.task_id)
            .eq('user_id', user.id)
            .single()

        const isAssigned = !!assignment

        if (!isManager && !isAssigned) {
            return { success: false, error: 'No tienes permisos para cambiar el estado de esta tarea' }
        }

        // Actualizar estado
        const { data: updatedTask, error: updateError } = await supabase
            .from('tasks')
            .update({ status: validated.status })
            .eq('id', validated.task_id)
            .select(`
        *,
        assignments:task_assignments(
          user_id,
          assigned_at,
          user:profiles(username, avatar_url)
        )
      `)
            .single()

        if (updateError) {
            console.error('Error updating task status:', updateError)
            return { success: false, error: 'Error al actualizar el estado' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: updatedTask as Task }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al actualizar el estado' }
    }
}

/**
 * Eliminar una tarea
 * Solo admins y managers pueden eliminar tareas
 */
export async function deleteTask(taskId: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id')
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar permisos
        const hasPermission = await canManageTasks(supabase, user.id, task.work_group_id)
        if (!hasPermission) {
            return { success: false, error: 'No tienes permisos para eliminar esta tarea' }
        }

        // Eliminar tarea (las asignaciones se eliminan en cascada)
        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)

        if (deleteError) {
            console.error('Error deleting task:', deleteError)
            return { success: false, error: 'Error al eliminar la tarea' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al eliminar la tarea' }
    }
}

/**
 * Asignar un miembro a una tarea
 * Solo admins y managers pueden asignar miembros
 */
export async function assignMemberToTask(
    data: z.infer<typeof assignMemberSchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = assignMemberSchema.parse(data)

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id, is_free, member_limit')
            .eq('id', validated.task_id)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar permisos
        const hasPermission = await canManageTasks(supabase, user.id, task.work_group_id)
        if (!hasPermission) {
            return { success: false, error: 'No tienes permisos para asignar miembros' }
        }

        // Verificar que el usuario a asignar sea miembro del grupo
        const { data: memberCheck } = await supabase
            .from('work_group_members')
            .select('user_id')
            .eq('work_group_id', task.work_group_id)
            .eq('user_id', validated.user_id)
            .single()

        if (!memberCheck) {
            return { success: false, error: 'El usuario no es miembro del grupo' }
        }

        // Verificar límite de miembros si es tarea libre
        if (task.is_free && task.member_limit) {
            const { count } = await supabase
                .from('task_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('task_id', validated.task_id)

            if (count && count >= task.member_limit) {
                return { success: false, error: 'La tarea ha alcanzado el límite de miembros' }
            }
        }

        // Asignar miembro
        const { error: assignError } = await supabase
            .from('task_assignments')
            .insert({
                task_id: validated.task_id,
                user_id: validated.user_id,
            })

        if (assignError) {
            if (assignError.code === '23505') { // Unique constraint violation
                return { success: false, error: 'El miembro ya está asignado a esta tarea' }
            }
            console.error('Error assigning member:', assignError)
            return { success: false, error: 'Error al asignar el miembro' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al asignar el miembro' }
    }
}

/**
 * Desasignar un miembro de una tarea
 * Solo admins y managers pueden desasignar miembros
 */
export async function unassignMemberFromTask(
    data: z.infer<typeof assignMemberSchema>
): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const validated = assignMemberSchema.parse(data)

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id')
            .eq('id', validated.task_id)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar permisos
        const hasPermission = await canManageTasks(supabase, user.id, task.work_group_id)
        if (!hasPermission) {
            return { success: false, error: 'No tienes permisos para desasignar miembros' }
        }

        // Desasignar miembro
        const { error: unassignError } = await supabase
            .from('task_assignments')
            .delete()
            .eq('task_id', validated.task_id)
            .eq('user_id', validated.user_id)

        if (unassignError) {
            console.error('Error unassigning member:', unassignError)
            return { success: false, error: 'Error al desasignar el miembro' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al desasignar el miembro' }
    }
}

/**
 * Unirse a una tarea libre (auto-asignación)
 * Cualquier miembro del grupo puede unirse a tareas libres
 */
export async function joinTask(taskId: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id, is_free, member_limit')
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar que sea tarea libre
        if (!task.is_free) {
            return { success: false, error: 'Esta no es una tarea libre' }
        }

        // Verificar que el usuario sea miembro del grupo
        const { data: memberCheck } = await supabase
            .from('work_group_members')
            .select('user_id')
            .eq('work_group_id', task.work_group_id)
            .eq('user_id', user.id)
            .single()

        if (!memberCheck) {
            return { success: false, error: 'No eres miembro de este grupo' }
        }

        // Verificar límite de miembros
        if (task.member_limit) {
            const { count } = await supabase
                .from('task_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('task_id', taskId)

            if (count && count >= task.member_limit) {
                return { success: false, error: 'La tarea ha alcanzado el límite de miembros' }
            }
        }

        // Unirse a la tarea
        const { error: joinError } = await supabase
            .from('task_assignments')
            .insert({
                task_id: taskId,
                user_id: user.id,
            })

        if (joinError) {
            if (joinError.code === '23505') {
                return { success: false, error: 'Ya estás asignado a esta tarea' }
            }
            console.error('Error joining task:', joinError)
            return { success: false, error: 'Error al unirse a la tarea' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al unirse a la tarea' }
    }
}

/**
 * Salir de una tarea libre (auto-desasignación)
 * Cualquier miembro puede salir de tareas libres
 */
export async function leaveTask(taskId: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Obtener la tarea
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('work_group_id, is_free')
            .eq('id', taskId)
            .single()

        if (taskError || !task) {
            return { success: false, error: 'Tarea no encontrada' }
        }

        // Verificar que sea tarea libre
        if (!task.is_free) {
            return { success: false, error: 'Solo puedes salir de tareas libres' }
        }

        // Salir de la tarea
        const { error: leaveError } = await supabase
            .from('task_assignments')
            .delete()
            .eq('task_id', taskId)
            .eq('user_id', user.id)

        if (leaveError) {
            console.error('Error leaving task:', leaveError)
            return { success: false, error: 'Error al salir de la tarea' }
        }

        revalidatePath(`/groups/${task.work_group_id}`)

        return { success: true, data: undefined }
    } catch (error) {
        console.error('Unexpected error:', error)
        return { success: false, error: 'Error inesperado al salir de la tarea' }
    }
}
