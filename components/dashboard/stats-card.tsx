interface StatsCardProps {
  title: string;
  value: number;
  limit?: number;
  description?: string;
}

export function StatsCard({ title, value, limit, description }: StatsCardProps) {
  const percentage = limit && limit > 0 ? (value / limit) * 100 : 0;
  
  return (
    <div className="rounded-lg border p-6 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold">{value}</p>
        {limit && limit > 0 && (
          <p className="text-muted-foreground">/ {limit === -1 ? "∞" : limit}</p>
        )}
      </div>
      
      {limit && limit > 0 && (
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
