import Link from "next/link";

type Crumb = { label: string; href?: string };

export default function PageHeader({
  title,
  description,
  crumbs,
  action,
}: {
  title: string;
  description?: string;
  crumbs: Crumb[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        {crumbs.map((crumb, i) => (
          <span key={crumb.label} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-indigo-400 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-400">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white lg:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
