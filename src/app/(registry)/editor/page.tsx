import { ClientOnly } from "@/components/client-only";
import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "./components/editor";

export default function EditorPage() {
  return (
    <Shell>
      <ClientOnly fallback={<Skeleton className="h-[calc(100vh-100px)]" />}>
        <Editor />
      </ClientOnly>
    </Shell>
  );
}
