type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="space-y-2">
      <h1>{title}</h1>
      <p className="text-sm text-slate-600">{description}</p>
    </header>
  );
}
