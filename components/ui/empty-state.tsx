type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
