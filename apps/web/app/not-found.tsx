import { Equaliser } from "@/components/Logo";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="empty panel">
        <Equaliser still />
        <h1>We couldn't find that</h1>
        <p>The page or song you're looking for doesn't exist, or isn't yours.</p>
        <Link href="/" className="btn btn--primary">
          Back to creating
        </Link>
      </div>
    </main>
  );
}
