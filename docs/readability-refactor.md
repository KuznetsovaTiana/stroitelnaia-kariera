# Readability-refactor: 19.10.2026

Рефакторинг выполнен относительно исходного рабочего дерева, включая прежние незакоммиченные изменения серверной диагностики. Они сохранены по смыслу; сравнение выполнялось с их исходным локальным содержимым, а не только с HEAD.

## Результат и границы

Изменены 89 собственных TS/TSX/JS/MJS-файлов. Развёрнуты операторы, вызовы, цепочки, объекты, массивы, условия, интерфейсы, union-типы, параметры и JSX. Составные объявления переменных разделены в том же блоке и исходном порядке; унифицированы отступы и завершающие точки с запятой. Уточнены имена для 642 локальных привязок в 36 файлах. Сопоставление имён ниже учитывает реальный тип и контекст; одинаковые короткие имена означали разные сущности.

Новые прикладные helper-функции не выделялись. Экспортируемые имена, API, семантика типов, DOM, CSS-классы, тексты, маршруты, accessibility и сценарии сохранены. Зависимости, lockfile, JSON-конфигурация, CSS, изображения, статические ресурсы и документы регистрации авторского права не менялись. В файлах seed изменялось оформление исходного кода, а не данные. Порядок импортов и побочных эффектов сохранён.

## Как проверялась эквивалентность

1. До изменений сохранено содержимое всех 90 собственных исходных файлов, включая untracked diagnostics.ts и diagnostics.test.ts.
2. На этапах проверены исходные токены, типы и результат TypeScript-компиляции. Для JSX отдельно проверялся скомпилированный текст, чтобы переносы строк не изменили отображаемые пробелы.
3. До и после сопоставлены AST всех 90 файлов: локальные символы нормализованы по объявлениям, сокращённые свойства развёрнуты с сохранением ключей, составные объявления сопоставлены по исходной последовательности. Проверены ссылки на символы, что исключает подмену внешней переменной одноимённым параметром. Экспортируемые имена сверены отдельно. Результат PASS для всех файлов.
4. Такое же сопоставление выполнено для скомпилированного JavaScript всех 90 файлов, включая JSX. Результат PASS.
5. Финальные production JS и CSS побайтово совпали с baseline: index-Ctk8xSND.js (541.80 KB, gzip 148.48 KB), index-DpFCHO5q.css (64.15 KB, gzip 12.00 KB).
6. Для существующих проверок career-ui, profile и navigation совпали побайтово все 20 общих PNG-снимков до/после: 3 + 5 + 12. Снимки служили временной проверкой и не добавлены в проект.

Таким образом сохранены веса matching 30/25/20/15/10, пороги, score/coverage, сортировка, ограничения мест, вузовские версии и история, снимки откликов и практик, проверки и порядок согласования. OAuth endpoints, headers, scope, модель, переменные окружения, User-Agent и TLS/CA-обработка не изменялись этим рефакторингом.

## Проверки

| Команда | До | После |
|---|---|---|
| npm.cmd test | 54/54, 10 файлов PASS | 54/54, 10 файлов PASS |
| npm.cmd run typecheck | PASS | PASS |
| npm.cmd run lint | PASS | PASS |
| npm.cmd run build | PASS | PASS |
| git diff --check | PASS | PASS |

В package.json отдельной unit-команды нет: unit/domain/server tests выполняет существующий test (vitest run).

Дополнительно выполнены все 17 существующих браузерных scripts test:* и существующий tests/career-ui-browser.mjs (18 запусков до и 18 после). Edge headless, локальный Vite 127.0.0.1:5173. Для всех запусков использован одинаковый внешний harness: DEMO_BASE_URL, общий locator timeout 6 секунд, максимум 90 секунд на suite; снимки направлялись во временную папку. Шаги и ожидания самих тестов не адаптировались. Более ранние снимки, затронутые locator.screenshot при baseline, восстановлены побайтово; бинарные ресурсы не входят в итоговый diff.

| Браузерная проверка | До | После |
|---|---|---|
| test:browser | FAIL | FAIL |
| test:b1 | PASS | PASS |
| test:b2 | PASS | PASS |
| test:c | FAIL | FAIL |
| test:d | FAIL | FAIL |
| test:static | FAIL | FAIL |
| test:jury | FAIL | FAIL |
| test:audit | FAIL | FAIL |
| test:entry | PASS | PASS |
| test:more | FAIL | FAIL |
| test:roles | PASS | PASS |
| test:companies | PASS | PASS |
| test:welcome | FAIL | PASS |
| test:navigation | PASS | PASS |
| test:profile | PASS | PASS |
| test:typography | PASS | PASS |
| test:ai | FAIL | FAIL |
| career-ui | PASS | PASS |

