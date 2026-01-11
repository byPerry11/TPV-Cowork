"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Settings,
    Loader2,
    AlertTriangle,
    Trash2,
    UserMinus,
    User,
    Crown,
    Eye,
    EyeOff,
    ArrowRightLeft,
    Save,
} from "lucide-react"
import { toast } from "sonner"
import { Project } from "@/types"
import { ENGINEERING_CATEGORIES } from "@/lib/project-constants"

interface Member {
    user_id: string
    role: "admin" | "manager" | "member"
    status: "pending" | "active" | "rejected" | "left"
    profile: {
        username: string | null
        display_name: string | null
        avatar_url: string | null
    } | null
}

interface ProjectSettingsDialogProps {
    project: Project
    members: Member[]
    isOwner: boolean
    onProjectUpdate?: () => void
}

export function ProjectSettingsDialog({
    project,
    members,
    isOwner,
    onProjectUpdate
}: ProjectSettingsDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // General tab state
    const [title, setTitle] = useState(project.title)
    const [description, setDescription] = useState(project.description || "")
    const [category, setCategory] = useState(project.category || "")
    const [projectIcon, setProjectIcon] = useState(project.project_icon || "📁")

    // Danger zone state
    const [isPublic, setIsPublic] = useState(project.is_public ?? false)
    const [confirmTitle, setConfirmTitle] = useState("")
    const [transferToUserId, setTransferToUserId] = useState<string | null>(null)

    // Confirmation dialogs
    const [kickMemberId, setKickMemberId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showTransferConfirm, setShowTransferConfirm] = useState(false)

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setTitle(project.title)
            setDescription(project.description || "")
            setCategory(project.category || "")
            setProjectIcon(project.project_icon || "📁")
            setIsPublic(project.is_public ?? false)
            setConfirmTitle("")
            setTransferToUserId(null)
        }
    }, [open, project])

    const activeMembers = members.filter(m => m.status === 'active' && m.role !== 'admin')

    // Save general info
    const handleSaveGeneral = async () => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    title,
                    description,
                    category,
                    project_icon: projectIcon,
                })
                .eq('id', project.id)

            if (error) throw error

            toast.success("Project updated successfully")
            onProjectUpdate?.()
        } catch (error: any) {
            toast.error("Failed to update project", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Toggle visibility
    const handleToggleVisibility = async () => {
        setIsLoading(true)
        try {
            const newVisibility = !isPublic
            const { error } = await supabase
                .from('projects')
                .update({ is_public: newVisibility })
                .eq('id', project.id)

            if (error) throw error

            setIsPublic(newVisibility)
            toast.success(newVisibility ? "Project is now public" : "Project is now private")
            onProjectUpdate?.()
        } catch (error: any) {
            toast.error("Failed to update visibility", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Kick member
    const handleKickMember = async (userId: string) => {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('project_members')
                .update({ status: 'left' })
                .eq('project_id', project.id)
                .eq('user_id', userId)

            if (error) throw error

            toast.success("Member removed from project")
            setKickMemberId(null)
            onProjectUpdate?.()
        } catch (error: any) {
            toast.error("Failed to remove member", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Transfer ownership
    const handleTransferOwnership = async () => {
        if (!transferToUserId) return

        setIsLoading(true)
        try {
            // Update the project owner
            const { error: projectError } = await supabase
                .from('projects')
                .update({ owner_id: transferToUserId })
                .eq('id', project.id)

            if (projectError) throw projectError

            // Update roles: new owner becomes admin, old owner becomes member
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Update new owner to admin
                await supabase
                    .from('project_members')
                    .update({ role: 'admin' })
                    .eq('project_id', project.id)
                    .eq('user_id', transferToUserId)

                // Update old owner to member
                await supabase
                    .from('project_members')
                    .update({ role: 'member' })
                    .eq('project_id', project.id)
                    .eq('user_id', user.id)
            }

            toast.success("Ownership transferred successfully")
            setShowTransferConfirm(false)
            setOpen(false)
            onProjectUpdate?.()
        } catch (error: any) {
            toast.error("Failed to transfer ownership", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    // Delete project
    const handleDeleteProject = async () => {
        if (confirmTitle !== project.title) return

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', project.id)

            if (error) throw error

            toast.success("Project deleted successfully")
            setOpen(false)
            window.location.href = '/dashboard'
        } catch (error: any) {
            toast.error("Failed to delete project", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOwner) return null

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-4 md:gap-2">
                        <Settings className="h-4 w-4" />
                        <span className="hidden md:inline">Settings</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Project Settings</DialogTitle>
                        <DialogDescription>
                            Manage your project settings and team members.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="members">Members</TabsTrigger>
                            <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger</TabsTrigger>
                        </TabsList>

                        {/* General Tab */}
                        <TabsContent value="general" className="flex-1 overflow-auto space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Project Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Project title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe your project..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
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
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="icon">Icon</Label>
                                    <Input
                                        id="icon"
                                        value={projectIcon}
                                        onChange={(e) => setProjectIcon(e.target.value)}
                                        placeholder="📁"
                                        className="text-center text-xl"
                                    />
                                </div>
                            </div>

                            <Button onClick={handleSaveGeneral} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </TabsContent>

                        {/* Members Tab */}
                        <TabsContent value="members" className="flex-1 overflow-hidden py-4">
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                    {members.filter(m => m.status === 'active').map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={member.profile?.avatar_url || ""} />
                                                        <AvatarFallback>
                                                            <User className="h-4 w-4" />
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {member.role === 'admin' && (
                                                        <Crown className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 bg-background rounded-full" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {member.profile?.display_name || member.profile?.username || "Unknown"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[10px] h-4 capitalize">
                                                            {member.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            {member.role !== 'admin' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                                    onClick={() => setKickMemberId(member.user_id)}
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* Danger Zone Tab */}
                        <TabsContent value="danger" className="flex-1 overflow-auto space-y-4 py-4">
                            {/* Visibility Toggle */}
                            <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isPublic ? <Eye className="h-5 w-5 text-orange-600" /> : <EyeOff className="h-5 w-5 text-orange-600" />}
                                        <div>
                                            <p className="font-medium text-sm">Project Visibility</p>
                                            <p className="text-xs text-muted-foreground">
                                                {isPublic ? "Anyone can see this project" : "Only members can see this project"}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={isPublic}
                                        onCheckedChange={handleToggleVisibility}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Transfer Ownership */}
                            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
                                <div className="flex items-center gap-3 mb-3">
                                    <ArrowRightLeft className="h-5 w-5 text-yellow-600" />
                                    <div>
                                        <p className="font-medium text-sm">Transfer Ownership</p>
                                        <p className="text-xs text-muted-foreground">
                                            Transfer this project to another team member
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Select value={transferToUserId || ""} onValueChange={setTransferToUserId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select new owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activeMembers.map((member) => (
                                                <SelectItem key={member.user_id} value={member.user_id}>
                                                    {member.profile?.display_name || member.profile?.username || "Unknown"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowTransferConfirm(true)}
                                        disabled={!transferToUserId || isLoading}
                                    >
                                        Transfer
                                    </Button>
                                </div>
                            </div>

                            {/* Delete Project */}
                            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    <div>
                                        <p className="font-medium text-sm text-destructive">Delete Project</p>
                                        <p className="text-xs text-muted-foreground">
                                            Permanently delete this project and all its data
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Project
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Kick Member Confirmation */}
            <AlertDialog open={!!kickMemberId} onOpenChange={() => setKickMemberId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member from the project? They will lose access to all project data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => kickMemberId && handleKickMember(kickMemberId)}
                        >
                            Remove Member
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Transfer Ownership Confirmation */}
            <AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to transfer ownership of this project? You will become a regular member and the new owner will have full control.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransferOwnership}>
                            Transfer Ownership
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Project Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2">
                            This action cannot be undone. This will permanently delete the project
                            <strong> {project.title}</strong> and remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                        <Label>Type the project name to confirm</Label>
                        <Input
                            value={confirmTitle}
                            onChange={(e) => setConfirmTitle(e.target.value)}
                            placeholder={project.title}
                            className="font-mono"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeleteProject}
                            disabled={confirmTitle !== project.title}
                        >
                            I understand, delete this project
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
