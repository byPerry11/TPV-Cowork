"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
    ArrowRightLeft,
    Save,
} from "lucide-react"
import { toast } from "sonner"
import { WorkGroup, WorkGroupMember } from "@/types"
import { updateGroup, transferGroupOwnership, deleteGroup } from "@/app/actions/groups"
import { removeMemberFromGroup } from "@/app/actions/members"

interface GroupSettingsDialogProps {
    group: WorkGroup
    members: WorkGroupMember[]
    isOwner: boolean
    onGroupUpdate?: () => void
}

export function GroupSettingsDialog({
    group,
    members,
    isOwner,
    onGroupUpdate
}: GroupSettingsDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // General tab state
    const [name, setName] = useState(group.name)
    const [description, setDescription] = useState(group.description || "")

    // Danger zone state
    const [confirmName, setConfirmName] = useState("")
    const [transferToUserId, setTransferToUserId] = useState<string | null>(null)

    // Confirmation dialogs
    const [kickMemberId, setKickMemberId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showTransferConfirm, setShowTransferConfirm] = useState(false)

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setName(group.name)
            setDescription(group.description || "")
            setConfirmName("")
            setTransferToUserId(null)
        }
    }, [open, group])

    const activeMembers = members // All members in work group are effectively active

    // Save general info
    const handleSaveGeneral = async () => {
        setIsLoading(true)
        try {
            const result = await updateGroup({
                group_id: group.id,
                name,
                description,
            })

            if (!result.success) {
                toast.error('Error al actualizar grupo', {
                    description: result.error,
                })
                return
            }

            toast.success('Grupo actualizado exitosamente')
            onGroupUpdate?.()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    // Kick member
    const handleKickMember = async (userId: string) => {
        setIsLoading(true)
        try {
            const result = await removeMemberFromGroup({
                group_id: group.id,
                user_id: userId,
            })

            if (!result.success) {
                toast.error('Error al remover miembro', {
                    description: result.error,
                })
                return
            }

            toast.success('Miembro removido del grupo')
            setKickMemberId(null)
            onGroupUpdate?.()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    // Transfer ownership
    const handleTransferOwnership = async () => {
        if (!transferToUserId) return

        setIsLoading(true)
        try {
            const result = await transferGroupOwnership({
                group_id: group.id,
                new_owner_id: transferToUserId,
            })

            if (!result.success) {
                toast.error('Error al transferir propiedad', {
                    description: result.error,
                })
                return
            }

            toast.success('Propiedad transferida exitosamente')
            setShowTransferConfirm(false)
            setOpen(false)
            onGroupUpdate?.()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    // Delete group
    const handleDeleteGroup = async () => {
        if (confirmName !== group.name) return

        setIsLoading(true)
        try {
            const result = await deleteGroup(group.id)

            if (!result.success) {
                toast.error('Error al eliminar grupo', {
                    description: result.error,
                })
                return
            }

            toast.success('Grupo eliminado exitosamente')
            setOpen(false)
            router.push('/dashboard')
            router.refresh()
        } catch (error) {
            console.error('Unexpected error:', error)
            toast.error('Error inesperado')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Group Settings</DialogTitle>
                        <DialogDescription>
                            Manage your work group settings and members.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="members">Members</TabsTrigger>
                            {isOwner && (
                                <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Danger</TabsTrigger>
                            )}
                        </TabsList>

                        {/* General Tab */}
                        <TabsContent value="general" className="flex-1 overflow-auto space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Group name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe your group..."
                                    rows={3}
                                />
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
                                    {activeMembers.map((member) => (
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
                                            {member.user_id !== group.owner_id && (
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
                        {isOwner && (
                            <TabsContent value="danger" className="flex-1 overflow-auto space-y-4 py-4">
                                {/* Transfer Ownership */}
                                <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
                                    <div className="flex items-center gap-3 mb-3">
                                        <ArrowRightLeft className="h-5 w-5 text-yellow-600" />
                                        <div>
                                            <p className="font-medium text-sm">Transfer Ownership</p>
                                            <p className="text-xs text-muted-foreground">
                                                Transfer this group to another team member
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Select value={transferToUserId || ""} onValueChange={setTransferToUserId}>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select new owner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeMembers.filter(m => m.user_id !== group.owner_id).map((member) => (
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

                                {/* Delete Group */}
                                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                        <div>
                                            <p className="font-medium text-sm text-destructive">Delete Group</p>
                                            <p className="text-xs text-muted-foreground">
                                                Permanently delete this group and all its data
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Group
                                    </Button>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>
                </DialogContent >
            </Dialog >

            {/* Kick Member Confirmation */}
            < AlertDialog open={!!kickMemberId
            } onOpenChange={() => setKickMemberId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member from the group? They will lose access to all projects within this group.
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
            </AlertDialog >

            {/* Transfer Ownership Confirmation */}
            < AlertDialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to transfer ownership of this group?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransferOwnership}>
                            Transfer Ownership
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            {/* Delete Group Confirmation */}
            < AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2">
                            This action cannot be undone. This will permanently delete the group
                            <strong> {group.name}</strong> and remove all associated data, including projects.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                        <Label>Type the group name to confirm</Label>
                        <Input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={group.name}
                            className="font-mono"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeleteGroup}
                            disabled={confirmName !== group.name}
                        >
                            I understand, delete this group
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </>
    )
}
