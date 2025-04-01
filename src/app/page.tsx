import { siteConfig } from "@/config/site";

export default function IndexPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="font-bold text-4xl">{siteConfig.name}</h1>
    </div>
  );
}
