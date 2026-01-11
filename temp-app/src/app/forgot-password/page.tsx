"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { supabase } from "@/lib/supabaseClient"

const forgotPasswordSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
})

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    })

    async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast.error("Error", { description: error.message })
                return
            }

            setEmailSent(true)
            toast.success("Email sent!", {
                description: "Check your inbox for the reset link.",
            })
        } catch (err: any) {
            toast.error("An error occurred.", { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (emailSent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl">Check your email</CardTitle>
                        <CardDescription>
                            We sent a password reset link to <span className="font-medium text-foreground">{form.getValues("email")}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                        <p>Click the link in the email to reset your password. The link will expire in 24 hours.</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setEmailSent(false)}
                        >
                            Try a different email
                        </Button>
                        <Link href="/login" className="w-full">
                            <Button variant="ghost" className="w-full">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to login
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Forgot password?</CardTitle>
                    <CardDescription>
                        Enter your email and we'll send you a reset link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send reset link
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter>
                    <Link href="/login" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to login
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
