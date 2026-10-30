import type { Metadata } from "next";
import { AccountForm } from "@/components/AccountForm";

export const metadata: Metadata = {
  title: "비밀번호 변경 · 센 미디어",
};

export default function AccountPage() {
  return <AccountForm />;
}
