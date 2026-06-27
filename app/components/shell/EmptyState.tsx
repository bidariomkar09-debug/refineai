export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#16161f]/50 px-6 py-16 text-center">
      <div className="mb-4 text-4xl text-indigo-500/50">∞</div>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
