type PageHeaderProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3">
      {icon && <span className="text-sky-600">{icon}</span>}
      <div>
        <h1>{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </header>
  );
}