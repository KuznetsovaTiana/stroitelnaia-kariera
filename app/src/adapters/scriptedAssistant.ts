export const assistantQuestions=['Какова ваша цель?','Какую учебную задачу вы решали?','Что сделали лично вы?','Какие инструменты использовали?','Каков учебный результат?','Какие условия вас интересуют?'];
const focus:Record<string,string>={'ПТО':'организация строительных работ','BIM/ТИМ':'информационное моделирование','Проектирование':'проектирование конструкций','Сметное дело':'подготовка смет'};
export function scriptedAssistant(branch:string,answers:string[],simulateError=false){
 if(simulateError)throw new Error('Контрольная ошибка помощника. Ответы сохранены; можно повторить или написать текст вручную.');
 if(!focus[branch]||answers.length!==6)throw new Error('Выберите траекторию и шесть ответов');
 const labels=['Цель','Учебная задача','Личный вклад','Инструменты','Учебный результат','Условия'];
 const facts=answers.map((answer,i)=>({label:labels[i],value:answer.trim()})).filter(f=>f.value.length>2);
 const missing=labels.filter((_,i)=>answers[i].trim().length<=2);
 const text=`Интересующая траектория: ${branch} (${focus[branch]}).\n`+facts.map(f=>`${f.label}: ${f.value}.`).join('\n')+(missing.length?'\nНужно уточнить: '+missing.join(', ')+'.':'');
 if(text.length>3000)throw new Error('Предварительный текст превышает 3000 символов. Сократите ответы или подготовьте текст вручную.');
 return {text,facts,missing};
}

