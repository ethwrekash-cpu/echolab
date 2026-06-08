const STORAGE_KEY = "echo-lab-v4-state";
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

const roomOrder = ["atrium", "archive", "server", "generator", "lab", "observatory", "finale"];

const rooms = {
  atrium: {
    name: "Входной зал",
    title: "Доступ к архиву",
    story:
      "Система ЭХО потеряла внешний сигнал. Архив закрыт, но рядом с пультом лежит пропуск дежурного оператора.",
    next: "archive",
    nextText: "После подтверждения доступа откроется архив.",
    demo: ["где я", "что осталось", "осмотреться", "осмотреть пульт", "взять пропуск", "показать пропуск", "открыть дверь", "дальше"],
    tasks: [
      { id: "passTaken", text: "Пропуск найден", missing: "взять пропуск", done: (s) => hasItem(s, "пропуск"), required: true },
      { id: "archiveOpen", text: "Доступ в архив подтвержден", missing: "подтвердить доступ у двери архива", done: (s) => s.flags.archiveOpen, required: true },
    ],
  },
  archive: {
    name: "Архив",
    title: "Причина аварии",
    story:
      "На столе лежит диктофон с записью инженера и архивный модуль. Без этих данных следующий отсек бесполезен.",
    next: "server",
    nextText: "Серверная сможет восстановить отчет, если у вас есть архивный модуль.",
    demo: ["осмотреть стол", "прослушать запись и взять архивный модуль", "что осталось", "идти в серверную"],
    tasks: [
      { id: "recordHeard", text: "Запись прослушана", missing: "прослушать запись", done: (s) => s.flags.recordHeard, required: true },
      { id: "moduleTaken", text: "Архивный модуль забран", missing: "забрать архивный модуль", done: (s) => hasItem(s, "архивный модуль"), required: true },
    ],
  },
  server: {
    name: "Серверная",
    title: "Память системы",
    story:
      "Центральная стойка просит модуль архива. Отчет должен объяснить, почему сорвался портал.",
    next: "generator",
    nextText: "После расшифровки отчета можно возвращать питание.",
    demo: ["осмотреть стойку", "вставить модуль и расшифровать отчет", "куда идти", "идти к генератору"],
    tasks: [
      { id: "moduleInserted", text: "Модуль вставлен в стойку", missing: "вставить архивный модуль в стойку", done: (s) => s.flags.moduleInserted, required: true },
      { id: "reportDecrypted", text: "Отчет о сбое восстановлен", missing: "расшифровать отчет о сбое", done: (s) => s.flags.reportDecrypted, required: true },
    ],
  },
  generator: {
    name: "Генераторная",
    title: "Питание комплекса",
    story:
      "Генератор отключен. Терминал требует пропуск, а шкала частоты сбита после аварии.",
    next: "lab",
    nextText: "Лифт в лабораторию включится только после запуска генератора.",
    demo: ["осмотреть генератор", "использовать пропуск затем настроить частоту и включить генератор", "идти в лабораторию"],
    tasks: [
      { id: "passInserted", text: "Терминал разблокирован пропуском", missing: "использовать пропуск на терминале", done: (s) => s.flags.passInserted, required: true },
      { id: "frequencySet", text: "Частота выставлена на 42 Гц", missing: "настроить частоту генератора", done: (s) => s.flags.frequencySet, required: true },
      { id: "generatorOnline", text: "Генератор запущен", missing: "включить генератор", done: (s) => s.flags.generatorOnline, required: true },
    ],
  },
  lab: {
    name: "Лаборатория",
    title: "Стабилизация портала",
    story:
      "Отчет указывает на перегрев и рассинхронизацию. В лаборатории остались стабилизатор и панель охлаждения.",
    next: "observatory",
    nextText: "Поднимайтесь в обсерваторию только после подготовки портала.",
    demo: ["осмотреть лабораторию", "взять стабилизатор и восстановить охлаждение", "что осталось", "идти в обсерваторию"],
    tasks: [
      { id: "stabilizerTaken", text: "Стабилизатор взят", missing: "взять стабилизатор", done: (s) => hasItem(s, "стабилизатор"), required: true },
      { id: "coolantStable", text: "Охлаждение восстановлено", missing: "восстановить охлаждение", done: (s) => s.flags.coolantStable, required: true },
    ],
  },
  observatory: {
    name: "Обсерватория",
    title: "Финальный протокол",
    story:
      "Антенна ЭХО смотрит в небо. Консоль ждет кристалл памяти и решение оператора.",
    next: "finale",
    nextText: "Подготовьте кристалл и антенну, затем выберите финальный протокол.",
    demo: ["осмотреть консоль", "что нужно для запуска", "взять кристалл и синхронизировать антенну", "запусти портал", "отправить сигнал", "эвакуироваться", "аварийный запуск"],
    tasks: [
      { id: "crystalTaken", text: "Кристалл памяти взят", missing: "взять кристалл памяти", done: (s) => hasItem(s, "кристалл памяти"), required: true },
      { id: "antennaSynced", text: "Антенна синхронизирована", missing: "синхронизировать антенну", done: (s) => s.flags.antennaSynced, required: true },
    ],
  },
};

const finales = {
  finaleGood: {
    name: "Финал",
    title: "Сигнал восстановлен",
    story: "Портал стабилен. Комплекс передает сигнал наружу, а данные проекта сохранены.",
    reason: "Все обязательные системы были подготовлены: питание, охлаждение, стабилизатор, кристалл и антенна.",
    ending: "хорошая",
    demo: ["статистика"],
  },
  finaleNeutral: {
    name: "Финал",
    title: "Эвакуация завершена",
    story: "Оператор покинул комплекс. Данные частично спасены, но сигнал ЭХО не восстановлен.",
    reason: "Вы выбрали безопасный выход вместо восстановления сигнала.",
    ending: "нейтральная",
    demo: ["статистика"],
  },
  finaleBad: {
    name: "Финал",
    title: "Сбой протокола",
    story: "Аварийный запуск перегрузил антенну. Комплекс перешел в глубокую блокировку.",
    reason: "Портал был запущен аварийно, без штатного протокола восстановления.",
    ending: "плохая",
    demo: ["статистика"],
  },
};

const allRooms = { ...rooms, ...finales };

const initialFlags = {
  archiveOpen: false,
  recordHeard: false,
  moduleInserted: false,
  reportDecrypted: false,
  passInserted: false,
  frequencySet: false,
  generatorOnline: false,
  coolantStable: false,
  antennaSynced: false,
};

const dom = {
  voiceStatus: document.querySelector("#voice-status"),
  soundToggle: document.querySelector("#sound-toggle"),
  demoPanel: document.querySelector("#demo-panel"),
  demoCommandList: document.querySelector("#demo-command-list"),
  whereButton: document.querySelector("#where-button"),
  remainingButton: document.querySelector("#remaining-button"),
  nextButton: document.querySelector("#next-button"),
  mapList: document.querySelector("#map-list"),
  locationLabel: document.querySelector("#location-label"),
  sceneTitle: document.querySelector("#scene-title"),
  sceneDescription: document.querySelector("#scene-description"),
  roomStatus: document.querySelector("#room-status"),
  roomPlan: document.querySelector("#room-plan"),
  speechHelp: document.querySelector("#speech-help"),
  lastCommand: document.querySelector("#last-command"),
  voiceVolume: document.querySelector("#voice-volume"),
  voiceRate: document.querySelector("#voice-rate"),
  voiceName: document.querySelector("#voice-name"),
  textCommandForm: document.querySelector("#text-command-form"),
  textCommand: document.querySelector("#text-command"),
  micButton: document.querySelector("#mic-button"),
  micLabel: document.querySelector("#mic-label"),
  taskList: document.querySelector("#task-list"),
  nextStep: document.querySelector("#next-step"),
  inventoryList: document.querySelector("#inventory-list"),
  currentResponse: document.querySelector("#current-response"),
  resetButton: document.querySelector("#reset-button"),
  resultPanel: document.querySelector("#result-panel"),
  resultTitle: document.querySelector("#result-title"),
  resultReason: document.querySelector("#result-reason"),
  statsList: document.querySelector("#stats-list"),
};

