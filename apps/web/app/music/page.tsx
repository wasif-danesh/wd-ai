import { CreateSong } from "@/components/create/CreateSong";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Music" };

export default function Music() {
  return <CreateSong />;
}
