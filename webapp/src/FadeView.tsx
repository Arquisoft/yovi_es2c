import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FadeViewProps {
    /** Contenido a mostrar con la animación */
    children: ReactNode;
    /** Clave que identifica la vista actual. Cada vez que cambia, se dispara la transición */
    viewKey: string;
}

// ─── Fases de la animación ────────────────────────────────────────────────────

/**
 * Las 4 fases por las que pasa la animación al cambiar de vista:
 * - hidden:   frame invisible intermedio mientras se intercambia el contenido
 * - entering: la nueva vista aparece desde abajo con blur
 * - visible:  estado final estable, sin transformaciones
 * - leaving:  la vista actual sube y se desvanece con blur al salir
 */
type Phase = 'hidden' | 'entering' | 'visible' | 'leaving';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FadeView({ children, viewKey }: FadeViewProps) {

    // Fase actual de la animación
    const [phase, setPhase] = useState<Phase>('entering');

    /**
     * Children que se están renderizando actualmente en pantalla.
     * Son distintos de 'children' porque no se actualizan inmediatamente
     * cuando cambia viewKey — esperan a que la animación de salida termine.
     * Esto evita que el nuevo contenido aparezca antes de tiempo durante
     * la fase de salida de la vista anterior.
     */
    const [displayedChildren, setDisplayedChildren] = useState(children);

    // Guarda la clave anterior para distinguir primera carga de cambio de vista
    const prevKey = useRef(viewKey);

    // Referencias a los timers para cancelarlos en el cleanup
    const t1 = useRef<ReturnType<typeof setTimeout>>();
    const t2 = useRef<ReturnType<typeof setTimeout>>();
    const t3 = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (prevKey.current === viewKey) {
            // ── Primera carga ──────────────────────────────────────────────
            // El componente arranca en 'entering' (invisible) desde el estado
            // inicial, así que solo necesitamos pasar a 'visible' con un pequeño
            // delay para que el navegador pinte el estado invisible primero
            // y la animación de entrada sea visible.
            t1.current = setTimeout(() => setPhase('visible'), 100);
            return () => clearTimeout(t1.current);
        }

        // ── Cambio de vista ────────────────────────────────────────────────
        prevKey.current = viewKey;

        // 1. Inmediatamente: iniciamos la salida con los children ANTERIORES
        //    todavía en pantalla. El usuario ve cómo la vista actual se desvanece.
        t1.current = setTimeout(() => setPhase('leaving'), 0);

        // 2. A los 350ms: la salida ha terminado. Ahora sí intercambiamos
        //    el contenido por el nuevo y lo ocultamos momentáneamente.
        t2.current = setTimeout(() => {
            setDisplayedChildren(children);
            setPhase('hidden');
        }, 350);

        // 3. A los 420ms: iniciamos la entrada del nuevo contenido.
        //    Primero pasamos a 'entering' y tras 80ms a 'visible'
        //    para que el navegador procese el estado inicial de la animación.
        t3.current = setTimeout(() => {
            setPhase('entering');
            setTimeout(() => setPhase('visible'), 80);
        }, 420);

        // Cleanup: cancelamos todos los timers pendientes si viewKey vuelve
        // a cambiar antes de que la animación anterior haya terminado,
        // o si el componente se desmonta.
        return () => {
            clearTimeout(t1.current);
            clearTimeout(t2.current);
            clearTimeout(t3.current);
        };
    }, [children, viewKey]);

    // ── Estilos por fase ───────────────────────────────────────────────────────

    /**
     * Cada fase define un conjunto de transformaciones CSS.
     * MUI aplica estos estilos como sx props, y la propiedad 'transition'
     * se encarga de animar el cambio entre fases.
     */
    const styles: Record<Phase, object> = {
        // Frame intermedio: completamente invisible, desplazado y borroso
        hidden: {
            opacity: 0,
            transform: 'scale(0.95) translateY(20px)',
            filter: 'blur(8px)',
        },
        // Inicio de la entrada: ligeramente desplazado y borroso
        entering: {
            opacity: 0,
            transform: 'scale(0.97) translateY(16px)',
            filter: 'blur(4px)',
        },
        // Estado final: completamente visible y sin transformaciones
        visible: {
            opacity: 1,
            transform: 'scale(1) translateY(0)',
            filter: 'blur(0px)',
        },
        // Salida: se desvanece subiendo ligeramente con blur
        leaving: {
            opacity: 0,
            transform: 'scale(1.03) translateY(-16px)',
            filter: 'blur(6px)',
        },
    };

    return (
        <Box
            sx={{
                // Aplicamos los estilos de la fase actual
                ...styles[phase],
                // En la fase 'visible' usamos cubic-bezier para un efecto
                // de resorte suave similar al de iOS o Vercel.
                // En el resto de fases usamos ease simple para salidas más rápidas.
                transition: phase === 'visible'
                    ? 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1), filter 0.45s ease'
                    : 'opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease',
                // Optimización: avisa al navegador de qué propiedades van a cambiar
                // para que pueda prepararlas en la GPU con antelación
                willChange: 'opacity, transform, filter',
            }}
        >
            {/* Renderizamos displayedChildren en lugar de children para controlar
                exactamente cuándo se intercambia el contenido */}
            {displayedChildren}
        </Box>
    );
}
