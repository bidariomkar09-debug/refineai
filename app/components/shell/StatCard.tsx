export default function StatCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#16161f] p-5 transition hover:border-indigo-500/30">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        {icon && <div className="text-indigo-400">{icon}</div>}
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">
        {value}
        {suffix && <span className="text-lg text-gray-400">{suffix}</span>}
      </p>
    </div>
  );
}
