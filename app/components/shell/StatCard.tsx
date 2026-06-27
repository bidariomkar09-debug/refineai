export default function StatCard({
  label,
  value,
  suffix,
  icon,
  large,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-[#16161f] transition hover:border-indigo-500/30 ${
        large ? "p-8" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className={`font-medium text-gray-400 ${large ? "text-base" : "text-sm"}`}>{label}</p>
        {icon && <div className="text-indigo-400">{icon}</div>}
      </div>
      <p className={`mt-4 font-semibold text-white ${large ? "text-5xl" : "text-3xl"}`}>
        {value}
        {suffix && (
          <span className={`text-gray-400 ${large ? "text-2xl" : "text-lg"}`}>{suffix}</span>
        )}
      </p>
    </div>
  );
}
