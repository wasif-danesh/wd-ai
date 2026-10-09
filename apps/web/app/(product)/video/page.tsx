import { CreateVideo } from "@/components/video/CreateVideo";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Video" };

export default function VideoPage() {
  return <CreateVideo />;
}
