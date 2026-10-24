import { AppHeader } from "@/components/app-header";
import { strings } from "@/lib/strings";

export default function ReportsPage() {
  return (
    <>
      <AppHeader title={strings.reports} />
      <main className="p-4 text-sm text-muted-foreground">{strings.comingSoon}</main>
    </>
  );
}
