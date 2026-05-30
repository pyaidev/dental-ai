"use client";

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold mb-6">Политика конфиденциальности</h1>
        <p className="text-xs text-gray-400 mb-6">Дата публикации: 28 мая 2026 г.</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
          <h2 className="text-lg font-semibold mt-6">1. Общие положения</h2>
          <p>Настоящая Политика конфиденциальности (далее — Политика) определяет порядок обработки и защиты персональных данных пользователей сервиса Odonta Index AI (далее — Сервис), расположенного по адресу odontaindex.ru.</p>
          <p>Оператор персональных данных: Индивидуальный предприниматель Коростелев Александр Андреевич (ИНН: 312334497069, ОГРНИП: 323508100020560), адрес: 140002, Московская обл, г. Люберцы, ул. Кирова, д. 9, корп. 2, кв. 375.</p>

          <h2 className="text-lg font-semibold mt-6">2. Какие данные мы собираем</h2>
          <p>При использовании Сервиса мы можем собирать следующие персональные данные:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>ФИО врача и пациента</li>
            <li>Дата рождения пациента</li>
            <li>Номер медицинской карты</li>
            <li>Номер телефона</li>
            <li>Адрес электронной почты (логин)</li>
            <li>Фотографии полости рта</li>
            <li>Результаты анализа гигиены (индексы, проценты)</li>
            <li>Данные анкеты пациента (состояние здоровья)</li>
            <li>Telegram ID (при подключении бота)</li>
            <li>Данные об оплате (без реквизитов карты — они обрабатываются банком)</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">3. Цели обработки</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Предоставление услуг AI-анализа гигиены полости рта</li>
            <li>Формирование отчётов для врачей и пациентов</li>
            <li>Отправка напоминаний о визитах</li>
            <li>Обработка платежей за подписку</li>
            <li>Улучшение качества сервиса</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">4. Правовые основания</h2>
          <p>Обработка персональных данных осуществляется на основании:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Согласия субъекта персональных данных (ст. 9 ФЗ-152)</li>
            <li>Исполнения договора (ст. 6 ч. 1 п. 5 ФЗ-152)</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">5. Хранение и защита данных</h2>
          <p>Персональные данные хранятся на серверах в Российской Федерации (Yandex Cloud). Мы применяем организационные и технические меры для защиты данных от несанкционированного доступа:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Шифрование передачи данных (SSL/TLS)</li>
            <li>Хеширование паролей (bcrypt)</li>
            <li>JWT-токены авторизации с ограниченным сроком действия</li>
            <li>Ежедневное резервное копирование</li>
            <li>Ограничение доступа к данным</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">6. Передача данных третьим лицам</h2>
          <p>Мы не продаём и не передаём персональные данные третьим лицам, за исключением:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>YandexGPT (Яндекс) — для генерации рекомендаций (передаются обезличенные данные анализа)</li>
            <li>Тинькофф Банк — для обработки платежей</li>
            <li>Telegram — для отправки уведомлений (по согласию пациента)</li>
          </ul>

          <h2 className="text-lg font-semibold mt-6">7. Cookies</h2>
          <p>Сервис использует файлы cookies для хранения данных авторизации и настроек интерфейса. Cookies не содержат персональных данных и не передаются третьим лицам.</p>

          <h2 className="text-lg font-semibold mt-6">8. Права пользователя</h2>
          <p>Вы имеете право:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Получить информацию об обработке ваших данных</li>
            <li>Запросить изменение или удаление ваших данных</li>
            <li>Отозвать согласие на обработку</li>
            <li>Обратиться в Роскомнадзор при нарушении ваших прав</li>
          </ul>
          <p>Для реализации прав обращайтесь: info@odontaindex.ru</p>

          <h2 className="text-lg font-semibold mt-6">9. Изменения</h2>
          <p>Мы оставляем за собой право изменять настоящую Политику. Актуальная версия всегда доступна на данной странице.</p>
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