const words = {
  inspect: ["осмотреть", "посмотреть", "проверить", "изучить", "оглядеться", "оглянуться", "осмотреться", "что вокруг", "что видно", "что здесь", "что есть", "покажи", "посмотри", "расскажи про", "обследовать"],
  take: ["взять", "возьми", "забрать", "забери", "поднять", "подбери", "подобрать", "получить", "добавить", "прихватить", "подними"],
  use: ["использовать", "применить", "вставить", "подключить", "приложить", "активировать", "задействовать", "поставить", "установить", "показать", "покажи", "поднести", "поднеси"],
  open: ["открыть", "открой", "разблокировать", "отпереть", "откройся", "открывай", "доступ", "отвори", "отпереть"],
  go: ["идти", "перейти", "пойти", "отправиться", "пройти", "войти", "вернуться", "переместиться", "двигаться", "следовать", "направиться", "переход", "дальше", "вперед", "продолжить"],
  listen: ["слушать", "прослушать", "послушать", "включить запись", "диктофон", "запись", "аудио", "проиграть", "воспроизвести"],
  decrypt: ["расшифровать", "дешифровать", "прочитать отчет", "отчет", "восстановить отчет", "разобрать отчет", "открыть отчет"],
  tune: ["настроить", "установить", "выставить", "частота", "сорок два", "42", "герц", "откалибровать", "калибровать"],
  start: ["включить", "запустить", "запусти", "старт", "запитай", "активировать", "активируй", "пуск", "вруби", "завести"],
  repair: ["восстановить", "починить", "наладить", "охлаждение", "контур", "перегрев", "охладить", "стабилизировать"],
  sync: ["синхронизировать", "настроить антенну", "антенна", "сигнал", "подготовить антенну", "выставить антенну", "навести антенну", "согласовать сигнал"],
  portal: ["портал", "консоль", "сигнал", "передать сигнал", "отправить сигнал", "отправь сигнал", "восстановить сигнал", "запуск консоли", "запусти портал", "запустить портал", "начать передачу", "дать сигнал"],
  evacuate: ["эвакуироваться", "эвакуация", "уйти", "покинуть", "выход", "уйдем", "свалить"],
  emergency: ["аварийный запуск", "перегрузка", "аварийно", "форсировать", "принудительно"],
  where: ["где я", "где нахожусь", "какая комната"],
  remaining: ["что осталось", "что сделать", "что делать", "задача", "цель", "чего не хватает", "что нужно", "что нужно сделать"],
  next: ["куда идти", "куда дальше", "следующая комната", "следующий шаг", "маршрут"],
  repeat: ["повтори", "повторить", "последнее сообщение", "что ты сказал", "скажи еще раз"],
  help: ["помощь", "диагностика", "подсказка", "справка"],
  inventory: ["инвентарь", "предметы", "что у меня"],
  stats: ["статистика", "результат", "итоги"],
  reset: [],
};

let state = createInitialState();
let recognition = null;
let isListening = false;
let voiceSessionActive = false;
let pendingVoiceCommandTimer = null;
let pendingVoiceCommandText = "";
let ignoreSpeechUntil = 0;

function createInitialState() {
  return {
    room: "atrium",
    inventory: [],
    flags: { ...initialFlags },
    log: ["Смена началась. На пульте горит аварийный маршрут комплекса ЭХО."],
    lastSystemMessage: "Смена началась. На пульте горит аварийный маршрут комплекса ЭХО.",
    repeatedMistakes: 0,
    lastCommandSignature: "",
    lastCommandAt: 0,
    sound: true,
    demoMode: false,
    stats: {
      startedAt: Date.now(),
      finishedAt: null,
      commands: 0,
      mistakes: 0,
      voiceCommands: 0,
      ending: "",
    },
    voice: {
      volume: 0.45,
      rate: 0.9,
      voiceURI: "",
    },
  };
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function stemWord(word) {
  return normalize(word)
    .replace(/(ами|ями|ого|ему|ыми|ими|ая|яя|ое|ее|ые|ие|ый|ий|ой|ую|юю|ом|ем|ам|ям|ах|ях|ов|ев|а|я|ы|и|у|ю|е|о)$/u, "")
    .slice(0, 10);
}

function expandCommand(command) {
  const expansions = [];
  if (hasAny(command, ["пропуск", "карта", "карточка", "ключ карта", "ключ-карта", "бейдж", "удостоверение", "ключ", "идентификатор"], false)) expansions.push("пропуск");
  if (hasAny(command, ["дверь", "проход", "доступ", "считыватель", "пульт"], false) && (hasAny(command, ["архив"], false) || hasAny(command, ["дальше", "вперед"], false))) expansions.push("открыть архив");
  if (hasAny(command, ["архивный", "модуль", "накопитель", "флешка", "носитель", "данные"], false)) expansions.push("архивный модуль");
  if (hasAny(command, ["стабилизатор", "стабильность", "портальный блок"], false)) expansions.push("стабилизатор");
  if (hasAny(command, ["частота", "герц", "42", "сорок два", "калибровка"], false)) expansions.push("настроить частоту");
  if (hasAny(command, ["питание", "энергия", "электричество", "ток"], false)) expansions.push("генератор");
  if (hasAny(command, ["перегрев", "температура", "холод", "охладить", "радиатор", "контур"], false)) expansions.push("охлаждение");
  if (hasAny(command, ["передача", "связь", "маяк", "эфир"], false)) expansions.push("сигнал передать сигнал");
  if (hasAny(command, ["накопитель памяти", "память", "кристалл"], false)) expansions.push("кристалл память");
  return [command, ...expansions].join(" ");
}

function hasLoosePhrase(command, phrase) {
  const normalizedPhrase = normalize(phrase);
  if (command.includes(normalizedPhrase)) return true;

  const commandTokens = tokenize(command);
  const phraseTokens = tokenize(normalizedPhrase);
  if (!phraseTokens.length) return false;

  return phraseTokens.every((phraseToken) => {
    const phraseStem = stemWord(phraseToken);
    if (phraseStem.length < 3) return commandTokens.includes(phraseToken);
    return commandTokens.some((commandToken) => {
      const commandStem = stemWord(commandToken);
      return commandToken.includes(phraseStem) || phraseToken.includes(commandStem) || commandStem === phraseStem;
    });
  });
}

function hasAny(command, variants, allowExpand = true) {
  const checkedCommand = allowExpand ? command : normalize(command);
  return variants.some((word) => hasLoosePhrase(checkedCommand, word));
}

function hasItem(targetState, item) {
  return targetState.inventory.includes(item);
}

function addItem(item) {
  if (!state.inventory.includes(item)) state.inventory.push(item);
}

function setupSpeechRecognition() {
  if (!SpeechRecognition) {
    setVoiceStatus("Голос недоступен", "warning");
    dom.speechHelp.textContent = "Браузер не дал доступ к Web Speech API. Для демонстрации включите скрытый режим Ctrl+Shift+D или откройте проект в Chrome.";
    dom.micButton.disabled = true;
    dom.micLabel.textContent = "Недоступно";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ru-RU";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.addEventListener("start", () => {
    isListening = true;
    dom.micButton.classList.add("is-listening");
    dom.micLabel.textContent = "Остановить";
    setVoiceStatus("Слушаю постоянно", "ready");
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    voiceSessionActive = false;
    dom.micButton.classList.remove("is-listening");
    flushPendingVoiceCommand();
    dom.micLabel.textContent = "Включить микрофон";
    setVoiceStatus("Микрофон выключен", "warning");
  });

  recognition.addEventListener("result", (event) => {
    if (Date.now() < ignoreSpeechUntil) return;
    const alternatives = getRecognitionAlternatives(event);
    if (!alternatives.length) return;
    queueVoiceCommand(chooseBestTranscript(alternatives));
  });
  recognition.addEventListener("error", (event) => {
    if (event.error !== "no-speech") state.stats.mistakes += 1;
    if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
      voiceSessionActive = false;
    }
    const message = getSpeechErrorMessage(event.error);
    if (event.error === "no-speech") {
      setVoiceStatus("Жду команду", "warning");
      dom.speechHelp.textContent = message;
      return;
    }
    addLog(message, false, "warning");
    setVoiceStatus("Проблема с голосом", "warning");
    finishTurn();
  });

  setVoiceStatus("Микрофон выключен", "warning");
  dom.micLabel.textContent = "Включить микрофон";
  dom.speechHelp.textContent = "Нажмите один раз, разрешите микрофон и говорите короткими фразами.";
}

