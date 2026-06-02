import { Construction } from "lucide-react";

interface Props {
  title: string;
}

export default function PlaceholderPage({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 animate-fade-in">
      <div className="w-14 h-14 bg-surface-3 border border-border flex items-center justify-center rounded-sm">
        <Construction size={22} className="text-accent/60" />
      </div>
      <div className="text-center">
        <h2 className="text-white text-lg font-semibold">{title}</h2>
        <p className="text-zinc-500 text-sm mt-1">Módulo en desarrollo</p>
      </div>
      <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
    </div>
  );
}
