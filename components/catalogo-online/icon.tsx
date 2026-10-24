import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Store01Icon,
  ShoppingBag01Icon,
  GiftIcon,
  Logout01Icon,
  UserCircleIcon,
  ArrowUpRight01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Ticket01Icon,
  AppleIcon,
  GoogleIcon,
  Mail01Icon,
  FilterHorizontalIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
const icons = {
  search: Search01Icon,
  store: Store01Icon,
  bag: ShoppingBag01Icon,
  gift: GiftIcon,
  logout: Logout01Icon,
  user: UserCircleIcon,
  outward: ArrowUpRight01Icon,
  right: ArrowRight01Icon,
  left: ArrowLeft01Icon,
  check: CheckmarkCircle02Icon,
  copy: Copy01Icon,
  ticket: Ticket01Icon,
  apple: AppleIcon,
  google: GoogleIcon,
  mail: Mail01Icon,
  filter: FilterHorizontalIcon,
  close: Cancel01Icon,
};
export function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: keyof typeof icons;
  size?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      strokeWidth={1.6}
      className={className}
      aria-hidden="true"
    />
  );
}
