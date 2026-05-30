"use client";

export default function ConsentPage() {
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
        <h1 className="text-2xl font-bold mb-6">Согласие на обработку персональных данных</h1>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <p>Физическое лицо (далее – Субъект персональных данных), оставляя свои персональные данные на веб-сайте odontaindex.ru, их сервисах или доменах и поддоменах (далее - Сайт), действуя свободно, своей волей и в своем интересе, а также подтверждая свою дееспособность, дает свое согласие Индивидуальному предпринимателю Коростелеву Александру Андреевичу (ИНН: 312334497069, ОГРНИП: 323508100020560) (далее — Оператор) на обработку своих персональных данных со следующими условиями:</p>

          <h2 className="text-lg font-semibold mt-6">1. Виды обработки</h2>
          <p>Данное Согласие дается на обработку персональных данных, как без использования средств автоматизации, так и с их использованием.</p>

          <h2 className="text-lg font-semibold mt-6">2. Перечень персональных данных</h2>
          <p>Согласие дается на обработку следующих персональных данных:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Фамилия, имя, отчество</li>
            <li>Номер мобильного телефона, электронная почта</li>
            <li>Данные о состоянии полости рта (результаты анализа, индексы гигиены)</li>
            <li>Фотографии полости рта</li>
            <li>Данные анкеты пациента</li>
            <li>IP-адрес, вид операционной системы, тип браузера</li>
            <li>Файлы cookie, сведения о действиях на Сайте</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">3. Цель обработки</h2>
          <p>Выполнение обязательств в соответствии с Политикой в отношении обработки персональных данных:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Предоставление услуг AI-анализа гигиены полости рта</li>
            <li>Формирование отчётов для врачей и пациентов</li>
            <li>Отправка напоминаний о визитах</li>
            <li>Обработка платежей</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">4. Действия с данными</h2>
          <p>Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение.</p>

          <h2 className="text-lg font-semibold mt-6">5. Основания</h2>
          <p>Ст. 24 Конституции РФ; ст. 6 Федерального закона № 152-ФЗ «О персональных данных»; Политика в отношении обработки и защиты персональных данных.</p>

          <h2 className="text-lg font-semibold mt-6">6. Срок действия</h2>
          <p>Настоящее согласие действует всё время до момента прекращения обработки персональных данных. Согласие может быть отозвано субъектом персональных данных путём направления письменного заявления Оператору.</p>

          <h2 className="text-lg font-semibold mt-6">7. Оператор</h2>
          <p>
            Индивидуальный предприниматель Коростелев Александр Андреевич<br />
            ИНН: 312334497069<br />
            ОГРНИП: 323508100020560<br />
            Адрес: 140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2, кв. 375
          </p>
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
