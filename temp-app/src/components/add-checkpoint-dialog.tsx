"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, ListChecks } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"

const checkpointSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  order: z.coerce.number().min(1, "Order must be at least 1"),
})

interface AddCheckpointDialogProps {
    projectId: string
    onSuccess: () => void
}

export function AddCheckpointDialog({ projectId, onSuccess }: AddCheckpointDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(checkpointSchema),
    defaultValues: {
      title: "",
      order: 1,
    },
  })

  // Optional: Fetch next order number when opening (not implementing for complexity now)

  async function onSubmit(values: z.infer<typeof checkpointSchema>) {
    setIsLoading(true)
    try {
        const { error } = await supabase
            .from('checkpoints')
            .insert({
                project_id: projectId,
                title: values.title,
                order: values.order,
                is_completed: false
            })

        if (error) throw error

        toast.success("Checkpoint added successfully")
        setOpen(false)
        form.reset()
        onSuccess()
    } catch (error: any) {
        toast.error("Failed to add checkpoint", {
            description: error.message
        })
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Checkpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Checkpoint</DialogTitle>
          <DialogDescription>
            Add a new verification task to this project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Checkpoint Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Check Safety Valve..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} value={field.value as string | number} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Checkpoint
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
