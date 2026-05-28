import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto py-6 text-center border-t border-gray-200">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 mb-2">
        <Link href="/privacy" className="hover:text-primary transition-colors">Политика обработки ПД</Link>
        <span className="text-gray-300">·</span>
        <Link href="/terms" className="hover:text-primary transition-colors">Пользовательское соглашение</Link>
        <span className="text-gray-300">·</span>
        <Link href="/consent" className="hover:text-primary transition-colors">Согласие на обработку ПД</Link>
      </div>
      <p className="text-[11px] text-gray-400">
        ИП Коростелев Александр Андреевич · ИНН: 312334497069 · ОГРНИП: 323508100020560
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2
      </p>
      <p className="mt-2 text-[11px] text-gray-400">© 2026 Odonta Index AI · <a href="https://kwork.ru/user/pyaidev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">pyaidev</a></p>
    </footer>
  );
}
