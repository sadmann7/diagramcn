import { ClientOnly } from "@/components/client-only";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "./components/editor";

export default function EditorPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-screen w-full" />}>
      <Editor />
    </ClientOnly>
  );
}
