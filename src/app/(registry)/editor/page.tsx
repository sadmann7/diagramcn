import { ClientOnly } from "@/components/client-only";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "./components/editor";

export default function EditorPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-svh w-full bg-canvas" />}>
      <Editor />
    </ClientOnly>
  );
}
