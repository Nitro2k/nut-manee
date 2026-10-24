import { AppHeader } from "@/components/app-header";
import { StorageCard } from "@/components/more/storage-card";
import { strings } from "@/lib/strings";

export default function MorePage() {
  return (
    <>
      <AppHeader title={strings.more} />
      <main className="space-y-4 p-4">
        <StorageCard />
        <p className="text-sm text-muted-foreground">{strings.comingSoon}</p>
      </main>
    </>
  );
}
