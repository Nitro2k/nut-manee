import { ChevronRight, DatabaseBackup } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { strings } from "@/lib/strings";

export default function MorePage() {
  return (
    <>
      <AppHeader title={strings.more} />
      <main className="space-y-4 p-4">
        <nav className="divide-y rounded-xl border">
          <Link href="/more/backup/" className="flex min-h-11 items-center gap-3 px-4 py-3 text-sm">
            <DatabaseBackup className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">{strings.backupAndData}</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">{strings.comingSoon}</p>
      </main>
    </>
  );
}
