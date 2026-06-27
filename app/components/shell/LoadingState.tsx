export default function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
