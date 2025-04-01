import { RegistryInput } from "./components/registry-input";
import { RegistryProvider } from "./components/registry-provider";

export default function IndexPage() {
  return (
    <RegistryProvider>
      <div className="container flex h-[calc(100vh-100px)] flex-col items-center justify-center gap-4">
        <div className="flex w-full flex-col items-center gap-6">
          <h1 className="text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
            Visualize shadcn/ui registry
          </h1>
          <RegistryInput />
        </div>
      </div>
    </RegistryProvider>
  );
}
