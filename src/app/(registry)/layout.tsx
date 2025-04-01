import { RegistryProvider } from "./components/registry-provider";

interface RegistryLayoutProps {
  children: React.ReactNode;
}

export default function RegistryLayout({ children }: RegistryLayoutProps) {
  return <RegistryProvider>{children}</RegistryProvider>;
}
