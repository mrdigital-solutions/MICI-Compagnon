export function SaveError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300"
    >
      {message}
    </p>
  )
}
