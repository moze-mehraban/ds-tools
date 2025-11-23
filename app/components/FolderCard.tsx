'use client';
import React from "react";
import Link from "next/link";

type Props = {
  name: string;
  bg: string;
};

export default function FolderCard({ name, bg }: Props) {
  const [hover, setHover] = React.useState(false);

  return (
    <Link
      href={`/${name}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: "white",
        border: "1px solid rgba(2,6,23,0.04)",
        boxShadow: hover ? "0 12px 30px rgba(2,6,23,0.08)" : "0 6px 18px rgba(2,6,23,0.04)",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        transition: "transform .18s ease, box-shadow .18s ease",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${bg}, rgba(255,255,255,0.08))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
          boxShadow: "inset 0 -6px 18px rgba(0,0,0,0.08)",
        }}
        aria-hidden
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>Open /{name}</div>
      </div>

      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }} xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M5 12h14" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 5l6 7-6 7" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
