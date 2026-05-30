"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center"><img src="/logo.png" alt="Odonta Index AI" className="h-14" /></a>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-900">Войти</a>
            <a href="/register" className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700">Регистрация</a>
          </div>
        </div>
      </nav>
      <div className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-3xl bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-6">Пользовательское соглашение</h1>
        <p className="text-xs text-gray-400 mb-6">Дата публикации: 28 мая 2026 г.</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <h2 className="text-lg font-semibold mt-6">1. Предмет соглашения</h2>
          <p>Настоящее Соглашение регулирует отношения между Оператором сервиса Odonta Index AI (далее — Сервис) и Пользователем (врачом-стоматологом или стоматологической клиникой).</p>

          <h2 className="text-lg font-semibold mt-6">2. Описание сервиса</h2>
          <p>Сервис предоставляет инструменты для:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>AI-анализа зубного налёта по фотографиям</li>
            <li>Расчёта индексов гигиены полости рта</li>
            <li>Генерации PDF-отчётов для пациентов</li>
            <li>Ведения ёршикограммы и пародонтограммы</li>
            <li>Автоматических напоминаний пациентам</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">3. Регистрация</h2>
          <p>Для использования Сервиса необходима регистрация. При регистрации Пользователь подтверждает:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Достоверность предоставленных данных</li>
            <li>Наличие медицинского образования (для врачей)</li>
            <li>Согласие на обработку персональных данных</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">4. Оплата и подписка</h2>
          <p>Сервис работает по модели подписки. Пользователь приобретает пакеты отчётов. Стоимость зависит от выбранного тарифа. Оплата осуществляется через Тинькофф Банк. Возврат средств за неиспользованные отчёты возможен в течение 14 дней.</p>

          <h2 className="text-lg font-semibold mt-6">5. Медицинская оговорка</h2>
          <p><b>Результаты AI-анализа не являются диагнозом и не заменяют консультацию врача.</b> Сервис является вспомогательным инструментом для стоматологов. Окончательное решение принимает лечащий врач.</p>

          <h2 className="text-lg font-semibold mt-6">6. Ответственность</h2>
          <p>Оператор не несёт ответственности за:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Медицинские решения, принятые на основе данных Сервиса</li>
            <li>Перебои в работе, вызванные внешними факторами</li>
            <li>Потерю данных при нарушении условий использования</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">7. Интеллектуальная собственность</h2>
          <p>Сервис Odonta Index AI, включая программный код, дизайн, алгоритмы и нейронные сети, является интеллектуальной собственностью Оператора и защищён законодательством РФ.</p>

          <h2 className="text-lg font-semibold mt-6">8. Применимое право</h2>
          <p>Настоящее Соглашение регулируется законодательством Российской Федерации. Споры разрешаются в суде по месту нахождения Оператора.</p>
        </div>
      </div>
      </div>
      <footer className="border-t border-gray-100 bg-white py-6">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 mb-3">
            <a href="/privacy" className="hover:text-cyan-600">Политика обработки ПД</a>
            <a href="/terms" className="hover:text-cyan-600">Пользовательское соглашение</a>
            <a href="/consent" className="hover:text-cyan-600">Согласие на обработку ПД</a>
          </div>
          <p className="text-[11px] text-gray-300">ИП Коростелев А.А. · ИНН: 312334497069 · © 2026 Odonta Index AI</p>
        </div>
      </footer>
    </div>
  );
}