function startRecognitionSession() {
  if (!recognition || isListening) return;
  try {
    recognition.start();
  } catch {
    setVoiceStatus("Микрофон уже включается", "warning");
  }
}

function queueVoiceCommand(command) {
  if (!command) return;
  pendingVoiceCommandText = command;
  setVoiceStatus("Команда услышана", "ready");
  if (pendingVoiceCommandTimer) window.clearTimeout(pendingVoiceCommandTimer);
  pendingVoiceCommandTimer = window.setTimeout(flushPendingVoiceCommand, 650);
}

function flushPendingVoiceCommand() {
  if (!pendingVoiceCommandText) return;
  const command = pendingVoiceCommandText;
  pendingVoiceCommandText = "";
  if (pendingVoiceCommandTimer) {
    window.clearTimeout(pendingVoiceCommandTimer);
    pendingVoiceCommandTimer = null;
  }
  runCommand(command, "voice");
}

function getRecognitionAlternatives(event) {
  const alternatives = [];
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (!result.isFinal) continue;
    Array.from(result).forEach((item) => {
      if (item.transcript) alternatives.push(item.transcript.trim());
    });
  }
  return alternatives;
}

function stopRecognitionSession() {
  voiceSessionActive = false;

  flushPendingVoiceCommand();
  if (pendingVoiceCommandTimer) {
    window.clearTimeout(pendingVoiceCommandTimer);
    pendingVoiceCommandTimer = null;
  }
  pendingVoiceCommandText = "";
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {
    // recognition may already be stopped.
  }
}

function chooseBestTranscript(alternatives) {
  return alternatives.find((text) => handleCommandPreview(expandCommand(normalize(text)))) || alternatives[0] || "";
}

function handleCommandPreview(command) {
  if (!command) return false;
  if (hasAny(command, words.repeat) || hasAny(command, words.help) || hasAny(command, words.where) || hasAny(command, words.remaining) || hasAny(command, words.next) || hasAny(command, words.inventory) || hasAny(command, words.stats)) return true;
  if (isFinaleRoom(state.room)) return false;
  const handler = roomPreviewHandlers[state.room];
  return Boolean((handler && handler(command)) || hasAny(command, words.inspect) || getTargetRoom(command));
}

function getSpeechErrorMessage(error) {
  const messages = {
    "not-allowed": "Доступ к микрофону запрещен. Разрешите микрофон в настройках сайта или включите скрытый режим Ctrl+Shift+D для тестового ввода.",
    "service-not-allowed": "Служба распознавания речи недоступна в этом браузере. В Edge это зависит от версии и настроек. Для защиты используйте Chrome или скрытый режим Ctrl+Shift+D.",
    "network": "Сервис распознавания речи не отвечает. Проверьте интернет или включите скрытый режим Ctrl+Shift+D.",
    "no-speech": "Пока не слышу команду. Говорите коротко и ближе к микрофону.",
    "audio-capture": "Микрофон не найден или занят другим приложением.",
  };
  return messages[error] || "Речь не распознана. Попробуйте короткую фразу: «что осталось» или «осмотреть комнату».";
}

function setVoiceStatus(message, type = "ready") {
  dom.voiceStatus.textContent = message;
  dom.voiceStatus.classList.toggle("is-ready", type === "ready");
  dom.voiceStatus.classList.toggle("is-warning", type === "warning");
  dom.voiceStatus.classList.toggle("is-error", type === "error");
}

function runCommand(rawCommand, source = "voice") {
  const normalizedRaw = normalize(rawCommand);
  if (!normalizedRaw) return;
  if (source === "voice" && isDuplicateVoiceCommand(normalizedRaw)) return;

  const parts = splitCommandChain(rawCommand);
  const visibleCommand = parts.length > 1 ? parts.join(" → ") : rawCommand;
  dom.lastCommand.textContent = `Распознано: ${visibleCommand}`;
  setVoiceStatus(parts.length > 1 ? "Цепочка принята" : "Команда принята", "ready");

  for (let index = 0; index < parts.length; index += 1) {
    const shouldContinue = runSingleCommand(parts[index], source, { silentStats: index > 0 });
    if (!shouldContinue) break;
  }

  finishTurn();
}

function runSingleCommand(rawCommand, source = "voice", options = {}) {
  const command = expandCommand(normalize(rawCommand));
  if (!command) return true;

  if (!options.silentStats) {
    state.stats.commands += 1;
    if (source === "voice") state.stats.voiceCommands += 1;
  }

  if (hasAny(command, words.repeat)) return finishSingle(() => repeatLastMessage());
  if (hasAny(command, words.help)) return finishSingle(() => describeHelp());
  if (hasAny(command, words.where)) return finishSingle(() => describeLocation());
  if (hasAny(command, words.remaining)) return finishSingle(() => describeRemaining());
  if (hasAny(command, words.next) && !hasAny(command, words.go)) return finishSingle(() => describeNextStep());
  if (hasAny(command, words.inventory)) return finishSingle(() => describeInventory());
  if (hasAny(command, words.stats)) return finishSingle(() => addLog(getStatsText(), true, "info"));

  const handled = handleCommand(command);
  if (!handled) {
    state.stats.mistakes += 1;
    state.repeatedMistakes = (state.repeatedMistakes || 0) + 1;
    addLog(getContextualNudge(command), true, "warning");
  } else {
    state.repeatedMistakes = 0;
  }

  return handled;
}

function finishSingle(callback) {
  callback();
  return true;
}

function splitCommandChain(rawCommand) {
  const normalized = normalize(rawCommand);
  if (!normalized) return [];

  const quickChain = extractKnownActionChain(normalized);
  if (quickChain.length > 1) return quickChain.slice(0, 5);

  const protectedCommand = protectKnownPhrases(normalized);
  const parts = protectedCommand
    .split(/\b(?:и затем|затем|потом|после этого|дальше нужно|далее|после|и еще|а потом|и)\b/u)
    .map((part) => restoreKnownPhrases(part).trim())
    .filter(Boolean)
    .map(completeChainPart);

  return parts.length ? parts.slice(0, 5) : [normalized];
}

