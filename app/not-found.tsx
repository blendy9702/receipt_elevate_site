import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다 · Receipt Elevate",
  description: "요청하신 페이지가 없거나 이동되었습니다.",
};

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="not-found-card">
        <Image
          src="/logo_1.png"
          alt="Elevate"
          width={180}
          height={48}
          priority
        />
        <p className="not-found-code" aria-hidden>
          404
        </p>
        <h1>이 페이지는 여기 없어요</h1>
        <p>
          주소가 바뀌었거나 잠시 길을 잃었습니다. 대시보드로 돌아가 작업을
          이어갈 수 있어요.
        </p>
        <div className="not-found-actions">
          <Link className="primary" href="/">
            대시보드로 이동
          </Link>
          <Link className="ghost" href="/login">
            로그인
          </Link>
        </div>
      </section>
    </main>
  );
}
