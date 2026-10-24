import { AppHeader } from "@/components/app-header";
import { strings } from "@/lib/strings";

export default function SearchPage() {
  return (
    <>
      <AppHeader title={strings.search} />
      <main className="p-4 text-sm text-muted-foreground">{strings.comingSoon}</main>
    </>
  );
}