function extractKnownActionChain(command) {
  const patterns = [
    { pattern: /(осмотреться|осмотри комнату|осмотреть комнату)/u, command: "осмотреться" },
    { pattern: /(взять|забрать|подобрать|поднять)\s+(пропуск|карту|карточку|бейдж|идентификатор)/u, command: "взять пропуск" },
    { pattern: /(открыть|открой|разблокировать|приложить|показать|использовать)\s+(дверь|архив|проход|пропуск|карту|бейдж)/u, command: "открыть архив" },
    { pattern: /(прослушать|послушать|включить|воспроизвести)\s+(запись|диктофон|аудио)/u, command: "прослушать запись" },
    { pattern: /(взять|забрать|подобрать)\s+(архивный\s+)?(модуль|накопитель|флешку|носитель)/u, command: "взять архивный модуль" },
    { pattern: /(идти|перейти|пойти|пройти)\s+(в\s+)?сервер/u, command: "идти в серверную" },
    { pattern: /(вставить|подключить|поставить|установить|использовать)\s+(архивный\s+)?(модуль|накопитель|флешку|носитель)/u, command: "вставить модуль" },
    { pattern: /(расшифровать|дешифровать|восстановить|прочитать)\s+(отчет|данные)/u, command: "расшифровать отчет" },
    { pattern: /(идти|перейти|пойти|пройти)\s+(к\s+)?генератор/u, command: "идти к генератору" },
    { pattern: /(использовать|приложить|показать)\s+(пропуск|карту|бейдж)/u, command: "использовать пропуск" },
    { pattern: /(настроить|выставить|установить|откалибровать)\s+(частоту|42|сорок\s+два)/u, command: "настроить частоту" },
    { pattern: /(включить|запустить|активировать)\s+(генератор|питание|турбину)/u, command: "включить генератор" },
    { pattern: /(идти|перейти|пойти|пройти)\s+(в\s+)?лаборатор/u, command: "идти в лабораторию" },
    { pattern: /(взять|забрать|подобрать)\s+стабилизатор/u, command: "взять стабилизатор" },
    { pattern: /(стабилизатор)/u, command: "взять стабилизатор" },
    { pattern: /(восстановить|починить|наладить)\s+(охлаждение|контур)/u, command: "восстановить охлаждение" },
    { pattern: /(идти|перейти|пойти|пройти)\s+(в\s+)?обсерватор/u, command: "идти в обсерваторию" },
    { pattern: /(взять|забрать|подобрать)\s+(кристалл|память|накопитель)/u, command: "взять кристалл" },
    { pattern: /(синхронизировать|настроить|навести)\s+(антенну|сигнал)/u, command: "синхронизировать антенну" },
    { pattern: /(запустить|запусти|открыть|отправить|передать|восстановить)\s+(портал|сигнал|передачу)/u, command: "запустить портал" },
  ];

  return patterns
    .map((item) => ({ ...item, index: command.search(item.pattern) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.command);
}

function protectKnownPhrases(command) {
  return command
    .replace(/сорок два/g, "сорок_два")
    .replace(/кристалл памяти/g, "кристалл_памяти")
    .replace(/архивный модуль/g, "архивный_модуль")
    .replace(/отчет о сбое/g, "отчет_о_сбое")
    .replace(/ключ карта/g, "ключ_карта");
}

function restoreKnownPhrases(command) {
  return command
    .replace(/сорок_два/g, "сорок два")
    .replace(/кристалл_памяти/g, "кристалл памяти")
    .replace(/архивный_модуль/g, "архивный модуль")
    .replace(/отчет_о_сбое/g, "отчет о сбое")
    .replace(/ключ_карта/g, "ключ карта");
}

function completeChainPart(part) {
  if (hasAny(part, words.take) || hasAny(part, words.use) || hasAny(part, words.open) || hasAny(part, words.go) || hasAny(part, words.listen) || hasAny(part, words.decrypt) || hasAny(part, words.tune) || hasAny(part, words.start) || hasAny(part, words.repair) || hasAny(part, words.sync) || hasAny(part, words.portal) || hasAny(part, words.evacuate) || hasAny(part, words.emergency) || hasAny(part, words.inspect)) return part;
  if (hasAny(part, ["пропуск", "карта", "бейдж", "ключ карта", "идентификатор"])) return `взять ${part}`;
  if (hasAny(part, ["модуль", "накопитель", "флешка", "носитель"])) return `взять ${part}`;
  if (hasAny(part, ["кристалл", "память"])) return `взять ${part}`;
  if (hasAny(part, ["запись", "диктофон", "аудио"])) return `прослушать ${part}`;
  if (hasAny(part, ["отчет"])) return `расшифровать ${part}`;
  if (hasAny(part, ["частота", "42", "сорок два", "герц"])) return `настроить ${part}`;
  if (hasAny(part, ["охлаждение", "контур", "перегрев"])) return `восстановить ${part}`;
  if (hasAny(part, ["антенна", "сигнал"])) return `синхронизировать ${part}`;
  return part;
}

function isDuplicateVoiceCommand(command) {
  const now = Date.now();
  if (state.lastCommandSignature === command && now - state.lastCommandAt < 1400) return true;
  state.lastCommandSignature = command;
  state.lastCommandAt = now;
  return false;
}

function finishWith(callback) {
  callback();
  finishTurn();
}

function handleCommand(command) {
  const handler = roomHandlers[state.room];
  if (handler && handler(command)) return true;
  if (hasAny(command, words.inspect)) return inspectCommand(command);
  if (handleNavigation(command)) return true;
  return false;
}

function wantsFinalLaunch(command) {
  return hasAny(command, [
    "портал",
    "консоль",
    "передать сигнал",
    "отправить сигнал",
    "отправь сигнал",
    "восстановить сигнал",
    "начать передачу",
    "дать сигнал",
    "запуск консоли",
    "запусти портал",
    "запустить портал",
  ]);
}

function handleNavigation(command) {
  if (state.room === "atrium" && !state.flags.archiveOpen && getTargetRoom(command) === "archive") {
    if (!hasItem(state, "пропуск")) {
      addLog("Считыватель молчит: рядом на панели лежит идентификатор оператора.", true, "warning");
      return true;
    }
    state.flags.archiveOpen = true;
    addLog("Пульт принял пропуск. Дверь архива открылась.", true, "success");
    return true;
  }

  if (!hasAny(command, words.go) && !hasAny(command, words.open)) return false;

  const target = getTargetRoom(command) || getImplicitNextRoom(command);
  if (!target) return false;

  if (target === state.room) {
    addLog("Вы уже здесь.");
    return true;
  }

  if (isFinaleRoom(state.room)) {
    addLog("Маршрут уже завершен. Для новой попытки нажмите кнопку «Начать заново».");
    return true;
  }

  const currentIndex = roomOrder.indexOf(state.room);
  const targetIndex = roomOrder.indexOf(target);

  if (targetIndex < currentIndex) {
    state.room = target;
    addLog(`Вы возвращаетесь: ${rooms[target].name}.`);
    return true;
  }

  if (target !== rooms[state.room].next) {
    addLog(`Маршрут к этой зоне сейчас не открыт. Следующее направление: ${rooms[rooms[state.room].next].name}.`);
    return true;
  }

  const missing = getMissingRequired(state.room);
  if (missing.length) {
    addLog(`Рано уходить. Осталось: ${missing.join("; ")}.`);
    return true;
  }

  if (state.room === "atrium") state.flags.archiveOpen = true;
  state.room = target;
  addLog(`Переход выполнен: ${rooms[target].name}.`, true, "success");
  return true;
}

function getTargetRoom(command) {
  if (hasAny(command, ["архив", "архива", "архивную", "к архиву", "архивный отсек"])) return "archive";
  if (hasAny(command, ["сервер", "серверную", "серверная", "к стойке", "машинный зал", "серверный зал"])) return "server";
  if (hasAny(command, ["генератор", "генераторную", "генераторная", "к питанию", "энергоблок", "энергоузел"])) return "generator";
  if (hasAny(command, ["лабораторию", "лаборатория", "в лабораторный", "к лифту", "лифт"])) return "lab";
  if (hasAny(command, ["обсерваторию", "обсерватория", "антенна", "купол", "наверх", "к консоли"])) return "observatory";
  if (hasAny(command, ["зал", "вход", "назад ко входу", "вестибюль", "атриум"])) return "atrium";
  return "";
}

function getImplicitNextRoom(command) {
  if (isFinaleRoom(state.room)) return "";
  if (!hasAny(command, ["дальше", "вперед", "продолжить", "следующая", "следующий", "проход", "дверь", "выйти", "иди дальше", "следуй дальше"])) return "";
  return rooms[state.room].next || "";
}

function inspectCommand(command) {
  const object = getObject(command);
  if (!object || ["комната", "комнату", "помещение", "место", "зал", "архив", "серверная", "генераторная", "лаборатория", "обсерватория"].includes(object)) {
    describeRoomObjects();
    return true;
  }

  const response = objectResponses[state.room]?.[object];
  if (response) {
    addLog(typeof response === "function" ? response() : response);
    return true;
  }

  addLog(`Заметного объекта «${object}» здесь нет.`);
  return true;
}

function getObject(command) {
  const objects = [
    "комнату",
    "помещение",
    "место",
    "проход",
    "стол",
    "пульт",
    "панель",
    "дверь",
    "пропуск",
    "диктофон",
    "запись",
    "модуль",
    "стойка",
    "сервер",
    "генератор",
    "турбина",
    "шкала",
    "терминал",
    "стабилизатор",
    "охлаждение",
    "кристалл",
    "антенна",
    "портал",
    "консоль",
    "комната",
    "зал",
    "архив",
    "серверная",
    "генераторная",
    "лаборатория",
    "обсерватория",
  ];
  return objects.find((object) => hasLoosePhrase(command, object)) || "";
}

function describeRoomObjects() {
  const lines = {
    atrium: "Вы видите пропуск, пульт доступа и дверь архива.",
    archive: "В архиве важны диктофон, архивный модуль и проход в серверную.",
    server: "Перед вами серверная стойка, слот модуля и панель восстановления отчета.",
    generator: "Здесь генератор, терминал пропуска и шкала частоты.",
    lab: "В лаборатории есть стабилизатор и панель охлаждения.",
    observatory: "В обсерватории находятся кристалл памяти, антенна и консоль портала.",
  };
  addLog(lines[state.room] || allRooms[state.room].story);
}

const objectResponses = {
  atrium: {
    стол: "В зале нет стола. Рабочие объекты здесь: пропуск, пульт и дверь.",
    пульт: () => (hasItem(state, "пропуск") ? "Пульт готов подтвердить доступ к архиву." : "Пульт подсвечивает пропуск рядом."),
    панель: () => (hasItem(state, "пропуск") ? "Панель ждет подтверждения доступа." : "На панели лежит пропуск."),
    дверь: () => (state.flags.archiveOpen ? "Дверь архива уже открыта." : "Дверь архива закрыта до подтверждения пропуска."),
    пропуск: () => (hasItem(state, "пропуск") ? "Пропуск уже у вас." : "Пропуск выглядит рабочим."),
  },
  archive: {
    стол: "На столе лежат диктофон и архивный модуль.",
    диктофон: () => (state.flags.recordHeard ? "Запись уже прослушана: частота 42 Гц." : "Диктофон содержит сообщение инженера."),
    запись: () => (state.flags.recordHeard ? "Вы уже знаете частоту генератора." : "Запись стоит прослушать."),
    модуль: () => (hasItem(state, "архивный модуль") ? "Архивный модуль уже в инвентаре." : "Модуль нужен для серверной."),
  },
  server: {
    стойка: () => (state.flags.moduleInserted ? "Модуль установлен в стойку." : "В стойке пустой слот под архивный модуль."),
    модуль: () => (state.flags.moduleInserted ? "Модуль работает в стойке." : "Модуль нужно вставить в стойку."),
    сервер: () => (state.flags.reportDecrypted ? "Отчет восстановлен." : "Сервер готов расшифровать отчет после подключения модуля."),
    стол: "В серверной нет стола. Здесь только стойки оборудования.",
  },
  generator: {
    генератор: () => (state.flags.generatorOnline ? "Генератор работает стабильно." : "Генератор отключен."),
    турбина: () => (state.flags.generatorOnline ? "Турбина вращается." : "Турбина неподвижна."),
    шкала: () => (state.flags.frequencySet ? "Шкала стоит на 42 Гц." : "Шкала частоты сбита."),
    терминал: () => (state.flags.passInserted ? "Терминал разблокирован." : "Терминал требует пропуск."),
  },
  lab: {
    стабилизатор: () => (hasItem(state, "стабилизатор") ? "Стабилизатор у вас." : "Стабилизатор нужен для штатного запуска портала."),
    охлаждение: () => (state.flags.coolantStable ? "Охлаждение стабильно." : "Охлаждение требует восстановления."),
    панель: () => (state.flags.coolantStable ? "Панель охлаждения в норме." : "Панель показывает перегрев."),
    стол: "На рабочей поверхности ничего полезного нет. Главный предмет — стабилизатор.",
  },
  observatory: {
    кристалл: () => (hasItem(state, "кристалл памяти") ? "Кристалл памяти у вас." : "Кристалл нужен для восстановления сигнала."),
    антенна: () => (state.flags.antennaSynced ? "Антенна синхронизирована." : "Антенна требует синхронизации."),
    консоль: "Консоль допускает три исхода: открыть портал, эвакуироваться или выполнить аварийный запуск.",
    портал: "Портал безопасен только после подготовки кристалла и антенны.",
  },
};

const roomPreviewHandlers = {
  atrium(command) {
    return (hasAny(command, ["пропуск", "карта", "бейдж", "удостоверение", "ключ"]) || hasAny(command, ["дверь", "архив", "проход", "доступ"]));
  },
  archive(command) {
    return hasAny(command, ["запись", "диктофон", "аудио", "модуль", "архив", "накопитель", "флешка", "носитель"]);
  },
  server(command) {
    return hasAny(command, ["модуль", "архив", "накопитель", "стойка", "отчет", "данные"]);
  },
  generator(command) {
    return hasAny(command, ["пропуск", "карта", "бейдж", "терминал", "частота", "42", "генератор", "питание", "энергия"]);
  },
  lab(command) {
    return hasAny(command, ["стабилизатор", "охлаждение", "контур", "перегрев", "температура"]);
  },
  observatory(command) {
    return hasAny(command, ["кристалл", "память", "антенна", "сигнал", "портал", "консоль", "эвакуация", "аварийный"]);
  },
};

const roomHandlers = {
  atrium(command) {
    if ((hasAny(command, words.take) || hasAny(command, ["нужен", "забираю", "пусть будет у меня"])) && hasAny(command, ["пропуск", "карта", "карту", "бейдж", "удостоверение", "ключ"])) {
      addItem("пропуск");
      addLog("Пропуск добавлен в инвентарь.", true, "success");
      return true;
    }

    if ((hasAny(command, words.use) || hasAny(command, words.open) || hasAny(command, words.go)) && hasAny(command, ["пропуск", "карта", "карточка", "бейдж", "дверь", "архив", "проход", "доступ", "пульт", "считыватель", "дальше", "вперед"])) {
      if (!hasItem(state, "пропуск")) {
        addLog("Считыватель молчит: рядом на панели лежит идентификатор оператора.", true, "warning");
        return true;
      }
      state.flags.archiveOpen = true;
      state.room = "archive";
      addLog("Пульт принял пропуск. Дверь архива открылась.", true, "success");
      return true;
    }

    return false;
  },
  archive(command) {
    if (hasAny(command, words.listen)) {
      state.flags.recordHeard = true;
      addLog("Запись инженера: «Генератор держит частоту 42 герца. Сбой начался с перегрева портала».");
      return true;
    }

    if ((hasAny(command, words.take) || hasAny(command, ["нужен", "забираю", "пусть будет у меня"])) && hasAny(command, ["модуль", "архив", "накопитель", "флешка", "носитель", "данные"])) {
      addItem("архивный модуль");
      addLog("Архивный модуль добавлен в инвентарь.", true, "success");
      return true;
    }

    return false;
  },
  server(command) {
    if ((hasAny(command, words.use) || hasAny(command, ["передать", "загрузить", "поставить"])) && hasAny(command, ["модуль", "архив", "накопитель", "флешка", "носитель", "данные"])) {
      if (!hasItem(state, "архивный модуль")) {
        addLog("У вас нет архивного модуля. Он остался в архиве.");
        return true;
      }
      state.flags.moduleInserted = true;
      addLog("Архивный модуль установлен в серверную стойку.", true, "success");
      return true;
    }

    if (hasAny(command, words.decrypt)) {
      if (!state.flags.moduleInserted) {
        addLog("Сначала вставьте архивный модуль в стойку.");
        return true;
      }
      state.flags.reportDecrypted = true;
      addItem("отчет о сбое");
      addLog("Отчет восстановлен: портал сорвался из-за перегрева и рассинхронизации антенны.", true, "success");
      return true;
    }

    return false;
  },
  generator(command) {
    if ((hasAny(command, words.use) || hasAny(command, ["разблокировать", "доступ", "показать"])) && hasAny(command, ["пропуск", "карта", "карту", "бейдж", "удостоверение", "ключ"])) {
      if (!hasItem(state, "пропуск")) {
        addLog("Пропуск не найден в инвентаре.");
        return true;
      }
      state.flags.passInserted = true;
      addLog("Терминал генератора разблокирован.", true, "success");
      return true;
    }

    if (hasAny(command, words.tune)) {
      if (!state.flags.recordHeard) {
        addLog("Вы еще не знаете нужную частоту. Ее подсказывает запись в архиве.");
        return true;
      }
      state.flags.frequencySet = true;
      addLog("Частота установлена на 42 Гц.", true, "success");
      return true;
    }

    if (hasAny(command, words.start) && hasAny(command, ["генератор", "турбина", "питание"])) {
      if (!state.flags.passInserted || !state.flags.frequencySet) {
        addLog("Генератор не готов: нужен пропуск и частота 42 Гц.");
        return true;
      }
      state.flags.generatorOnline = true;
      addLog("Генератор запущен. Лифт лаборатории получил питание.", true, "success");
      return true;
    }

    return false;
  },
  lab(command) {
    if ((hasAny(command, words.take) || hasAny(command, ["нужен", "забираю", "пусть будет у меня"])) && hasAny(command, ["стабилизатор", "стабильность"])) {
      addItem("стабилизатор");
      addLog("Стабилизатор добавлен в инвентарь.", true, "success");
      return true;
    }

    if (hasAny(command, words.repair)) {
      if (!state.flags.reportDecrypted) {
        addLog("Нужно знать причину аварии из отчета серверной.");
        return true;
      }
      state.flags.coolantStable = true;
      addLog("Контур охлаждения восстановлен.", true, "success");
      return true;
    }

    return false;
  },
  observatory(command) {
    if ((hasAny(command, words.take) || hasAny(command, ["нужен", "забираю", "пусть будет у меня"])) && hasAny(command, ["кристалл", "память", "накопитель"])) {
      addItem("кристалл памяти");
      addLog("Кристалл памяти добавлен в инвентарь.", true, "success");
      return true;
    }

    if (hasAny(command, words.sync)) {
      state.flags.antennaSynced = true;
      addLog("Антенна ЭХО синхронизирована.", true, "success");
      return true;
    }

    if (wantsFinalLaunch(command)) {
      const missing = getMissingRequired("observatory");
      if (missing.length) {
        addLog(`Портал еще не готов. Осталось: ${missing.join("; ")}. После подготовки консоль примет штатный запуск.`);
        return true;
      }
      finishGame("finaleGood");
      addLog("Портал открыт штатно. Сигнал ЭХО восстановлен.", true, "success");
      return true;
    }

    if (hasAny(command, words.start) || hasAny(command, words.open)) {
      addLog("Финальный запуск относится к порталу или передаче сигнала.");
      return true;
    }

    if (hasAny(command, words.evacuate)) {
      finishGame("finaleNeutral");
      addLog("Эвакуационный протокол запущен.");
      return true;
    }

    if (hasAny(command, words.emergency)) {
      finishGame("finaleBad");
      addLog("Аварийный запуск перегрузил антенну.");
      return true;
    }

    return false;
  },
};

function finishGame(room) {
  state.room = room;
  state.stats.ending = finales[room].ending;
  state.stats.finishedAt = Date.now();
}

function getMissingRequired(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return room.tasks.filter((task) => task.required && !task.done(state)).map((task) => task.missing || task.text.toLowerCase());
}

function isRoomComplete(roomId) {
  return getMissingRequired(roomId).length === 0;
}

function describeLocation() {
  addLog(`Вы находитесь: ${allRooms[state.room].name}. ${allRooms[state.room].story}`);
}

function describeRemaining() {
  if (isFinaleRoom(state.room)) {
    addLog(finales[state.room].reason);
    return;
  }
  const missing = getMissingRequired(state.room);
  if (missing.length) {
    addLog(`Осталось: ${missing.join("; ")}.`);
    return;
  }

  if (state.room === "observatory") {
    addLog("Все готово к финальному протоколу: портал, передача сигнала или эвакуация.");
    return;
  }

  addLog("В этой комнате все обязательные задачи выполнены.");
}

function describeNextStep() {
  if (isFinaleRoom(state.room)) {
    addLog("Квест завершен. Для новой попытки нажмите кнопку «Начать заново».");
    return;
  }

  const missing = getMissingRequired(state.room);
  if (missing.length) {
    addLog(`Пока рано идти дальше. Осталось: ${missing.join("; ")}.`);
    return;
  }

  const next = rooms[state.room].next;
  if (state.room === "observatory") {
    addLog("Вы у финального протокола. Доступны штатный запуск портала или эвакуация.");
    return;
  }

  addLog(next ? `Следующее направление: ${rooms[next].name}. ${rooms[state.room].nextText}` : "Вы у финального протокола.");
}

function describeInventory() {
  addLog(`Инвентарь: ${state.inventory.length ? state.inventory.join(", ") : "пусто"}.`, true, "info");
}

function repeatLastMessage() {
  addLog(state.lastSystemMessage || "Повторить пока нечего.", true, "info");
}

function describeHelp() {
  if (isFinaleRoom(state.room)) {
    addLog("Маршрут завершен. Доступны итоги и статистика. Новую попытку можно начать кнопкой «Начать заново».", true, "info");
    return;
  }
  const missing = getMissingRequired(state.room);
  if (missing.length) {
    addLog(getContextualNudge(""), true, "info");
    return;
  }
  addLog("Комната готова. Можно продолжить маршрут дальше по комплексу.", true, "info");
}

function getContextualNudge(command) {
  const repeated = (state.repeatedMistakes || 0) >= 1;
  const nudges = {
    atrium: hasItem(state, "пропуск")
      ? "Дверной считыватель ждет подтверждения доступа к архиву."
      : "Пульт коротко мигает рядом с забытым идентификатором оператора.",
    archive: state.flags.recordHeard
      ? "На столе остается архивный модуль — без него серверная не восстановит отчет."
      : "Диктофон на столе мигает старой записью инженера.",
    server: state.flags.moduleInserted
      ? "Панель восстановления готова собрать отчет о сбое."
      : "В серверной стойке пустой слот под архивный модуль.",
    generator: !state.flags.passInserted
      ? "Терминал генератора ждет пропуск оператора."
      : !state.flags.frequencySet
        ? "Шкала частоты сбита; в журнале инженера упоминалось точное значение."
        : "Генератор готов к запуску питания.",
    lab: hasItem(state, "стабилизатор")
      ? "Панель охлаждения все еще показывает перегрев контура."
      : "На рабочей поверхности закреплен портальный стабилизатор.",
    observatory: !hasItem(state, "кристалл памяти")
      ? "Консоль не видит кристалл памяти."
      : !state.flags.antennaSynced
        ? "Антенна еще не согласована с каналом ЭХО."
        : "Консоль готова к финальному протоколу.",
  };
  if (command && hasAny(command, words.go)) return "Маршрут понял, но проход пока требует завершить текущую зону.";
  return repeated ? nudges[state.room] || "Система не нашла подходящего действия в этой зоне." : "Система не поняла действие. Назовите действие и объект: осмотреть пульт, взять предмет, открыть проход.";
}

function isFinaleRoom(roomId) {
  return Boolean(finales[roomId]);
}

function addLog(message, speak = true, type = "info") {
  const currentEntry = state.log[0];
  const currentText = typeof currentEntry === "string" ? currentEntry : currentEntry?.text;
  if (currentText === message && type === "info") return;
  state.lastSystemMessage = message;
  state.log.unshift({ text: message, type });
  state.log = state.log.slice(0, 7);
  renderResponse();
  if (speak) speakText(message);
}

function speakText(text) {
  if (!state.sound || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = state.voice.rate;
  utterance.volume = state.voice.volume;
  const estimatedSpeechMs = Math.max(1400, Math.ceil((text.length * 70) / Math.max(state.voice.rate, 0.1)));
  ignoreSpeechUntil = Date.now() + estimatedSpeechMs + 500;
  const selectedVoice = getSelectedVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.onend = () => {
    ignoreSpeechUntil = Date.now() + 500;
  };
  utterance.onerror = utterance.onend;
  window.speechSynthesis.speak(utterance);
}

function getSelectedVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const saved = voices.find((voice) => voice.voiceURI === state.voice.voiceURI);
  if (saved) return saved;

  const russianVoices = voices.filter((voice) => /^ru/i.test(voice.lang));
  const preferred =
    russianVoices.find((voice) => /google|microsoft|natural|online/i.test(voice.name)) ||
    russianVoices.find((voice) => !/desktop/i.test(voice.name)) ||
    russianVoices[0] ||
    null;

  if (preferred) {
    state.voice.voiceURI = preferred.voiceURI;
    updateVoiceName(preferred);
  }

  return preferred;
}

function updateVoiceName(voice = getSelectedVoice()) {
  dom.voiceName.textContent = voice ? `Голос: ${voice.name}` : "Голос: системный";
}

function syncVoiceControls() {
  dom.voiceVolume.value = String(state.voice.volume);
  dom.voiceRate.value = String(state.voice.rate);
  dom.soundToggle.textContent = state.sound ? "Звук вкл" : "Звук выкл";
  dom.soundToggle.classList.toggle("is-muted", !state.sound);
  dom.soundToggle.setAttribute("aria-label", state.sound ? "Озвучивание включено" : "Озвучивание выключено");
  updateVoiceName();
}

function finishTurn() {
  render();
  saveGame();
}

function render() {
  const room = allRooms[state.room];
  dom.locationLabel.textContent = room.name;
  dom.sceneTitle.textContent = room.title;
  dom.sceneDescription.textContent = room.story;
  dom.roomPlan.innerHTML = renderPlan();
  renderMap();
  renderTasks();
  renderNavigation();
  renderInventory();
  renderDemo();
  renderResponse();
  renderResult();
}

function renderMap() {
  const currentIndex = getProgressIndex();
  dom.mapList.innerHTML = "";
  roomOrder.forEach((roomId, index) => {
    const li = document.createElement("li");
    li.className = "map-room";
    if (index === currentIndex) li.classList.add("is-current");
    if (index < currentIndex) li.classList.add("is-complete");
    if (index > currentIndex + 1) li.classList.add("is-locked");

    const title = document.createElement("strong");
    title.textContent = roomId === "finale" ? "Финал" : rooms[roomId].name;

    const status = document.createElement("span");
    if (index < currentIndex) status.textContent = "завершено";
    else if (index === currentIndex) status.textContent = "текущая зона";
    else if (index === currentIndex + 1) status.textContent = "следующая зона";
    else status.textContent = "закрыто";

    li.append(title, status);
    dom.mapList.append(li);
  });
}

function getProgressIndex() {
  if (isFinaleRoom(state.room)) return roomOrder.indexOf("finale");
  return roomOrder.indexOf(state.room);
}

function renderTasks() {
  dom.taskList.innerHTML = "";
  if (isFinaleRoom(state.room)) {
    const li = document.createElement("li");
    li.className = "task-item is-done";
    li.textContent = finales[state.room].reason;
    dom.taskList.append(li);
    dom.roomStatus.textContent = "маршрут завершен";
    dom.roomStatus.classList.add("is-complete");
    return;
  }

  const complete = isRoomComplete(state.room);
  dom.roomStatus.textContent = complete ? "комната готова" : "требуется действие";
  dom.roomStatus.classList.toggle("is-complete", complete);

  rooms[state.room].tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    li.classList.toggle("is-done", task.done(state));
    li.textContent = task.text;
    dom.taskList.append(li);
  });
}

