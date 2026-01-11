"use client"

import { MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChatsPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 rounded-full bg-primary/10">
                            <MessageCircle className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Chats</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-muted-foreground">
                        Coming soon! Chat functionality will be available here.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