Baseline: 9/18 PASS; итог: 10/18 PASS. Новых падений нет. Восемь прежних сбоев повторились; test:welcome был нестабилен в baseline и прошёл итоговый запуск. После браузерного прогона удалены лишние пустые строки в многострочных списках параметров; повторные проверки исходного/скомпилированного AST, test/typecheck/lint/build подтверждают сохранение поведения и идентичность bundle.

## Проблемы, существовавшие до рефакторинга

- test:browser ищет прежний #interests.
- test:c и test:jury ищут прежний контрол «Тестовая роль».
- test:d не находит ожидаемую ссылку «Перейти к содержимому» на проверяемом экране выбора роли.
- test:static требует, чтобы все HTTP-запросы находились под /demo-preview/; текущий запрос доступности ИИ идёт на /.netlify/functions/ai.
- test:audit ожидает кнопку «В избранное» в своём старом маршруте входа.
- test:more ожидает 3 секции, текущий интерфейс содержит 5.
- test:ai использует exact-имя «Заполнить с помощью ИИ», которое уже до задачи включает текст статуса доступности.
- test:welcome проходит детерминированные стадии и стыки, но baseline падает на точном равенстве CSS currentTime после visibilitychange: разница порядка кадра. Проверка чувствительна к таймингу среды.
- Vite предупреждает о JS-чанке >500 KB и до, и после задачи.
- В прежней записи docs/progress.md от 17.10 есть текст с заменёнными символами. Он не исправлялся.

Эти проблемы оставлены без исправлений; результаты не объявляются полностью зелёными. Реальные OAuth/chat-запросы, физический телефон и deploy не проверялись и не изменялись.

## Полный список исходных файлов

### app/src/adapters/

- [accessibility.ts](../app/src/adapters/accessibility.ts)
- [documentExport.ts](../app/src/adapters/documentExport.ts)
- [downloadText.ts](../app/src/adapters/downloadText.ts)

### app/src/data/

- [b2-seed.ts](../app/src/data/b2-seed.ts)
- [c-seed.ts](../app/src/data/c-seed.ts)
- [seed.ts](../app/src/data/seed.ts)

### app/src/domain/

- [access.ts](../app/src/domain/access.ts)
- [analytics.ts](../app/src/domain/analytics.ts)
- [audit.test.ts](../app/src/domain/audit.test.ts)
- [b1-types.ts](../app/src/domain/b1-types.ts)
- [b1.test.ts](../app/src/domain/b1.test.ts)
- [b1.ts](../app/src/domain/b1.ts)
- [b2-types.ts](../app/src/domain/b2-types.ts)
- [b2.test.ts](../app/src/domain/b2.test.ts)
- [b2.ts](../app/src/domain/b2.ts)
- [c-types.ts](../app/src/domain/c-types.ts)
- [c.test.ts](../app/src/domain/c.test.ts)
- [c.ts](../app/src/domain/c.ts)
- [documentBundle.test.ts](../app/src/domain/documentBundle.test.ts)
- [documentBundle.ts](../app/src/domain/documentBundle.ts)
- [foundation.test.ts](../app/src/domain/foundation.test.ts)
- [guidance.ts](../app/src/domain/guidance.ts)
- [matching.ts](../app/src/domain/matching.ts)
- [operations.ts](../app/src/domain/operations.ts)
- [personName.ts](../app/src/domain/personName.ts)
- [profile-details.test.ts](../app/src/domain/profile-details.test.ts)
- [profile-details.ts](../app/src/domain/profile-details.ts)
- [types.ts](../app/src/domain/types.ts)

### app/src/features/

