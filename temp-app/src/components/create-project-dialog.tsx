"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, getRandomMemberColor } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { ColorPicker } from "@/components/color-picker"
import { EmojiPicker } from "@/components/emoji-picker"
import { UserMultiSelect } from "@/components/user-multi-select"
import { ENGINEERING_CATEGORIES } from "@/lib/project-constants"
import { checkAchievementsAndNotify } from "@/lib/achievements"

const projectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  category: z.string().min(1, "Please select a category"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  project_icon: z.string().min(1, "Please select an icon"),
  start_date: z.date(),
  end_date: z.date().optional(),
  max_users: z.coerce.number().min(1, "At least 1 user required"),
  is_public: z.boolean().default(false),
})

interface CreateProjectDialogProps {
  onSuccess: () => void
}

export function CreateProjectDialog({ onSuccess }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<string[]>([])

  const form = useForm<z.infer<typeof projectSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      title: "",
      category: "",
      description: "",
      color: "#6366f1",
      project_icon: "📁",
      max_users: 1,
      start_date: new Date(),
      is_public: false,
    },
  })

  async function onSubmit(values: z.infer<typeof projectSchema>) {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Create project and get the created project data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: values.title,
          category: values.category,
          description: values.description || null,
          color: values.color,
          project_icon: values.project_icon,
          owner_id: session.user.id,
          start_date: values.start_date.toISOString(),
          end_date: values.end_date ? values.end_date.toISOString() : null,
          max_users: values.max_users,
          is_public: values.is_public,
          status: 'active'
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Add owner as admin member of the project
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectData.id,
          user_id: session.user.id,
          role: 'admin',
          status: 'active', // Owner is active by default
          member_color: getRandomMemberColor()
        })

      if (memberError) throw memberError

      // Add invited members (pending status)
      if (invitedUsers.length > 0) {
        const invitations = invitedUsers.map(uid => ({
          project_id: projectData.id,
          user_id: uid,
          role: 'member',
          status: 'pending',
          member_color: getRandomMemberColor()
        }))

        const { error: inviteError } = await supabase
          .from('project_members')
          .insert(invitations)

        if (inviteError) {
          console.error("Error inviting users:", inviteError)
          toast.error("Proyecto creado, pero fallaron algunas invitaciones")
        }
      }

      toast.success("Proyecto creado exitosamente")

      // Check and unlock achievements for project creation
      await checkAchievementsAndNotify(session.user.id, 'project_created')

      setOpen(false)
      form.reset()
      setInvitedUsers([]) // Reset invitations
      onSuccess()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Error al crear proyecto", {
        description: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Add a new project to your dashboard.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Daily Inspection..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select engineering category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENGINEERING_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project objectives and goals..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of the project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Color</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Choose a color for your project card
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon Picker */}
            <FormField
              control={form.control}
              name="project_icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Icon</FormLabel>
                  <FormControl>
                    <EmojiPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Choose an icon for your project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date (Optional) */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date (optional)</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Expected completion date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invite Members */}
            <div className="space-y-2">
              <FormLabel>Invite Members</FormLabel>
              <UserMultiSelect
                selectedUsers={invitedUsers}
                onSelectionChange={setInvitedUsers}
              />
              <FormDescription>
                Select friends or search users to invite
              </FormDescription>
            </div>

            {/* Max Users */}
            <FormField
              control={form.control}
              name="max_users"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Users</FormLabel>
                  {/* ... existing select ... */}
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select max users" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'member' : 'members'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Maximum number of team members
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility Toggle */}
            <FormField
              control={form.control}
              name="is_public"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Public Project
                    </FormLabel>
                    <FormDescription>
                      Public projects are visible on your profile to everyone.
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
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
