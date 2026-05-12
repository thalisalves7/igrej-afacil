import { useChurches, useActiveChurch } from "@/lib/data";
import { Building2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ChurchFilter() {
  const { data: churches } = useChurches();
  const { value, setValue } = useActiveChurch();
  const label = (() => {
    if (value === "all") return "Todas as igrejas";
    if (value === "matriz") return "Matriz";
    if (value === "filiais") return "Filiais";
    return churches?.find((c) => c.id === value)?.name ?? "Selecionar";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex w-full items-center justify-between rounded-full border border-border bg-surface/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:border-primary/40">
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {label}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Filtrar por igreja</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setValue("all")}>Todas as igrejas</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setValue("matriz")}>Apenas matriz</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setValue("filiais")}>Apenas filiais</DropdownMenuItem>
        <DropdownMenuSeparator />
        {(churches ?? []).map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => setValue(c.id)}>
            {c.name} {c.type === "matriz" && <span className="ml-auto text-xs text-primary">Matriz</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