function renderNavigation() {
  if (isFinaleRoom(state.room)) {
    dom.nextStep.textContent = "Квест завершен. Можно запросить статистику или нажать кнопку «Начать заново».";
    return;
  }
  const missing = getMissingRequired(state.room);
  dom.nextStep.textContent = missing.length
    ? `Переход вперед заблокирован: ${missing.join("; ")}.`
    : rooms[state.room].nextText;
}

function renderInventory() {
  dom.inventoryList.innerHTML = "";
  const items = state.inventory.length ? state.inventory : ["пусто"];
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.classList.toggle("is-empty", item === "пусто");
    dom.inventoryList.append(li);
  });
}

function setDemoMode(enabled, silent = false) {
  state.demoMode = enabled;
  saveGame();
  renderDemo();
  if (!silent) addLog(state.demoMode ? "Скрытый режим защиты включен." : "Скрытый режим защиты выключен.", false);
}

function toggleDemoMode() {
  setDemoMode(!state.demoMode);
}

function renderDemo() {
  dom.demoPanel.hidden = !state.demoMode;
  dom.textCommandForm.hidden = !state.demoMode;
  dom.demoCommandList.innerHTML = "";

  const list = isFinaleRoom(state.room) ? finales[state.room].demo : rooms[state.room].demo;
  list.forEach((command) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-command";
    button.textContent = command;
    button.addEventListener("click", () => runCommand(command, "demo"));
    dom.demoCommandList.append(button);
  });
}

