import type { Metadata } from "next";
import { MemberAdmin } from "@/components/MemberAdmin";
import { RequireRole } from "@/components/MemberGate";

export const metadata: Metadata = {
  title: "회원 관리 · 센 미디어",
};

export default function AdminPage() {
  return (
    <RequireRole role="admin">
      <MemberAdmin />
    </RequireRole>
  );
}
