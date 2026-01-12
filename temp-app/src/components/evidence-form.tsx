"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, Camera, Paperclip, X, Save, AlertTriangle, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const evidenceSchema = z.object({
  note: z.string().optional(),
})

interface EvidenceFormProps {
  checkpointId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function EvidenceForm({ checkpointId, onSuccess, onCancel }: EvidenceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      note: "",
    },
  })

  // Watch for changes to warn on exit
  const noteContent = form.watch("note")
  const hasChanges = !!noteContent || !!file

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedAlert(true)
    } else {
      onCancel?.()
    }
  }

  async function onSubmit(values: z.infer<typeof evidenceSchema>) {
    if (!values.note && !file) {
      toast.error("Empty Submission", {
        description: "Please provide a note, or attach a photo/document."
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

      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${checkpointId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('evidences')
          .upload(filePath, file)

        if (uploadError) {
          console.warn("Upload failed:", uploadError)
          toast.error("File upload failed. Please try again.")
          setIsLoading(false)
          return
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('evidences')
            .getPublicUrl(filePath)
          imageUrl = publicUrl
        }
      }

      const { error: dbError } = await supabase
        .from("evidences")
        .insert({
          checkpoint_id: checkpointId,
          user_id: session.user.id,
          note: values.note,
          image_url: imageUrl
        })

      if (dbError) throw dbError

      await supabase
        .from("checkpoints")
        .update({
          is_completed: true,
          completed_by: session.user.id,
          completed_at: new Date().toISOString()
        })
        .eq("id", checkpointId)

      toast.success("Evidence saved successfully!")
      form.reset()
      setFile(null)
      onSuccess?.()
    } catch (err: any) {
      toast.error("Failed to save evidence", {
        description: err.message
      })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="relative flex flex-col gap-4"
          onDragEnter={handleDrag}
        >
          {/* Drag Overlay */}
          {dragActive && (
            <div 
              className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-sm"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-xl font-medium text-primary">Drop file here</div>
            </div>
          )}

          <div className={`
            flex flex-col gap-2 p-4 rounded-xl border-2 transition-colors min-h-[200px]
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 bg-card'}
          `}>
            
            {/* Text Input Area */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      placeholder="Type your notes here..."
                      className="resize-none border-none shadow-none focus-visible:ring-0 p-0 text-base min-h-[120px] bg-transparent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Preview */}
            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border text-sm max-w-fit animate-in fade-in slide-in-from-bottom-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t pt-3 mt-auto">
              <div className="flex items-center gap-2">
                {/* Photo Button (Mobile optimized) */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => cameraInputRef.current?.click()}
                  title="Take Photo"
                >
                  <Camera className="h-5 w-5" />
                </Button>

                {/* File/Image Upload */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach File"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <div className="hidden">
                  <Input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                  />
                  <Input
                    ref={fileInputRef}
                    type="file" // Allow all files or restrict? "attach documents" usually implies broad support
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={handleCancel}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={isLoading || (!noteContent && !file)}
                  className="gap-1.5 rounded-full px-4"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Evidence
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved content. Are you sure you want to discard your changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowUnsavedAlert(false)
                onCancel?.()
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