function renderResponse() {
  if (!dom.currentResponse) return;
  const entry = state.log[0];
  const item = typeof entry === "string" ? { text: entry, type: "info" } : entry;
  dom.currentResponse.textContent = item?.text || state.lastSystemMessage || "Система ожидает команду.";
  dom.currentResponse.parentElement.classList.toggle("is-success", item?.type === "success");
  dom.currentResponse.parentElement.classList.toggle("is-warning", item?.type === "warning");
}

function renderResult() {
  const final = finales[state.room];
  dom.resultPanel.hidden = !final;
  if (!final) return;

  dom.resultTitle.textContent = final.title;
  dom.resultReason.textContent = final.reason;
  const rows = [
    ["Финал", state.stats.ending || "не выбран"],
    ["Время", formatDuration(getElapsedMs())],
    ["Команды", state.stats.commands],
    ["Ошибки", state.stats.mistakes],
    ["Голосом", state.stats.voiceCommands],
  ];

  dom.statsList.innerHTML = "";
  rows.forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    wrapper.append(dt, dd);
    dom.statsList.append(wrapper);
  });
}

function renderPlan() {
  const status = (done) => (done ? "готово" : "ожидает");
  const fill = (done) => (done ? "#dfe8df" : "#ffffff");
  const stroke = (done) => (done ? "#586f5d" : "#aeb1a9");
  const label = (x, y, text) => `<text x="${x}" y="${y}" fill="#20211f" font-size="18" font-weight="700" text-anchor="middle">${text}</text>`;
  const sub = (x, y, text) => `<text x="${x}" y="${y}" fill="#656963" font-size="13" text-anchor="middle">${text}</text>`;
  const node = (x, y, w, h, title, done) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill(done)}" stroke="${stroke(done)}" stroke-width="2" />
    ${label(x + w / 2, y + h / 2 - 4, title)}
    ${sub(x + w / 2, y + h / 2 + 20, status(done))}
  `;

  const plans = {
    atrium: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M120 80 H780 V420 H120Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(180, 160, 190, 110, "пропуск", hasItem(state, "пропуск"))}
        ${node(380, 160, 160, 110, "пульт", state.flags.archiveOpen)}
        ${node(570, 135, 160, 160, "дверь", state.flags.archiveOpen)}
        ${label(450, 465, "Входной зал")}
      </svg>`,
    archive: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M90 80 H810 V420 H90Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(170, 150, 180, 110, "диктофон", state.flags.recordHeard)}
        ${node(380, 150, 190, 110, "модуль", hasItem(state, "архивный модуль"))}
        ${node(620, 150, 130, 110, "выход", isRoomComplete("archive"))}
        ${label(450, 465, "Архив")}
      </svg>`,
    server: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M110 70 H790 V430 H110Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(180, 135, 200, 120, "слот модуля", state.flags.moduleInserted)}
        ${node(430, 135, 200, 120, "отчет", state.flags.reportDecrypted)}
        ${label(450, 465, "Серверная")}
      </svg>`,
    generator: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M110 70 H790 V430 H110Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(160, 135, 170, 110, "терминал", state.flags.passInserted)}
        ${node(365, 135, 170, 110, "42 Гц", state.flags.frequencySet)}
        ${node(570, 135, 170, 110, "генератор", state.flags.generatorOnline)}
        ${label(450, 465, "Генераторная")}
      </svg>`,
    lab: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M110 70 H790 V430 H110Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(225, 145, 190, 120, "стабилизатор", hasItem(state, "стабилизатор"))}
        ${node(485, 145, 190, 120, "охлаждение", state.flags.coolantStable)}
        ${label(450, 465, "Лаборатория")}
      </svg>`,
    observatory: `
      <svg viewBox="0 0 900 500">
        <rect width="900" height="500" fill="#f4f4f1" />
        <path d="M110 70 H790 V430 H110Z" fill="#efefec" stroke="#aeb1a9" stroke-width="3" />
        ${node(150, 135, 170, 110, "кристалл", hasItem(state, "кристалл памяти"))}
        ${node(365, 135, 170, 110, "антенна", state.flags.antennaSynced)}
        ${node(580, 135, 170, 110, "консоль", isRoomComplete("observatory"))}
        ${label(450, 465, "Обсерватория")}
      </svg>`,
    finaleGood: finalePlan("Сигнал восстановлен"),
    finaleNeutral: finalePlan("Эвакуация"),
    finaleBad: finalePlan("Сбой протокола"),
  };

  return plans[state.room] || finalePlan("Комплекс ЭХО");
}

