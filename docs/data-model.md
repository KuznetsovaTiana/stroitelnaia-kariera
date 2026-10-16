# Модель данных и правила переходов

Рабочая инженерная спецификация демо. Идентификаторы стабильные строки, ссылки между сущностями — по ID. Даты календарных периодов `YYYY-MM-DD`; события — ISO datetime. Для демонстрационной хронологии использовать единые часы `demoClock`, не сравнивать часть данных с реальным временем, а часть с вымышленным.

## Сущности

Все изменяемые сущности: `id`, `createdAt`, `updatedAt`, `version`. Для агрегатов версия увеличивается при доменной операции. Указанные ниже поля — минимум, уточнение типов допускается при реализации.

| Сущность | Основные поля | Связи и смысл |
|---|---|---|
| DemoUser | role, organizationId?, studentId?, subrole?, active | Одна основная роль; не настоящий пользовательский аккаунт |
| University | name, slug, description, demoOnly | Один объект МГСУ |
| Program | universityId, name, degreeLevel, skillIds | Названия программ в первом наборе иллюстративны |
| Student | universityId, programId, group, course, graduationYear, displayName, region, availability, profileVisibility | Персональные сведения вымышленные |
| EducationRecord | studentId, programVersion, disciplines[], results[], skills[], source, sourceDate, history[] | Источник `university_demo`; дисциплина не равна автоматически профессиональному владению навыком |
| CorrectionRequest | studentId, recordId, fieldPath, proposedValue, reason, status, resolution | pending / approved / rejected, решение координатора |
| Project | studentId, title, task, personalContribution, tools[], outcome, source | Учебный опыт, не трудовой стаж |
| Resume | studentId, title, target, summary, projectIds, skillClaims[], visibility, version | Черновик или готово; факты и описание раздельно |
| Company | name, logoUrl?, constructionAreas[], regions[], description, verificationStatus, history[] | draft / pending / approved / rejected / suspended |
| TeamMember | companyId, userId, subrole, assignedOfferIds[] | Полномочия внутри одной компании |
| Offer | companyId, kind, title, professionId, location, schedule, compensation, requirements, status, version | kind: practice / internship / job; единые общие поля |
| PracticeOfferFields | practiceType, startDate, endDate, durationHours, capacity, supervisorId, expectedTasks, universityCompatibility | Расширение Offer для kind=practice; поля вместимости и сроков обязательны |
| Invitation | companyId, offerId, studentId, message, status | pending / accepted / declined / cancelled |
| Application | offerId, studentId, resumeSnapshot, source, selectionStatus, offerResponse, history[] | Snapshot сохраняет отправленную версию; изменение резюме не переписывает отклик |
| PracticeCase | applicationId, studentId, companyId, offerId, organizationStatus, academicResult, requirementSnapshot, supervisors, reservationActive | Создаётся после принятия студентом предложения практики |
| PracticeTask | practiceId, title, dueDate, studentText, status, comments[] | assigned / submitted / revision / accepted |
| PracticeReport | practiceId, text, version, status, employerFeedback, coordinatorFeedback | Результат не публикуется в публичном профиле автоматически |
| RequirementSet | universityId, programId, practiceType, version, requiredFields, requiredDocuments, completionRules | Версия фиксируется в деле практики |
| DocumentTemplate | universityId, type, version, fieldDefinitions, bodyTemplate | Только разрешённые переменные, без исполняемого HTML |
| PracticeDocument | practiceId, templateId, templateVersion, contentSnapshot, version, status, comments[] | История версий, состояние конкретной версии |
| UniversityRequest | universityId, companyId, programId, period, requestedPlaces, proposedPlaces, status | Запрос организации мест, не групповое назначение студентов |
| Conversation / Message | participantIds, applicationId?, practiceId?, authorId, text, sentAt | Контекст и проверка участника обязательны |
| Notification | recipientId, eventId, type, target, readAt? | Не дублировать по одному событию |
| Ticket | authorId, category, objectRef?, status, comments[] | open / in_progress / resolved / closed |
| ModerationDecision | objectType, objectId, operatorId, decision, reason | Решение видно владельцу объекта |
| DictionaryItem / Profession | category, name, active, skillIds, description | Деактивация не уничтожает исторические связи |
| SavedSearch / Favorite | userId, filters / offerId | Один объект на пару пользователь–предложение |
| ImportBatch | sourceName, rows, errors, appliedIds, status | preview / invalid / ready / applied; upsert по внешнему демо-ID |
| AuditEvent | id, actorId, type, objectRef, at, payload, origin | Неизменяемое событие, origin: seed / visitor |
| ContentEntry / AiReview | key, content / exampleId, verdict, comment | Контент и оценка сохранённого примера генерации |

