import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export const ToolCard = ({ tool }) => {
  const handleAccess = () => {
    if (tool.url) {
      window.open(tool.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="border-2 border-border/50 shadow-card hover-lift group">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start gap-4 mb-4">
          <div className="icon-gradient p-3 rounded-xl text-primary-foreground shadow-md group-hover:shadow-glow transition-shadow duration-300">
            <tool.icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">
              {tool.name}
            </h3>
            <Badge variant="default" className="mt-1">
              {tool.category}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
          {tool.description}
        </p>

        <Button
          variant="gradient"
          className="w-full gap-2"
          onClick={handleAccess}
        >
          <ExternalLink className="h-4 w-4" />
          Access Tool
        </Button>
      </CardContent>
    </Card>
  );
};