"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
import { PasswordStrength } from "@/components/password-strength"

// Allowed email domains for registration
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'protonmail.com',
  'pm.me',
  'aol.com',
  'zoho.com',
]

const loginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: "Password must contain uppercase, lowercase, number and symbol.",
  }),
  // Optional fields for typing compatibility with signUpSchema
  confirmPassword: z.string().optional(),
  username: z.string().optional(),
  displayName: z.string().optional(),
})

const signUpSchema = loginSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Extract domain from email
  const emailDomain = data.email.split('@')[1]?.toLowerCase()
  return ALLOWED_EMAIL_DOMAINS.includes(emailDomain)
}, {
  message: "Please use a conventional email provider (Gmail, Outlook, Yahoo, etc.)",
  path: ["email"],
})

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(isSignUp ? signUpSchema : loginSchema) as any, // Cast to any to handle schema switching type mismatch
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      displayName: "",
    },
  })

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [router])

  // Reset form errors when switching modes
  useEffect(() => {
    form.clearErrors()
    form.reset()
  }, [isSignUp, form])

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              username: values.username,
              display_name: values.displayName,
            }
          }
        })
        if (error) throw error

        router.push("/verify-email")
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        })

        if (error) {
          toast.error("Login Failed", {
            description: error.message,
          })
          return
        }

        if (data.session) {
          toast.success("Welcome back!", {
            description: "You have successfully signed in.",
          })
          router.push("/dashboard")
        }
      }

    } catch (err: any) {
      toast.error("An error occurred.", { description: err.message })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Create Account" : "Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? "Enter your email to create a new account" : "Enter your email and password to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && (
                <>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="jdoe"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                const value = e.target.value
                                if (value.length >= 3) {
                                  setUsernameStatus('checking')
                                  if (usernameCheckTimeout.current) {
                                    clearTimeout(usernameCheckTimeout.current)
                                  }
                                  usernameCheckTimeout.current = setTimeout(async () => {
                                    const { data } = await supabase
                                      .from('profiles')
                                      .select('username')
                                      .eq('username', value)
                                      .single()
                                    setUsernameStatus(data ? 'taken' : 'available')
                                  }, 500)
                                } else {
                                  setUsernameStatus('idle')
                                }
                              }}
                            />
                            {usernameStatus === 'checking' && (
                              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {usernameStatus === 'available' && (
                              <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                            )}
                            {usernameStatus === 'taken' && (
                              <XCircle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </FormControl>
                        {usernameStatus === 'taken' && (
                          <p className="text-sm text-red-500">This username is already taken</p>
                        )}
                        {usernameStatus === 'available' && (
                          <p className="text-sm text-green-500">Username available!</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          onPaste={(e) => e.preventDefault()}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {isSignUp && <PasswordStrength password={field.value} />}
                  </FormItem>
                )}
              />

              {!isSignUp && (
                <div className="flex justify-end">
                  <a href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
              )}

              {isSignUp && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            onPaste={(e) => e.preventDefault()}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="link"
            className="w-full text-sm text-muted-foreground"
            onClick={() => setIsSignUp(!isSignUp)}
            type="button"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
