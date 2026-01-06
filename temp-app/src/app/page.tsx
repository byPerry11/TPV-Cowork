import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
           <ShieldCheck className="h-6 w-6 text-primary" />
           <span className="font-bold text-lg">TPV App</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center mx-auto px-4">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Control de Procesos y <span className="text-primary">Evidencias</span>
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Gestiona asignaciones de trabajo, checklists de verificación y captura evidencia fotográfica en tiempo real.
              Simple, rápido y seguro.
            </p>
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg" className="h-11 px-8">
                  Ingresar a la Plataforma <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-11 px-8">
                  Conocer más
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24 mx-auto px-4">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl font-bold">
              Características
            </h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Diseñado para simplificar el flujo de trabajo en campo y oficina.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Zap className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Rápido y Dinámico</h3>
                  <p className="text-sm text-muted-foreground">
                    Interfaz optimizada para carga rápida y uso en dispositivos móviles.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Checklists Inteligentes</h3>
                  <p className="text-sm text-muted-foreground">
                    Verificación paso a paso con validación de cumplimiento.
                  </p>
                </div>
              </div>
            </div>
             <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <ShieldCheck className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">Evidencia Segura</h3>
                  <p className="text-sm text-muted-foreground">
                    Respaldo fotográfico y notas almacenados de forma segura en la nube.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by <a href="#" className="font-medium underline underline-offset-4">TPV Team</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
