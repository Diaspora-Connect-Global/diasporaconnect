import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Loader2Icon className="size-6 animate-spin text-text-brand" />
    </div>
  );
}