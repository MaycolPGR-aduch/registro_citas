type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Cargando información..." }: LoadingStateProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
      {label}
    </div>
  );
}
