import { Shell } from "@/components/shell";
import { RegistryInput } from "./components/registry-input";

export default function IndexPage() {
  return (
    <Shell variant="centered" className="h-[calc(100vh-100px)]">
      <div className="flex w-full flex-col items-center gap-6">
        <h1 className="text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
          Visualize shadcn/ui registry
        </h1>
        <RegistryInput />
      </div>
    </Shell>
  );
}
