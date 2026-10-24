import { AppHeader } from "@/components/app-header";
import { strings } from "@/lib/strings";

export default function MorePage() {
  return (
    <>
      <AppHeader title={strings.more} />
      <main className="p-4 text-sm text-muted-foreground">{strings.comingSoon}</main>
    </>
  );
}
