import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/utils";

// Top bar of the main screens: logo and name on the left, the user's avatar
// (a link to Profil) on the right.
export async function AppHeader({ fullName }: { fullName: string }) {
  const t = await getTranslations("Navigation");
  const tMeta = await getTranslations("Metadata");

  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-md bg-primary text-xl font-extrabold text-primary-foreground"
        >
          K
        </span>
        <span className="text-xl font-extrabold tracking-tight">{tMeta("title")}</span>
      </div>
      <Link
        href="/profil"
        aria-label={t("openProfile")}
        className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarFallback>{initials(fullName)}</AvatarFallback>
        </Avatar>
      </Link>
    </header>
  );
}
