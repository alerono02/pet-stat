import { useEffect } from "react";

const BASE = "Учёт домашних животных";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : BASE;
  }, [title]);
}
