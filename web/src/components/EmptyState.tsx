export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
      <p className="text-sm">{message}</p>
    </div>
  );
}
