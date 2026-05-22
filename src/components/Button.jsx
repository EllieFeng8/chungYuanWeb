import { forwardRef } from "react"
import { cn } from '../data/utils';

export const Button = forwardRef(
    ({ className, variant = "primary", ...props }, ref) => {
        const variants = {
            primary: "bg-brand text-white hover:bg-brand/90 shadow-sm",
            secondary: "bg-brand-light text-white hover:bg-brand-light/90 shadow-sm",
            outline: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            ghost: "text-brand hover:bg-brand/5",
            danger: "text-red-500 hover:bg-red-50",
        }

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"
