import { ChevronRight, DatabaseBackup, Repeat, Shapes, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { strings } from "@/lib/strings";

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/more/categories/", label: strings.categories, Icon: Shapes },
  { href: "/more/recurring/", label: strings.recurring, Icon: Repeat },
  { href: "/more/backup/", label: strings.backupAndData, Icon: DatabaseBackup },
];

export default function MorePage() {
  return (
    <>
      <AppHeader title={strings.more} />
      <main className="space-y-4 p-4">
        <nav className="divide-y rounded-xl border">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-sm"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">{strings.comingSoon}</p>
      </main>
    </>
  );
}
