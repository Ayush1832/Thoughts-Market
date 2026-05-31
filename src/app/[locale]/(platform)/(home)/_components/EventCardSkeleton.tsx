const S = ({ className }: { className: string }) => (
  <div className={`animate-skeleton rounded-md ${className}`} />
)

export default function EventCardSkeleton() {
  return (
    <div className="h-45 rounded-2xl border border-border/40 bg-card p-4">
      <div className="mb-3 flex items-start gap-2">
        <S className="size-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <S className="h-3.5 w-3/4" />
          <S className="h-3 w-1/2" />
        </div>
        <S className="h-12 w-14 rounded-xl" />
      </div>
      <div className="mt-6 mb-3 grid grid-cols-2 gap-2">
        <S className="h-10 rounded-xl" />
        <S className="h-10 rounded-xl" />
      </div>
      <div className="flex items-center justify-between">
        <S className="h-3 w-16" />
        <S className="h-3 w-6" />
      </div>
    </div>
  )
}
