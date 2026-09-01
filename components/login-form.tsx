"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "로그인에 실패했습니다.",
        );
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-visual" aria-hidden>
        <Image src="/logo_2.png" alt="" width={170} height={170} priority />
        <p>
          일의 흐름을
          <br />한 단계 높이다.
        </p>
        <span>RECEIPT ELEVATE</span>
      </div>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="login-card"
      >
        <Image
          src="/logo_1.png"
          alt="Elevate"
          width={180}
          height={48}
          priority
        />
        <p className="py-2">계정으로 로그인해 대시보드를 확인하세요.</p>

        <label>
          아이디
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디를 입력하세요"
            required
          />
        </label>

        <label>
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
          />
        </label>

        {error ? <p className="login-error">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </motion.form>
    </div>
  );
}
