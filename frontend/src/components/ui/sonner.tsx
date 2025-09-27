import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-black/90 text-white border border-white/20 shadow-2xl backdrop-blur-md rounded-2xl",
          description: "text-white/70",
          actionButton:
            "bg-white/20 text-white hover:bg-white/30 border border-white/30 rounded-lg",
          cancelButton:
            "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20 rounded-lg",
        },
        style: {
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
