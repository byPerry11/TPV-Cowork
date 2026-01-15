"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Image as ImageIcon, X } from "lucide-react"
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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabaseClient"

const checkpointSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  order: z.number().min(1, "Order must be at least 1"),
  is_vacant: z.boolean().default(false),
})

interface AddCheckpointDialogProps {
  projectId: string
  onSuccess: () => void
}

export function AddCheckpointDialog({ projectId, onSuccess }: AddCheckpointDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof checkpointSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(checkpointSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      order: 1,
      is_vacant: false,
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  async function onSubmit(values: z.infer<typeof checkpointSchema>) {
    setIsLoading(true)
    try {
      let imageUrl = null

      if (file) {
        const fileExt = file.name.split('.').pop()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const fileName = `Checkpoint_${projectId}_${timestamp}.${fileExt}`
        const filePath = `checkpoints/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('evidences') // Reusing evidences bucket for now
          .upload(filePath, file)

        if (uploadError) {
          console.warn("Upload failed:", uploadError)
          toast.error("File upload failed")
          // Continue without image or return? Let's continue but warn
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('evidences')
            .getPublicUrl(filePath)
          imageUrl = publicUrl
        }
      }

      const { error } = await supabase
        .from('checkpoints')
        .insert({
          project_id: projectId,
          title: values.title,
          description: values.description || null,
          order: values.order,
          is_completed: false,
          is_vacant: values.is_vacant,
          image_url: imageUrl
        })

      if (error) throw error

      toast.success("Task added successfully")
      setOpen(false)
      form.reset()
      setFile(null)
      onSuccess()

    } catch (error: any) {
      toast.error("Failed to add task", {
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
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Add Task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Create a new task for this project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed instructions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field} 
                        onChange={e => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem className="flex-1">
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      {file ? "Change" : "Upload"}
                    </Button>
                    <Input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </FormControl>
                {file && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <X className="h-3 w-3 cursor-pointer" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
                  </div>
                )}
              </FormItem>
            </div>


            <FormField
              control={form.control}
              name="is_vacant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Vacant Task</FormLabel>
                    <FormDescription>
                      Allow members to claim this task
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
