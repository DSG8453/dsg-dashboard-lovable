import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCard = ({ value, label, variant = "blue", icon: Icon }) => {
  const variants = {
    blue: "stat-gradient-blue",
    indigo: "stat-gradient-indigo",
    green: "stat-gradient-green",
  };

  const iconColors = {
    blue: "text-primary",
    indigo: "text-indigo",
    green: "text-success",
  };

  return (
    <Card
      className={cn(
        "border-2 border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300",
        variants[variant]
      )}
    >
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {label}
            </p>
          </div>
          {Icon && (
            <div
              className={cn(
                "p-3 rounded-xl bg-card/80",
                iconColors[variant]
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};