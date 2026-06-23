import { CaseLobby } from "@/components/CaseLobby";
import { listCases } from "@/data/cases";

export default function HomePage() {
  return <CaseLobby cases={listCases()} />;
}