## Отклик и предложение

`selectionStatus`: submitted → viewed → info_requested / interview / offered / rejected.
Из info_requested и interview разрешено вернуться к viewed, перейти к offered или rejected. Из submitted можно сразу offered/rejected после просмотра карточки и явного действия. `withdrawn` доступен студенту до принятия предложения. Терминальные rejected/withdrawn не меняются обычной кнопкой этапа.

`offerResponse`: none → pending (при offered) → accepted / declined. При отказе отклик остаётся offered с declined; это не отказ работодателя. Повторное нажатие не создаёт новый отклик или практику.

Для практики принятие предложения студентом создаёт ровно один PracticeCase со статусом awaiting_university и резервирует место. Для job/internship изменяется отклик, но учебное дело автоматически не создаётся. Стажировка не приравнивается к учебной практике.

Приглашение accepted создаёт или использует существующий отклик. До принятия студент выбирает резюме и подтверждает раскрытие. При наличии открытого отклика не создавать вторую сущность. Приглашение само по себе место не резервирует.

## Организация практики

1. `awaiting_university`: студент принял предложение компании и направляет сведения координатору. Дело появляется в очереди только после явного действия «Отправить на согласование»; для этого есть `submittedToUniversityAt`.
2. `changes_requested`: координатор вернул с обязательным комментарием. Студент исправляет доступные поля и повторно направляет; компания уточняет свои условия через связанное дело.
3. `approved`: координатор одобрил соответствие требованиям и обязательные документы. Незаполненные условия и несогласованные обязательные документы блокируют переход.
4. `in_progress`: начало практики подтверждается координатором; для показа можно использовать подписанное как демо действие «Перейти к началу практики», которое двигает demoClock вперёд, а не меняет реальные даты.
5. `review`: студент сдал отчёт, работодатель оставил отзыв; координатор проверяет результат. При замечаниях возврат в in_progress с историей.
6. `completed`: координатор зафиксировал итог; `academicResult` credited или not_credited. До этого он not_assessed, при возврате needs_revision.
7. `cancelled`: отмена студентом до начала либо координатором с причиной; резерв освобождается. Во время/после прохождения отмена только координатором, с сохранением истории.

Рабочее упрощение: одно активное учебное дело на студента в пересекающийся период. Уже завершённые практики не запрещают новые. Другие активные отклики остаются видимыми, но принять несовместимое предложение нельзя.

## Документы

`draft → in_review → approved | changes_requested`. При доработке создаётся новая draft-версия; старая согласованная версия остаётся доступна. Согласование относится к версии, а не навсегда к названию документа. Документы можно готовить в awaiting_university/changes_requested. Для перехода дела в approved все обязательные на этом этапе документы должны быть approved. Итоговый отчёт требуется позже, перед completed: он не блокирует начало практики.

## Публикация и места

Предложение: draft → pending_moderation → published / changes_requested / rejected. Исправление возвращённой карточки → pending_moderation. Архивирование доступно владельцу; опубликованные существенные изменения условий требуют повторной модерации. `needs_reconfirmation` — условие устарело; скрыть из новых откликов до повторного подтверждения и проверки. Старые отклики не удаляются.

Условие публичности: компания approved и предложение published. `available = capacity − число reservationActive для данного предложения`. Резерв возникает только при принятии студентом предложения. Отмена освобождает, завершение практики сохраняет занятое место для этой датированной смены. Новый период — новое предложение. Запрещено снижать capacity ниже количества резервов. Архивирование не отменяет уже принятые места.

## Инварианты

- Только опубликованное доступное предложение допускает новый отклик. Один активный отклик на studentId + offerId.
- Операции повторного нажатия идемпотентны; связанные сущности, событие и уведомление создаются одной доменной операцией.
- Нельзя менять сведения чужой организации. Проверки присутствуют в обработчиках операций, не только в видимости кнопок.
- Вузовское поле меняется только после решения координатора или подтверждённого тестового импорта; прежнее значение остаётся в истории.
- Никакого сохранения вычисленных счётчиков как независимой истины: вычислять из сущностей/событий.
- Любой переход проверяет допустимое предыдущее состояние; ошибку показывать пользователю, а не молча игнорировать.
