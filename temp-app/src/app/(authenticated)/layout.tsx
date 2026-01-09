import { FloatingNav } from "@/components/floating-nav"

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <FloatingNav />
            {children}
        </>
    )
}
