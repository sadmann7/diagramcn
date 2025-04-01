import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export default function IndexPage() {
  return (
    <div className="container flex h-[calc(100vh-100px)] flex-col items-center justify-center gap-4">
      <div className="flex w-full flex-col items-center gap-6">
        <h1 className="text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
          Visualize shadcn/ui registry
        </h1>
        <div className="relative w-full max-w-2xl">
          <Textarea
            placeholder="Type registry here"
            className="resize-none pr-12"
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 bottom-2 size-7 rounded-sm"
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}
