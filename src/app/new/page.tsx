import type { Metadata } from "next";
import { PerformerForm } from "@/components/PerformerForm";

export const metadata: Metadata = {
  title: "출연자 등록 · 인생의 연장전",
};

export default function NewPerformerPage() {
  return <PerformerForm />;
}
