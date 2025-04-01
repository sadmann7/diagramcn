import { ClientOnly } from "@/components/client-only";
import { Skeleton } from "@/components/ui/skeleton";
import { Editor } from "./components/editor";

export default function EditorPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-[calc(100vh-100px)]" />}>
      <Editor />
    </ClientOnly>
  );
}
