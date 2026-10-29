import type { Metadata } from "next";
import { PerformerForm } from "@/components/PerformerForm";

export const metadata: Metadata = {
  title: "출연자 등록 · 센 미디어",
};

export default function NewPerformerPage() {
  return <PerformerForm />;
}
