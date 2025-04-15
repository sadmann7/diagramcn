import { ClientOnly } from "@/components/client-only";
import { Skeleton } from "@/components/ui/skeleton";
import { Registry } from "./components/registry";

export default function RegistryPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-svh w-full bg-canvas" />}>
      <Registry />
    </ClientOnly>
  );
}
