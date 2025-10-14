import { redirect } from "next/navigation";
import { MARKETS } from "@zoracore/config/markets";

export default function IndexPage() {
  redirect(`/${Object.keys(MARKETS)[0]}`);
}
