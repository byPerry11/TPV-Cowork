"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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

const evidenceSchema = z.object({
  note: z.string().optional(),
})

interface EvidenceFormProps {
  checkpointId: string
  onSuccess?: () => void
}

export function EvidenceForm({ checkpointId, onSuccess }: EvidenceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      note: "",
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  async function onSubmit(values: z.infer<typeof evidenceSchema>) {
    if (!values.note && !file) {
      toast.error("Requirement Missing", {
        description: "You must provide either a note or an image to complete this checkpoint."
      })
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("You must be logged in")
        return
      }

      let imageUrl = null

      // Upload Image if present
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${checkpointId}/${fileName}`

        // Assuming bucket 'evidences' exists.
        const { error: uploadError } = await supabase.storage
          .from('evidences')
          .upload(filePath, file)

        if (uploadError) {
          console.warn("Upload failed (bucket might be missing):", uploadError)
          // Don't fail the whole process if upload fails, unless strict. 
          // For now let's warn user but maybe continue? No, evidence is required.
           toast.error("Image upload failed. Please try again or just add a note.")
           setIsLoading(false)
           return
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('evidences')
            .getPublicUrl(filePath)
          imageUrl = publicUrl
        }
      }

      // Save Evidence Record
      const { error: dbError } = await supabase
        .from("evidences")
        .insert({
          checkpoint_id: checkpointId,
          user_id: session.user.id,
          note: values.note,
          image_url: imageUrl
        })

      if (dbError) {
        throw dbError
      }

      // Mark Checkpoint as Completed
      await supabase
        .from("checkpoints")
        .update({ is_completed: true })
        .eq("id", checkpointId)

      toast.success("Evidence submitted successfully!")
      form.reset()
      setFile(null)
      onSuccess?.()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error("Failed to submit evidence", {
        description: err.message
      })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-100 dark:border-blue-900">
             <p className="text-sm text-blue-800 dark:text-blue-300">
                To complete this task, please provide a photo evidence <strong>OR</strong> a note explaining the result.
             </p>
        </div>

        {/* Camera / File Input */}
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <FormLabel htmlFor="picture">Evidence Photo</FormLabel>
          <div className="flex items-center gap-2">
            <Input
              id="picture"
              type="file"
              accept="image/*"
              capture="environment" // Triigers camera on mobile
              onChange={handleFileChange}
            />
          </div>
          {file && <p className="text-sm text-green-600">Selected: {file.name}</p>}
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional if photo provided)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add observations..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Evidence & Complete
        </Button>
      </form>
    </Form>
  )
}
