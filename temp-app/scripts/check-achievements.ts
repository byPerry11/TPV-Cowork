import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

async function main() {
    try {
        const candidates = [
            path.join(process.cwd(), '.env.local'),
            path.join(process.cwd(), '.env'),
            path.join(process.cwd(), '..', '.env.local'),
            path.join(process.cwd(), '..', '.env')
        ]

        let envPath = ''
        console.log('Buscando archivo .env en:')
        for (const p of candidates) {
            console.log(` - ${p}`)
            if (fs.existsSync(p)) {
                envPath = p
                console.log(` -> ENCONTRADO: ${p}`)
                break
            }
        }

        if (!envPath) {
            console.error('\nERROR: No se encontró ningún archivo .env con credenciales.')
            console.error('Asegúrate de tener un archivo .env.local en la carpeta del proyecto.')
            process.exit(1)
        }

        const envContent = fs.readFileSync(envPath, 'utf-8')
        const env: Record<string, string> = {}

        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.*)$/)
            if (match) {
                const key = match[1].trim()
                const value = match[2].trim().replace(/^["']|["']$/g, '')
                env[key] = value
            }
        })

        const url = env['NEXT_PUBLIC_SUPABASE_URL']
        const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

        if (!url || !key) {
            console.error('ERROR: Faltan credenciales NEXT_PUBLIC_SUPABASE_URL o KEY en', envPath)
            process.exit(1)
        }

        const supabase = createClient(url, key)
        console.log(`Conectando a ${url}...`)

        const { data, error } = await supabase
            .from('achievements')
            .select('name, tier, requirement_type, requirement_value')
            .order('requirement_type')

        if (error) {
            console.error('ERROR consultando Supabase:', error.message)
            process.exit(1)
        }

        console.log('\n--- CONFIGURACIÓN DE LOGROS ---')
        data?.forEach(d => {
            console.log(`[${d.tier.toUpperCase()}] ${d.name}`)
            console.log(`   Type: "${d.requirement_type}"`)
            console.log(`   Value: ${d.requirement_value}`)
            console.log('---')
        })

        const types = [...new Set(data?.map(a => a.requirement_type))]
        console.log('\nTIPOS ÚNICOS ENCONTRADOS:', JSON.stringify(types, null, 2))

    } catch (e) {
        console.error('Excepción:', e)
    }
}

main()