function finalePlan(text) {
  return `
    <svg viewBox="0 0 900 500">
      <rect width="900" height="500" fill="#f4f4f1" />
      <path d="M160 110 H740 V390 H160Z" fill="#efefec" stroke="#586f5d" stroke-width="3" />
      <text x="450" y="235" fill="#20211f" font-size="34" font-weight="700" text-anchor="middle">${text}</text>
      <text x="450" y="275" fill="#656963" font-size="18" text-anchor="middle">маршрут завершен</text>
    </svg>`;
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage is optional.
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!allRooms[parsed.room]) return;
    state = {
      ...createInitialState(),
      ...parsed,
      demoMode: false,
      flags: { ...initialFlags, ...(parsed.flags || {}) },
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      log: normalizeSavedLog(parsed.log),
      lastSystemMessage: parsed.lastSystemMessage || getFirstSavedLogText(parsed.log),
      repeatedMistakes: parsed.repeatedMistakes || 0,
      lastCommandSignature: "",
      lastCommandAt: 0,
      stats: { ...createInitialState().stats, ...(parsed.stats || {}) },
      voice: { ...createInitialState().voice, ...(parsed.voice || {}) },
    };
  } catch {
    state = createInitialState();
  }
}

function normalizeSavedLog(log) {
  if (!Array.isArray(log) || !log.length) return [{ text: "Сохранение загружено.", type: "info" }];
  return log
    .map((entry) => (typeof entry === "string" ? { text: entry, type: "info" } : { text: entry.text || "", type: entry.type || "info" }))
    .filter((entry) => entry.text)
    .slice(0, 7);
}

