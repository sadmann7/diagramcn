import { RegistryInput } from "./components/registry-input";

export default function IndexPage() {
  return (
    <div className="flex max-h-dvh flex-col items-center justify-center pt-40">
      <div className="flex w-full flex-col items-center gap-6">
        <h1 className="text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
          Visualize shadcn/ui registry
        </h1>
        <RegistryInput />
      </div>
    </div>
  );
}
