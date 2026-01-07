"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const profileSchema = z.object({
    username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres").max(20),
    display_name: z.string().min(1, "El nombre para mostrar es requerido").max(50),
})

interface ProfileEditFormProps {
    userId: string
}

export function ProfileEditForm({ userId }: ProfileEditFormProps) {
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    const form = useForm<z.infer<typeof profileSchema>>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(profileSchema) as any,
        defaultValues: {
            username: "",
            display_name: "",
        },
    })

    useEffect(() => {
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, display_name')
                .eq('id', userId)
                .single()

            if (data && !error) {
                form.reset({
                    username: data.username || "",
                    display_name: data.display_name || "",
                })
            }
            setInitialLoading(false)
        }
        fetchProfile()
    }, [userId, form])

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: values.username,
                    display_name: values.display_name,
                })
                .eq('id', userId)

            if (error) throw error

            toast.success('Perfil actualizado correctamente')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Error al actualizar perfil', {
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    if (initialLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre de Usuario</FormLabel>
                            <FormControl>
                                <Input placeholder="usuario123" {...field} />
                            </FormControl>
                            <FormDescription>
                                Tu nombre de usuario único en la plataforma
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre para Mostrar</FormLabel>
                            <FormControl>
                                <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormDescription>
                                Este nombre se mostrará en tu perfil
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </Form>
    )
}