function getFirstSavedLogText(log) {
  return normalizeSavedLog(log)[0]?.text || "Сохранение загружено.";
}

function resetGame() {
  const keepDemoMode = state.demoMode;
  const keepSound = state.sound;
  const keepVoice = { ...state.voice };
  state = createInitialState();
  state.demoMode = keepDemoMode;
  state.sound = keepSound;
  state.voice = keepVoice;
  dom.lastCommand.textContent = "Распознано: пока нет";
  saveGame();
  render();
  speakText("Новая игра началась.");
}

function getElapsedMs() {
  return (state.stats.finishedAt || Date.now()) - state.stats.startedAt;
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function getStatsText() {
  return `Итоги: ${state.stats.commands} команд, ${state.stats.mistakes} ошибок, время ${formatDuration(getElapsedMs())}.`;
}

dom.micButton.addEventListener("click", () => {
  if (!recognition) return;
  if (voiceSessionActive || isListening) {
    stopRecognitionSession();
    return;
  }
  voiceSessionActive = true;
  startRecognitionSession();
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey && event.shiftKey && (key === "d" || key === "в")) {
    event.preventDefault();
    toggleDemoMode();
  }
});

dom.soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  dom.soundToggle.classList.toggle("is-muted", !state.sound);
  dom.soundToggle.textContent = state.sound ? "Звук вкл" : "Звук выкл";
  dom.soundToggle.setAttribute("aria-label", state.sound ? "Озвучивание включено" : "Озвучивание выключено");
  if (!state.sound && "speechSynthesis" in window) window.speechSynthesis.cancel();
  saveGame();
});

dom.voiceVolume.addEventListener("input", () => {
  state.voice.volume = Number(dom.voiceVolume.value);
  saveGame();
});

dom.voiceRate.addEventListener("input", () => {
  state.voice.rate = Number(dom.voiceRate.value);
  saveGame();
});

dom.whereButton.addEventListener("click", () => runCommand("где я", "demo"));
dom.remainingButton.addEventListener("click", () => runCommand("что осталось", "demo"));
dom.nextButton.addEventListener("click", () => runCommand("куда идти", "demo"));
dom.resetButton.addEventListener("click", resetGame);
dom.textCommandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = dom.textCommand.value.trim();
  if (!command) return;
  dom.textCommand.value = "";
  runCommand(command, "demo");
});

window.__questRun = runCommand;
window.__questDemo = toggleDemoMode;

function applyUrlOptions() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo") || params.has("defense") || params.has("test")) {
    setDemoMode(true, true);
  }
}

setupSpeechRecognition();
loadGame();
applyUrlOptions();
syncVoiceControls();
if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", syncVoiceControls);
}
render();
