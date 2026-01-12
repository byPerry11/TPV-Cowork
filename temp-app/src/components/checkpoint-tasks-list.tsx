"use client"

import { useState, useEffect } from "react"
import { CheckpointTask } from "@/types"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CheckpointTasksListProps {
  checkpointId: string
  canEdit: boolean // Any member can edit/add tasks as per requirement
  onTasksChange?: () => void
}

export function CheckpointTasksList({ checkpointId, canEdit, onTasksChange }: CheckpointTasksListProps) {
  const [tasks, setTasks] = useState<CheckpointTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [addingTask, setAddingTask] = useState(false)

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("checkpoint_tasks")
        .select("*")
        .eq("checkpoint_id", checkpointId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [checkpointId])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setAddingTask(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from("checkpoint_tasks")
        .insert({
          checkpoint_id: checkpointId,
          title: newTaskTitle.trim(),
          is_completed: false
        })

      if (error) throw error

      setNewTaskTitle("")
      fetchTasks()
      onTasksChange?.()
      toast.success("Task added")
    } catch (error) {
      console.error("Error adding task:", error)
      toast.error("Failed to add task")
    } finally {
      setAddingTask(false)
    }
  }

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, is_completed: !currentStatus } : t
      ))

      const updates = {
        is_completed: !currentStatus,
        completed_by: !currentStatus ? session.user.id : null,
        completed_at: !currentStatus ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from("checkpoint_tasks")
        .update(updates)
        .eq("id", taskId)

      if (error) throw error
      onTasksChange?.()
    } catch (error) {
      console.error("Error toggling task:", error)
      toast.error("Failed to update task")
      fetchTasks() // Revert
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId))

      const { error } = await supabase
        .from("checkpoint_tasks")
        .delete()
        .eq("id", taskId)

      if (error) throw error
      onTasksChange?.()
      toast.success("Task deleted")
    } catch (error) {
      console.error("Error deleting task:", error)
      toast.error("Failed to delete task")
      fetchTasks()
    }
  }

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center group gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox 
              checked={task.is_completed} 
              onCheckedChange={() => toggleTask(task.id, task.is_completed)}
              className="mt-0.5"
            />
            <span className={`flex-1 text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </span>
            {canEdit && (
              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-2">No verification points yet.</p>
        )}
      </div>

      {canEdit && (
        <form onSubmit={handleAddTask} className="flex gap-2 items-center px-1">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add verification point..."
            className="h-8 text-sm bg-background"
          />
          <Button 
            type="submit" 
            size="sm" 
            variant="secondary" 
            disabled={addingTask || !newTaskTitle.trim()}
            className="h-8 w-8 p-0"
          >
            {addingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </div>
  )
}
