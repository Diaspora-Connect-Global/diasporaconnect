// components/TrustScore.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface TrustScoreProps {
  data: {
    score: number;
    maxScore: number;
    levels: {
      starter: boolean;
      trusted: boolean;
      reliable: boolean;
      elite: boolean;
    };
    showDescription: boolean;
  };
  onLevelChange?: (level: keyof TrustScoreProps['data']['levels'], checked: boolean) => void;
}

export function TrustScore({ data, onLevelChange }: TrustScoreProps) {
  return (
    <Card className="h-full p-0">
      <CardContent className="p-4 h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Trust score</h2>
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">{data.score}</span>
              <span className="text-muted-foreground">/{data.maxScore}</span>
            </div>
            
            <div className="space-y-1">
              {Object.entries(data.levels).map(([level, checked]) => (
                <div key={level} className="flex items-center space-x-2">
                  <Checkbox 
                    id={level}
                    checked={checked}
                    onCheckedChange={(newChecked) => 
                      onLevelChange?.(level as keyof TrustScoreProps['data']['levels'], newChecked as boolean)
                    }
                  />
                  <label 
                    htmlFor={level} 
                    className="text-sm capitalize"
                  >
                    {level}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
         
        </div>
      </CardContent>
    </Card>
  );
}