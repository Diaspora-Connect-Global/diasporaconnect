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
  onDescriptionToggle?: (checked: boolean) => void;
}

export function TrustScore({ data, onLevelChange, onDescriptionToggle }: TrustScoreProps) {
  return (
    <Card className="lg:h-[23.3rem]">
      <CardContent className="">
        <h2 className="text-lg font-semibold mb-4">Trust score</h2>
        <div className="space-y-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold">{data.score}</span>
            <span className="text-muted-foreground">/{data.maxScore}</span>
          </div>
          
          <div className="space-y-2">
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
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="description" 
              checked={data.showDescription}
              onCheckedChange={(newChecked) => 
                onDescriptionToggle?.(newChecked as boolean)
              }
            />
            <label 
              htmlFor="description" 
              className="text-sm text-muted-foreground"
            >
              Description of the trust score
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}