import { CreateImage } from "@/components/image/CreateImage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Image" };

export default function ImagePage() {
  return <CreateImage />;
}