- [AIAvailability.tsx](../app/src/features/AIAvailability.tsx)
- [AIResumeAssistant.tsx](../app/src/features/AIResumeAssistant.tsx)
- [ArchitectureBackground.tsx](../app/src/features/ArchitectureBackground.tsx)
- [Avatar.tsx](../app/src/features/Avatar.tsx)
- [B1View.tsx](../app/src/features/B1View.tsx)
- [B2View.tsx](../app/src/features/B2View.tsx)
- [CView.tsx](../app/src/features/CView.tsx)
- [CandidateEducation.tsx](../app/src/features/CandidateEducation.tsx)
- [CareerActions.tsx](../app/src/features/CareerActions.tsx)
- [CaseInMark.tsx](../app/src/features/CaseInMark.tsx)
- [CompanyCard.tsx](../app/src/features/CompanyCard.tsx)
- [DocumentChecklist.tsx](../app/src/features/DocumentChecklist.tsx)
- [Navigation.tsx](../app/src/features/Navigation.tsx)
- [ProcessSummary.tsx](../app/src/features/ProcessSummary.tsx)
- [ProfileDescription.tsx](../app/src/features/ProfileDescription.tsx)
- [ProfileEditors.tsx](../app/src/features/ProfileEditors.tsx)
- [ProfileSections.tsx](../app/src/features/ProfileSections.tsx)
- [RoleHome.tsx](../app/src/features/RoleHome.tsx)
- [StudentProfile.tsx](../app/src/features/StudentProfile.tsx)
- [TaskQueue.tsx](../app/src/features/TaskQueue.tsx)
- [Welcome.tsx](../app/src/features/Welcome.tsx)

### app/src/services/

- [aiService.ts](../app/src/services/aiService.ts)
- [universityDataProvider.test.ts](../app/src/services/universityDataProvider.test.ts)
- [universityDataProvider.ts](../app/src/services/universityDataProvider.ts)

### app/src/storage/

- [storage.ts](../app/src/storage/storage.ts)
- [validateB1.ts](../app/src/storage/validateB1.ts)
- [validateB2.ts](../app/src/storage/validateB2.ts)
- [validateC.ts](../app/src/storage/validateC.ts)

### app/server/

- [ai.test.ts](../app/server/ai.test.ts)
- [aiHandler.ts](../app/server/aiHandler.ts)
- [diagnostics.test.ts](../app/server/diagnostics.test.ts)
- [diagnostics.ts](../app/server/diagnostics.ts)
- [gigaChat.ts](../app/server/gigaChat.ts)
- [mockAI.ts](../app/server/mockAI.ts)
- [prompts.ts](../app/server/prompts.ts)
- [transport.ts](../app/server/transport.ts)

### app/shared/

- [aiContract.ts](../app/shared/aiContract.ts)

### app/netlify/

- [functions/ai.ts](../app/netlify/functions/ai.ts)

### app/scripts/

- [coverage.mjs](../app/scripts/coverage.mjs)
- [optimize-welcome.mjs](../app/scripts/optimize-welcome.mjs)

### app/tests/

- [ai-browser.mjs](../app/tests/ai-browser.mjs)
- [audit-browser.mjs](../app/tests/audit-browser.mjs)
- [b1-browser.mjs](../app/tests/b1-browser.mjs)
- [b2-browser.mjs](../app/tests/b2-browser.mjs)
- [browser.mjs](../app/tests/browser.mjs)
- [c-browser.mjs](../app/tests/c-browser.mjs)
- [career-ui-browser.mjs](../app/tests/career-ui-browser.mjs)
- [companies-browser.mjs](../app/tests/companies-browser.mjs)
- [d-browser.mjs](../app/tests/d-browser.mjs)
- [entry-browser.mjs](../app/tests/entry-browser.mjs)
- [jury-browser.mjs](../app/tests/jury-browser.mjs)
- [more-browser.mjs](../app/tests/more-browser.mjs)
- [navigation-browser.mjs](../app/tests/navigation-browser.mjs)
- [profile-browser.mjs](../app/tests/profile-browser.mjs)
- [role-dialog-browser.mjs](../app/tests/role-dialog-browser.mjs)
- [static-browser.mjs](../app/tests/static-browser.mjs)
- [typography-browser.mjs](../app/tests/typography-browser.mjs)
- [welcome-animation-browser.mjs](../app/tests/welcome-animation-browser.mjs)

### Точка входа и конфигурации

- [app/src/main.tsx](../app/src/main.tsx)
- [app/vite.config.ts](../app/vite.config.ts)
- [app/eslint.config.mjs](../app/eslint.config.mjs)

Служебная документация этого этапа: данный отчёт и добавленная запись docs/progress.md.
Проверен и оставлен без изменений статический [app/src/data/projectContext.ts](../app/src/data/projectContext.ts).

## Переименования локальных переменных и параметров

Повторяющиеся в одном файле пары сведены в одну запись. Имена индексов коротких циклов и неочевидные для безопасного переименования привязки сохранены.

| Файл | Было → стало |
|---|---|
| [server/transport.ts](../app/server/transport.ts) | `req → providerRequest`, `res → providerResponse` |
| [shared/aiContract.ts](../app/shared/aiContract.ts) | `v → value` |
| [src/adapters/accessibility.ts](../app/src/adapters/accessibility.ts) | `e → event` |
| [src/adapters/documentExport.ts](../app/src/adapters/documentExport.ts) | `s → state`, `d → document`, `d → candidateDocument`, `c → practice` |
| [src/data/b2-seed.ts](../app/src/data/b2-seed.ts) | `o → candidateOffer`, `c → practice`, `c → candidatePractice`, `s → candidateStudent`, `s → candidateCompany` |
| [src/domain/access.ts](../app/src/domain/access.ts) | `s → state`, `p → persona`, `p → candidatePersona` |
| [src/domain/analytics.ts](../app/src/domain/analytics.ts) | `s → state`, `f → filters`, `o → candidateOffer`, `c → candidatePractice`, `st → candidateStudent`, `apps → applications`, `a → candidateApplication`, `finished → finishedPractices`, `credited → creditedPractices`, `placed → placedStudentIds`, `n → totalCapacity`, `publication → publishedOffers`, `afterJob → offersAfterPractice`, `durations → approvalDurations`, `a → analytics` |
| [src/domain/b1.ts](../app/src/domain/b1.ts) | `m → fieldMatch` |
| [src/domain/b2.ts](../app/src/domain/b2.ts) | `old → existingOffer` |
| [src/domain/c-types.ts](../app/src/domain/c-types.ts) | `s → state` |
| [src/domain/c.ts](../app/src/domain/c.ts) | `s → state`, `c → changes`, `c → candidateCompany`, `r → placeRequest`, `r → candidatePlaceRequest`, `x → candidatePlaceRequest`, `v → requirement`, `old → existingRequirement`, `r → candidateRequirement`, `v → template`, `old → existingTemplate`, `t → candidateTemplate`, `b → candidateImportBatch`, `r → importRow`, `old → existingStudent`, `e → education`, `b → importBatch`, `t → ticket`, `t → candidateTicket`, `p → persona`, `o → candidateOffer`, `e → candidateEducation`, `t → originalTicket`, `x → candidateTicket`, `o → offer`, `d → candidateEntry`, `d → entry`, `x → candidateEntry` |
| [src/domain/documentBundle.ts](../app/src/domain/documentBundle.ts) | `c → practice`, `c → candidatePractice`, `d → candidateDocument` |
| [src/domain/guidance.ts](../app/src/domain/guidance.ts) | `c → practice`, `d → candidateDocument`, `t → candidateTask` |
| [src/domain/matching.ts](../app/src/domain/matching.ts) | `known → knownSkills`, `matched → matchedSkills`, `related → relatedProjects`, `weight → knownWeight`, `c → constraint`, `a → leftMatch`, `b → rightMatch` |
| [src/domain/operations.ts](../app/src/domain/operations.ts) | `p → candidatePersona`, `o → candidateOffer`, `s → candidateStudent`, `c → candidateCompany` |
| [src/features/AIResumeAssistant.tsx](../app/src/features/AIResumeAssistant.tsx) | `e → error`, `e → event`, `s → state` |
| [src/features/B1View.tsx](../app/src/features/B1View.tsx) | `s → state`, `f → candidateFactor`, `s → candidateStudent`, `e → error`, `o → candidateOffer`, `c → candidateCompany`, `e → candidateEducation`, `p → candidateProject`, `r → candidateResume`, `r → resume`, `e → event`, `a → candidateApplication`, `a → application`, `r → candidateCorrectionRequest`, `s → student`, `p → indexedStudent`, `n → candidateNotification`, `a → leftOffer`, `b → rightOffer` |
| [src/features/B2View.tsx](../app/src/features/B2View.tsx) | `s → state`, `p → persona`, `a → candidateApplication`, `e → event`, `i → candidateInvitation`, `o → candidateOffer`, `c → candidatePractice`, `c → practice`, `s → candidateStudent`, `m → candidateMessage`, `r → candidateResume`, `e → error`, `st → candidateStudent`, `co → candidateCompany`, `d → candidateDocument`, `t → candidateTask`, `x → candidateDocument`, `a → leftDocument`, `b → rightDocument`, `v → candidateDocument`, `d → candidateEntry`, `c → candidateCompany` |
| [src/features/CView.tsx](../app/src/features/CView.tsx) | `s → state`, `p → persona`, `c → changes`, `co → candidateCompany`, `o → candidateOffer`, `e → event`, `d → candidateEntry`, `x → candidateEntry`, `st → student`, `s → candidateStudent`, `st → candidateStudent`, `c → candidatePractice`, `a → candidateApplication`, `d → document`, `d → candidateDocument`, `c → practice`, `r → candidatePlaceRequest`, `c → candidateCompany`, `r → placeRequest`, `t → candidateTemplate`, `r → candidateRequirement`, `t → candidateTicket`, `e → candidateEducation` |
| [src/features/CandidateEducation.tsx](../app/src/features/CandidateEducation.tsx) | `p → candidateProject` |
| [src/features/CompanyCard.tsx](../app/src/features/CompanyCard.tsx) | `o → candidateOffer` |
| [src/features/DocumentChecklist.tsx](../app/src/features/DocumentChecklist.tsx) | `d → document`, `d → candidateDocument` |
| [src/features/ProfileDescription.tsx](../app/src/features/ProfileDescription.tsx) | `e → event` |
| [src/features/ProfileEditors.tsx](../app/src/features/ProfileEditors.tsx) | `e → event`, `e → error` |
| [src/features/ProfileSections.tsx](../app/src/features/ProfileSections.tsx) | `r → candidateResume`, `c → candidatePractice`, `o → candidateCompany`, `p → candidateProject` |
| [src/features/RoleHome.tsx](../app/src/features/RoleHome.tsx) | `s → candidateStudent`, `a → candidateApplication`, `c → candidatePractice`, `o → candidateOffer`, `c → candidateCompany`, `c → candidateCorrectionRequest` |
| [src/features/StudentProfile.tsx](../app/src/features/StudentProfile.tsx) | `s → candidateStudent`, `e → candidateEducation`, `p → candidateProject`, `r → candidateResume`, `c → candidatePractice`, `e → error` |
| [src/features/TaskQueue.tsx](../app/src/features/TaskQueue.tsx) | `p → persona`, `a → application`, `a → candidateApplication`, `o → candidateOffer`, `s → candidateStudent`, `c → practice`, `c → candidatePractice`, `d → candidateDocument`, `r → correctionRequest`, `r → candidateCorrectionRequest`, `t → candidateTicket`, `c → candidateCompany` |
| [src/features/Welcome.tsx](../app/src/features/Welcome.tsx) | `e → event` |
| [src/main.tsx](../app/src/main.tsx) | `s → candidateStudent`, `e → error`, `e → event`, `n → candidateNotification` |
| [src/services/aiService.ts](../app/src/services/aiService.ts) | `v → responsePayload` |
| [src/storage/storage.ts](../app/src/storage/storage.ts) | `v → savedState`, `p → candidatePersona`, `e → error` |
| [src/storage/validateB1.ts](../app/src/storage/validateB1.ts) | `v → candidateValue`, `x → candidateRecord`, `v → candidateRecord`, `e → candidateEducation`, `s → candidateStudent`, `d → disciplineRecord`, `h → historyRecord` |
| [src/storage/validateB2.ts](../app/src/storage/validateB2.ts) | `v → candidateValue`, `v → candidateRecord`, `x → candidateRecord`, `h → historyRecord` |
| [src/storage/validateC.ts](../app/src/storage/validateC.ts) | `v → candidateValue`, `x → candidateValue`, `x → candidateRecord`, `d → disciplineRecord` |
| [vite.config.ts](../app/vite.config.ts) | `req → incomingRequest`, `res → outgoingResponse` |

## Diff-summary только этого рефакторинга

Сравнение сохранённого начального рабочего дерева и результата, без прежних пользовательских изменений и документации:

```text
 89 files changed, 15454 insertions(+), 2385 deletions(-)
```

Проверить локально: cd app, npm.cmd run dev; открыть адрес Vite. Следующее действие: просмотреть diff исходников и отдельно решить судьбу прежних браузерных сбоев. Коммит, push и публикация в рамках этой задачи не выполнялись.
