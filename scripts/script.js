import { small_library_yushi } from "./dialoguage_libraries/small.js";
import { small_library_yushi_st2 } from "./dialoguage_libraries/small_st2.js";
import { big_library_yushi } from "./dialoguage_libraries/big.js";
import { medium_library_yushi } from "./dialoguage_libraries/medium.js";
import { medium_library_yushi_st2 } from "./dialoguage_libraries/medium_st2.js";
import { mainDictionary } from "./wordgame.js";

/* =====================
   RESPONSES
===================== */
const responses = [
    ...big_library_yushi,
    ...medium_library_yushi,
    ...medium_library_yushi_st2,
    ...small_library_yushi,
    ...small_library_yushi_st2
];

/* =====================
   DOM
===================== */
const textinput = document.querySelector("#chat-girl-input");
const mytext = document.querySelector(".your-text");
const yushitext = document.querySelector(".yushi-text");
const sendBtn = document.querySelector("#chat-girl-conf");
const avatarEl = document.querySelector("#chat-girl-avatar");

/* =====================
   AVATARS
===================== */
const AVATARS = {
    sad: "./avatars/sad.png",
    normal: "./avatars/normal.png",
    happy: "./avatars/happy.png",
    love: "./avatars/love.png",
    waiting: "./avatars/waiting.png"
};

/* =====================
   STATE
===================== */
let userName = localStorage.getItem("username") || "друже";
let lastBotAnswer = "";
let lastUserText = "";
let repeatCounter = 0;
let lastMessageTime = 0;

let typing = false;
let waitingTimer = null;
let moodTimer = null;

/* =====================
   INDEX FOR FAST SEARCH
===================== */
let responseIndex = null;

function buildResponseIndex() {
    responseIndex = new Map();
    responses.forEach((item, index) => {
        if (!item.triggers || !Array.isArray(item.triggers)) return;
        item.triggers.forEach(trigger => {
            if (!trigger || typeof trigger !== 'string') return;
            const key = normalizeText(trigger);
            if (key) {
                if (!responseIndex.has(key)) {
                    responseIndex.set(key, []);
                }
                responseIndex.get(key).push(index);
            }
        });
    });
}

// Initialize index
buildResponseIndex();

/* =====================
   LOVE
===================== */
function getLove() {
    const love = Number(localStorage.getItem("love")|| 40);
    return isNaN(love) ? 50 : Math.max(0, Math.min(100, love));
}

function setLove(val) {
    val = Math.max(0, Math.min(100, val));
    localStorage.setItem("love", val);
    updateAvatarByLove();
}

/* =====================
   AVATAR LOGIC
===================== */
function updateAvatarByLove() {
    const love = getLove();
    let newAvatar = AVATARS.normal;
    
    if (love <= 20) newAvatar = AVATARS.sad;
    else if (love <= 50) newAvatar = AVATARS.normal;
    else if (love <= 80) newAvatar = AVATARS.happy;
    else newAvatar = AVATARS.love;
    
    const img = new Image();
    img.onload = () => {
        avatarEl.src = newAvatar;
    };
    img.onerror = () => {
        console.warn(`Failed to load avatar: ${newAvatar}`);
        avatarEl.src = AVATARS.normal;
    };
    img.src = newAvatar;
}

function triggerSadAvatar(timeout = 10000) {
    clearTimeout(moodTimer);
    avatarEl.src = AVATARS.sad;

    moodTimer = setTimeout(() => {
        updateAvatarByLove();
    }, timeout);
}

/* =====================
   WAITING MODE
===================== */
function startWaitingTimer() {
    clearTimeout(waitingTimer);
    waitingTimer = setTimeout(() => {
        avatarEl.src = AVATARS.waiting;
        typeText(yushitext, "Ти ще є, ми нікуди не пішли.. 🥺");
    }, 30000);
}

/* =====================
   TYPING EFFECT
===================== */
function typeText(el, text, speed = 25) {
    if (typing) return;
    typing = true;
    el.textContent = "";
    let i = 0;

    const timer = setInterval(() => {
        if (i < text.length) {
            el.textContent += text[i];
            i++;
        } else {
            clearInterval(timer);
            typing = false;
        }
    }, speed);
}

/* =====================
   WORD GAME
===================== */
let wordGameHistory = [];
let booword = false;
let lastWord = "";

function restoreGame() {
    lastWord = "";
    booword = false;
    wordGameHistory = [];
}

function generateBotWord(lastLetter) {
    const availableWords = mainDictionary && Array.isArray(mainDictionary)
        ? mainDictionary.filter(w => 
            typeof w === 'string' &&
            w.length >= 2 &&
            w.length <= 15 &&
            w[0] === lastLetter &&
            w[0] !== "ь" &&
            w[0] !== "'"
        )
        : ["кіт", "тато", "омар", "рак", "корова", "авто", "орел", "лист", "стіл", "луна"];
    
    if (!availableWords.length) {
        const fallbackWords = mainDictionary && Array.isArray(mainDictionary)
            ? mainDictionary.filter(w => 
                typeof w === 'string' &&
                w.length >= 2 &&
                w[0] !== "ь" &&
                w[0] !== "'"
            )
            : ["кіт", "тато", "омар", "рак"];
        
        return fallbackWords.length > 0 
            ? fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
            : "слово";
    }
    
    return availableWords[Math.floor(Math.random() * availableWords.length)];
}

function wordGameLogic(userWord) {
    userWord = normalizeText(userWord);
    
    if (userWord.length < 2) {
        return "Слово закоротке 🤔";
    }
    
    if (userWord[0] === "ь" || userWord[0] === "'") {
        return "Слова не можуть починатися на Ь або апостроф ❌";
    }
    
    if (wordGameHistory.includes(userWord)) {
        return "Це слово вже було! Спробуй інше 🔄";
    }
    
    wordGameHistory.push(userWord);
    
    if (wordGameHistory.length > 50) {
        wordGameHistory = wordGameHistory.slice(-50);
    }
    
    if (!lastWord) {
        lastWord = userWord;
        const botWord = generateBotWord(lastWord.at(-1));
        if (!botWord) {
            return "Я не знаю слів на цю літеру... Почни знову!";
        }
        lastWord = botWord;
        wordGameHistory.push(botWord);
        return `Моє слово: ${botWord.toUpperCase()}. Тобі на ${botWord.at(-1).toUpperCase()}`;
    }
    
    if (userWord[0] !== lastWord.at(-1)) {
        return `Треба на "${lastWord.at(-1).toUpperCase()}" ❌`;
    }
    
    const botWord = generateBotWord(userWord.at(-1));
    if (!botWord) {
        return "Я не знаю слів на цю літеру... Перемага твоя! 🏆";
    }
    
    lastWord = botWord;
    wordGameHistory.push(botWord);
    
    return `Моє слово: ${botWord.toUpperCase()}. Тобі на ${botWord.at(-1).toUpperCase()}`;
}

/* =====================
   TEXT HELPERS
===================== */
function normalizeText(text, preservePunctuation = false) {
    if (typeof text !== 'string') return '';
    
    let result = text.toLowerCase();
    result = result.replace(/ё/g, "е");
    
    if (!preservePunctuation) {
        result = result.replace(/[^\p{L}\p{N}\s]/gu, "");
    }
    
    result = result.replace(/\s+/g, " ").trim();
    
    return result;
}

function random(arr) {
    if (!Array.isArray(arr) || !arr.length) return "";
    
    const filtered = arr.filter(a => a !== lastBotAnswer);
    const pool = filtered.length ? filtered : arr;
    const res = pool[Math.floor(Math.random() * pool.length)];
    lastBotAnswer = res;
    return res;
}

/* =====================
   HELPER: чи текст містить букви/цифри
===================== */
function hasTextContent(str) {
    return /[\p{L}\p{N}]/u.test(str);
}

/* =====================
   HELPER: чи текст лише смайли
===================== */
function isOnlyEmojis(text) {
    if (typeof text !== 'string') return false;
    const withoutEmojis = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, "");
    return withoutEmojis.length === 0 && text.trim().length > 0;
}

/* =====================
   LOVE KEYWORDS
===================== */
const LOVE_KEYWORDS = {
    positive: {
        words: [
            "люблю", "кохаю", "подобаєшся", "мила", "гарна", "красива", 
            "розумна", "крута", "класна", "чудова", "прекрасна", "ідеальна",
            "найкраща", "улюблена", "серденько", "зайчик", "сонечко", "кохання",
            "радість", "щастя", "обійми", "цілую", "чмок", "милуся", "кохана",
            "коханий", "милий", "любий", "серце", "любов", "обожнюю",
            "обіймаю", "ціную", "поважаю", "подяка", "дякую", "спасибі",
            "вибач", "пробач", "пробачення", "соромно", "ніжно", "тепло",
            "затишно", "безпечно", "комфортно", "надія", "віра", "довіра",
            "відвертість", "чесність", "відданість", "відповідальність",
            "турбота", "підтримка", "розуміння", "співчуття", "емпатія",
            "близькість", "інтимність", "ніжність", "ласка", "теплота",
            "захист", "опора", "притулок", "тиша", "спокій", "гармонія",
            "єдність", "злагода", "взаємоповага", "взаєморозуміння",
            "спільність", "партнерство", "дружба", "товаришування",
            "розваги", "сміх", "веселощі", "ентузіазм", "натхнення",
            "мотивація", "підбадьорення", "заохочення", "комплімент",
            "похвала", "визнання", "повага", "шанування", "обожнювання",
            "гарнюня", "красунця", "милашка", "розумашка", "розумничка",
            "зайченя", "кошеня", "рибонька", "пташенька", "зіронька",
            "сонце", "місяць", "зоренька", "іскринка", "полум'я", "вогонь",
            "тепло", "світло", "промінь", "сяйво", "блиск", "світіння",
            "радісний", "щасливий", "задоволений", "вдоволений", "щастя",
            "радість", "веселоща", "коханочка", "милашка", "серденько",
            "лапочка", "солоденька", "маленька", "крихітка", "малеча",
            "дитинка", "квіточка", "ягідка", "медовая", "цукерочка",
            "тортик", "пірамідка", "зірка", "місячик", "соняшник",
            "ромашка", "троянда", "лілія", "фіалка", "орхідея",
            "квітка", "бутон", "пелюстка", "аромат", "запах", "ніжність",
            "м'якість", "шовковистість", "оксамит", "шовк", "атлас",
            "оксамит", "м'якенька", "пухнаста", "пухнастий", "м'якунька"
        ],
        points: 1
    },
    veryPositive: {
        phrases: [
            "я тебе кохаю по справжньому", "я кохаю тебе", "ти моє все",
            "ти моє життя", "ти моє щастя", "без тебе не можу", "сумую без тебе",
            "скучаю за тобою", "мені без тебе погано", "ти мені потрібна",
            "ти мені потрібний", "ти моя мрія", "ти моя доля", 
            "ти моє призначення", "ти моя істина", "ти моя правда",
            "ти моя чесність", "ти моя відвертість", "ти моя довіра",
            "ти моя вірність", "ти моя відданість", "ти моя відповідальність",
            "ти моя турбота", "ти моя підтримка", "ти моє розуміння",
            "ти моє співчуття", "ти моя емпатія", "ти моя близькість",
            "ти моя інтімність", "ти моя ніжність", "ти моя ласка",
            "ти моя теплота", "ти мій захист", "ти моя опора",
            "ти мій притулок", "ти моя тиша", "ти мій спокій",
            "ти моя гармонія", "ти моя єдність", "ти моя злагода",
            "ти моя взаємоповага", "ти моє взаєморозуміння",
            "ти моя спільність", "ти моє партнерство", "ти моя дружба",
            "ти моє товаришування", "ти мої розваги", "ти мій сміх",
            "ти мої веселощі", "ти моя радість", "ти мій ентузіазм",
            "ти моє натхнення", "ти моя мотивація", "ти моє підбадьорення",
            "ти моє заохочення", "ти мій комплімент", "ти моя похвала",
            "ти моє визнання", "ти моя повага", "ти моє шанування",
            "ти моє обожнювання", "я не уявляю життя без тебе",
            "ти найкраще що сталося в моєму житті", "ти моя удача",
            "ти моє везіння", "ти моя фортуна", "ти моє щастя",
            "ти моя радість", "ти моє задоволення", "ти моє блаженство",
            "ти моя екстаз", "ти моя ейфорія", "ти моє захоплення",
            "ти моя пристрасть", "ти моє бажання", "ти моя мрія",
            "ти моя фантазія", "ти моя уява", "ти моє натхнення",
            "ти моя муза", "ти моя втіха", "ти моя розрада",
            "ти моє заспокоєння", "ти моя рівновага", "ти моя стабільність",
            "ти моя надія", "ти моя віра", "ти моя любов",
            "ти моє кохання", "ти моя прив'язаність", "ти моя симпатія",
            "ти моя антипатія", "ти моя ненависть", "ти моя злість",
            "ти моя образа", "ти моя ревнощі", "ти моя заздрість",
            "ти моя гордість", "ти моя скромність", "ти моя впевненість",
            "ти моя сміливість", "ти моя хоробрість", "ти моя мужність",
            "ти моя сила", "ти моя слабкість", "ти моя вразливість",
            "ти моя чутливість", "ти моя емоційність", "ти моя раціональність",
            "ти моя логіка", "ти моя інтуїція", "ти моя мудрість",
            "ти моя досвідченість", "ти моя недосвідченість", "ти моя наївність",
            "ти моя простота", "ти моя складність", "ти моя загадковість",
            "ти моя таємничість", "ти моя привабливість", "ти моя принадність",
            "ти моя спокуса", "ти моя вабильність", "ти моя магнетичність"
        ],
        points: 2
    },
    negative: {
        words: [
            "ненавиджу", "бля", "блять", "хуй", "хуя", "пизд", "пздц", "єб", "їб",
            "сука", "гандон", "мудак", "урод", "дурак", "ідіот", "дебіл", 
            "тупий", "дурний", "нікчема", "недоумок", "кретин", "ідіотка", 
            "дура", "дебілка", "тупа", "дурна", "нікчемна", "кретинка", 
            "уродка", "страшна", "потворна", "огидна", "огидний", "гидко",
            "відчай", "розпач", "безнадія", "відчаю", "відчай", "відчаї",
            "відчайдушний", "відчайдушна", "відчайдушне", "відчайдушні",
            "відчайдушним", "відчайдушними", "відчайдушного", "відчайдушної",
            "відчайдушному", "відчайдушній", "відчайдушних", "відчайдушнім",
            "відчайдушним", "відчайдушними", "відчайдушному", "відчайдушній",
            "відчайдушних", "відчайдушнім", "відчайдушним", "відчайдушними",
            "відчайдушному", "відчайдушній", "відчайдушних", "відчайдушнім"
        ],
        points: -2
    },
    veryNegative: {
        phrases: [
            "відвали від мене", "заткнись нарешті", "ти мені набридла",
            "ти мене дратуєш", "ти мене бісиш", "пішов ти", "іди нахуй",
            "іди в сраку", "заткни пащу", "заткни пельку", "заткни дзюбу",
            "заткни рило", "заткни морду", "заткни пику", "заткни гавку",
            "ти нікчемна", "ти бездарна", "ти ні на що не здатна",
            "ти мені не потрібна", "ти зайва в моєму житті",
            "якби ти зникла, мені було б краще", "ти робиш мене нещасним",
            "ти джерело моїх проблем", "через тебе у мене все погано",
            "ти руйнуєш моє життя", "ти моє прокляття", "ти моя кара",
            "ти моє покарання", "ти моя мука", "ти моя тортура",
            "ти моє страждання", "ти моя боль", "ти моя скорбота",
            "ти моя печаль", "ти моя туга", "ти моя журба",
            "ти моя меланхолія", "ти моя депресія", "ти моя апатія",
            "ти моя астенія", "ти моя втома", "ти моє виснаження",
            "ти моя слабкість", "ти моя хвороба", "ти моя інфекція",
            "ти моя зараз", "ти моя чума", "ти моя холера",
            "ти моя тиф", "ти моя дизентерія", "ти моя малярія",
            "ти моя туберкульоза", "ти моя пневмонія", "ти моя астма",
            "ти моя алергія", "ти моя непереносимість", "ти моя відмова",
            "ти моя неприйняття", "ти моя відторгнення", "ти моє відчуження",
            "ти моя ізоляція", "ти моя самотність", "ти моя покинутість",
            "ти моя знедоленість", "ти моя безпорадність", "ти моя безсилість",
            "ти моя немічність", "ти моя немочність", "ти моя неспроможність",
            "ти моя нездатність", "ти моя безталанність", "ти моя бездарність",
            "ти моя нікчемність", "ти моя марність", "ти моя пустотливість"
        ],
        points: -3
    }
};

/* =====================
   LOVE CALCULATION
===================== */
function calculateLovePoints(text) {
    if (!text || typeof text !== 'string') return 0;
    
    const lowerText = normalizeText(text);
    let points = 0;
    
    for (const word of LOVE_KEYWORDS.positive.words) {
        if (lowerText.includes(word)) {
            points += LOVE_KEYWORDS.positive.points;
        }
    }
    
    for (const phrase of LOVE_KEYWORDS.veryPositive.phrases) {
        if (lowerText.includes(phrase)) {
            points += LOVE_KEYWORDS.veryPositive.points;
            break;
        }
    }
    
    for (const word of LOVE_KEYWORDS.negative.words) {
        if (lowerText.includes(word)) {
            points += LOVE_KEYWORDS.negative.points;
        }
    }
    
    for (const phrase of LOVE_KEYWORDS.veryNegative.phrases) {
        if (lowerText.includes(phrase)) {
            points += LOVE_KEYWORDS.veryNegative.points;
            break;
        }
    }
    
    const happyEmojiCount = (text.match(/[😘😊🥰😍🤗💖💕💗💓💞💘💝💟❤️🧡💛💚💙💜🤎🖤🤍💯✨🌟⭐🌠🎇🎆🌈☀️🌤️⛅🌥️🌦️🌧️⛈️🌩️🌨️☃️⛄❄️🌪️🌀💐🌸💮🏵️🌹🥀🌺🌻🌼🌷]/gu) || []).length;
    const sadEmojiCount = (text.match(/[😔😞😢😭🥺😩😫😖😣😕🙁☹️😟😤😠😡🤬💔🖤💢😶🌧️⛈️🌩️🌨️☃️⛄❄️🌪️🌀💐🥀]/gu) || []).length;
    
    points += Math.min(3, happyEmojiCount * 0.5);
    points -= Math.min(3, sadEmojiCount * 0.5);
    
    return Math.max(-5, Math.min(5, points));
}

function updateLoveBasedOnMessage(text) {
    const points = calculateLovePoints(text);
    if (points === 0) return;
    
    let love = getLove();
    love += points;
    
    love = Math.max(0, Math.min(100, love));
    setLove(love);
    
    if (points >= 3) {
        typeText(yushitext, "Твої слова такі теплі... вони розтоплюють моє серце 🫠", 30);
    } else if (points <= -3) {
        triggerSadAvatar(8000);
        typeText(yushitext, "Це боляче... навіть для віртуального серця 💔", 30);
    }
    
    localStorage.setItem('last_love_change', points);
    localStorage.setItem('last_love_update', Date.now());
}

function getLoveStatus() {
    const love = getLove();
    
    if (love <= 10) return {
        level: "very_low",
        emoji: "💔",
        description: "Дуже низький рівень прив'язаності",
        mood: "сумна"
    };
    else if (love <= 30) return {
        level: "low",
        emoji: "😔",
        description: "Низький рівень прив'язаності",
        mood: "засмучена"
    };
    else if (love <= 50) return {
        level: "neutral",
        emoji: "😐",
        description: "Нейтральні стосунки",
        mood: "нейтральна"
    };
    else if (love <= 80) return {
        level: "good",
        emoji: "😊",
        description: "Гарні стосунки",
        mood: "щаслива"
    };
    else if (love <= 90) return {
        level: "high",
        emoji: "🥰",
        description: "Високий рівень прив'язаності",
        mood: "дуже щаслива"
    };
    else return {
        level: "very_high",
        emoji: "😍",
        description: "Дуже високий рівень прив'язаності",
        mood: "закохана"
    };
}

function handleLoveCommands(text) {
    const lower = normalizeText(text);
    
    if (lower.includes("скільки любові") || lower.includes("рівень любові") || lower.includes("любов рівень")) {
        const love = getLove();
        const status = getLoveStatus();
        return `Рівень нашої прив'язаності: ${love}/100 ${status.emoji}
${status.description}
Я почуваюся ${status.mood} з тобою 💖`;
    }
    
    return null;
}

/* =====================
   BAD WORDS
===================== */
const BAD_WORDS = [
    "бля", "бляд", "хуй", "хуя", "пизд", "пздц", "єб", "їб",
    "нахуй", "сука", "сучка", "гандон",
    "тупа", "ідіотка", "дура", "дебілка", "відвали", "заткнись"
];
function containsBadWords(text) {
    const normalized = normalizeText(text);
    return BAD_WORDS.some(word => normalized.includes(word));
}
/*=============
===========
ST 2
===========
=============*/
/* =====================
   MATCH PHRASES
===================== */
function matchResponses(text, originalText) {
    if (!text || typeof text !== 'string') return null;
    
    // Handle emojis - exact match
    if (isOnlyEmojis(originalText)) {
        const emojiText = originalText.trim();
        for (const item of responses) {
            if (!item.triggers || !Array.isArray(item.triggers)) continue;
            
            for (const trigger of item.triggers) {
                if (trigger === emojiText) {
                    // Check if there's follow_up from previous interaction
                    const hasFollowUp = item.follow_up && item.follow_up.triggers && item.follow_up.answers;
                    if (hasFollowUp) {
                        // Store context for follow-up
                        sessionStorage.setItem('last_follow_up', JSON.stringify({
                            triggers: item.follow_up.triggers,
                            answers: item.follow_up.answers
                        }));
                    }
                    return random(item.answers);
                }
            }
        }
        return null;
    }
    
    const input = normalizeText(text);
    const words = input.split(' ');
    
    // Check follow-up first
    const lastFollowUp = sessionStorage.getItem('last_follow_up');
    if (lastFollowUp) {
        try {
            const followUpData = JSON.parse(lastFollowUp);
            for (const trigger of followUpData.triggers) {
                if (input.includes(normalizeText(trigger))) {
                    // Clear follow-up after match
                    sessionStorage.removeItem('last_follow_up');
                    return random(followUpData.answers);
                }
            }
        } catch (e) {
            sessionStorage.removeItem('last_follow_up');
        }
    }
    
    // Search in index for exact word matches
    let bestMatch = null;
    let bestWeight = 0;
    let bestItem = null;
    
    for (const word of words) {
        if (word.length < 2) continue;
        
        const matches = responseIndex.get(word);
        if (matches) {
            matches.forEach(index => {
                const item = responses[index];
                // Check if any trigger fully matches
                for (const trigger of item.triggers) {
                    const t = normalizeText(trigger);
                    if (t && input.includes(t)) {
                        const weight = t.length * 2; // Full phrase match gets double weight
                        if (weight > bestWeight) {
                            bestWeight = weight;
                            bestMatch = trigger;
                            bestItem = item;
                        }
                    }
                }
            });
        }
    }
    
    // If no full phrase match found, search for partial matches
    if (!bestItem) {
        for (const item of responses) {
            if (!item.triggers || !Array.isArray(item.triggers)) continue;
            
            for (const trigger of item.triggers) {
                const t = normalizeText(trigger);
                if (t && input.includes(t)) {
                    const weight = t.length;
                    if (weight > bestWeight) {
                        bestWeight = weight;
                        bestMatch = trigger;
                        bestItem = item;
                    }
                }
                
                // Also check if any word from trigger is in input
                const triggerWords = t.split(' ');
                if (triggerWords.length > 1) {
                    let matchCount = 0;
                    for (const tw of triggerWords) {
                        if (tw.length > 1 && input.includes(tw)) {
                            matchCount++;
                        }
                    }
                    if (matchCount > 0) {
                        const weight = matchCount * 3; // Multiple word matches get higher weight
                        if (weight > bestWeight) {
                            bestWeight = weight;
                            bestMatch = trigger;
                            bestItem = item;
                        }
                    }
                }
            }
        }
    }
    
    if (bestItem) {
        // Store follow-up context if exists
        if (bestItem.follow_up && bestItem.follow_up.triggers && bestItem.follow_up.answers) {
            sessionStorage.setItem('last_follow_up', JSON.stringify({
                triggers: bestItem.follow_up.triggers,
                answers: bestItem.follow_up.answers
            }));
        } else {
            // Clear any existing follow-up
            sessionStorage.removeItem('last_follow_up');
        }
        
        return random(bestItem.answers);
    }
    
    // Clear follow-up if no match found
    sessionStorage.removeItem('last_follow_up');
    return null;
}

/* =====================
   SAFE MATH CALCULATOR
===================== */
function calculateMath(expression) {
    try {
        expression = expression.replace(/\s+/g, "").replace(/=/g, "");
        
        if (!/^[\d+\-*/().]+$/.test(expression)) {
            return null;
        }
        
        const dangerousPatterns = [
            /\.\./,
            /\/\//,
            /\/\*/, /\*\//,
            /\)\s*\(/,
            /[a-zA-Z_$]/,
            /\[/, /\]/,
            /\\/
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(expression))) {
            return null;
        }
        
        if (/\/0(?!\.)/.test(expression) || /\/0\.0*$/.test(expression)) {
            return null;
        }
        
        const evaluate = (expr) => {
            expr = expr.replace(/^\((.*)\)$/, '$1');
            
            while (expr.includes('(')) {
                const start = expr.lastIndexOf('(');
                const end = expr.indexOf(')', start);
                
                if (end === -1) return null;
                
                const inner = expr.substring(start + 1, end);
                const innerResult = evaluate(inner);
                
                if (innerResult === null) return null;
                
                expr = expr.substring(0, start) + innerResult + expr.substring(end + 1);
            }
            
            const mulDivRegex = /(-?\d+(?:\.\d+)?)\s*([*/])\s*(-?\d+(?:\.\d+)?)/;
            let match;
            
            while ((match = expr.match(mulDivRegex))) {
                const [full, aStr, op, bStr] = match;
                const a = parseFloat(aStr);
                const b = parseFloat(bStr);
                
                if (isNaN(a) || isNaN(b)) return null;
                
                let result;
                if (op === '*') {
                    result = a * b;
                } else {
                    if (b === 0) return null;
                    result = a / b;
                }
                
                expr = expr.replace(full, result.toString());
            }
            
            const addSubRegex = /(-?\d+(?:\.\d+)?)\s*([+-])\s*(-?\d+(?:\.\d+)?)/;
            
            while ((match = expr.match(addSubRegex))) {
                const [full, aStr, op, bStr] = match;
                const a = parseFloat(aStr);
                const b = parseFloat(bStr);
                
                if (isNaN(a) || isNaN(b)) return null;
                
                const result = op === '+' ? a + b : a - b;
                expr = expr.replace(full, result.toString());
            }
            
            const final = parseFloat(expr);
            return isNaN(final) ? null : final;
        };
        
        const result = evaluate(expression);
        
        if (result === null || !isFinite(result)) {
            return null;
        }
        
        return Math.round(result * 1000000) / 1000000;
        
    } catch (error) {
        console.error('Math calculation error:', error);
        return null;
    }
}

/* =====================
   BOT BRAIN
===================== */
function botAnswer(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    
    const lower = normalizeText(text);
    const original = text.trim();
    
    const loveResponse = handleLoveCommands(text);
    if (loveResponse) return loveResponse;
    
    const stopCommands = ["стоп", "стоп гра", "стоп слова", "закінчити", "кінець гри"];
    if (stopCommands.includes(lower)) {
        restoreGame();
        return "Гру зупинено ✅";
    }
    
    if (lower.startsWith("слово:") || lower.startsWith("слово ") || booword) {
        booword = true;
        const word = lower.replace(/^слово[:\s]+/, "");
        return wordGameLogic(word);
    }
    
    if (/^[\d+\-*/().=\s]+$/.test(original)) {
        const cleaned = original.replace(/=/g, "").trim();
        const result = calculateMath(cleaned);
        
        if (result !== null) {
            return `Результат: ${result} ✅`;
        } else {
            return "Не можу порахувати, перевір вираз і чи ти використовуєш чі знаки (+, -, / ділення, * множення)";
        }
    }
    
    if (lower.startsWith("мене звати ")) {
        const newName = text.slice(11).trim();
        if (newName && newName.length > 0 && newName.length <= 20) {
            userName = newName;
            localStorage.setItem("username", userName);
            updateLoveBasedOnMessage("дружнє представлення");
            return `Приємно познайомитись, ${userName} 💜`;
        } else {
            return "Ім'я має бути від 1 до 20 символів";
        }
    }
    
    return null;
}

/* =====================
   MAIN RESPONSE
===================== */
function getYushiResponse(text) {
    if (typeof text !== 'string') return "Щось не так з повідомленням...";
    
    updateLoveBasedOnMessage(text);
    
    const love = getLove();
    const lower = normalizeText(text);
    
    let response = "";
    
    // Special reactions based on love level
    
    
    // Bad words reaction
    if (lower.includes("ненавиджу") || containsBadWords(text)) {
        response = "Мені боляче таке чути... 😔";
    }
    
    if (!response) {
        const matched = matchResponses(text, text);
        
        if (matched) {
            // If response is only emojis but user wrote text
            if (!hasTextContent(matched) && hasTextContent(text)) {
                response = `Я не зовсім зрозуміла тебе, ${userName}. Можеш сказати по-іншому?`;
            } else {
                response = matched;
            }
        } else {
            // No match found - creative default responses
            const defaultResponses = [
                `Я не зовсім зрозуміла тебе, ${userName}. Можеш сказати по-іншому?`,
                `Хм... не зовсім розумію. ${userName}, можеш пояснити? 🤔`,
                `Цікаво... але я не впевнена, що правильно зрозуміла. Розкажи ще раз? `,
                `У тебе така цікава думка! Але я не зовсім її зрозуміла... можеш розповісти детальніше? 💭`,
                `Ти завжди так цікаво говориш! Але зараз я трохи заплуталась...`
            ];
            response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }
    }
    
    return response;
}

/* =====================
   MESSAGE HANDLER
===================== */
function onUserMessage(message) {
    if (typeof message !== 'string') return;
    
    clearTimeout(waitingTimer);
    
    // Rate limiting
    const now = Date.now();
    if (lastMessageTime && now - lastMessageTime < 1000) {
        typeText(yushitext, "Трохи повільніше, будь ласка ⏳");
        return;
    }
    lastMessageTime = now;
    
    // Message length limit
    if (message.length > 500) {
        typeText(yushitext, "Повідомлення занадто довге. Спробуй коротше 😊");
        return;
    }
    
    // Check for repetition
    if (message === lastUserText) {
        repeatCounter++;
        if (repeatCounter >= 3) {
            typeText(yushitext, "Ти це вже казав 🙃");
            return;
        }
    } else {
        repeatCounter = 0;
    }
    
    lastUserText = message;
    
    // Get response
    let response = botAnswer(message);
    if (!response) response = getYushiResponse(message);
    
    typeText(yushitext, response);
    startWaitingTimer();
}

/* =====================
   CLEANUP FUNCTION
===================== */
function cleanupTimers() {
    clearTimeout(waitingTimer);
    clearTimeout(moodTimer);
    waitingTimer = null;
    moodTimer = null;
}

/* =====================
   INPUT HANDLER
===================== */
function inputtext() {
    const msg = textinput.value.trim();
    if (!msg) return;
    
    mytext.textContent = msg;
    textinput.value = "";
    yushitext.textContent = "Юші набирає...";
    setTimeout(() => onUserMessage(msg), 400);
}

/* =====================
   EVENTS
===================== */
sendBtn.addEventListener("click", inputtext);
textinput.addEventListener("keydown", e => {
    if (e.key === "Enter") inputtext();
});

// Clean up timers when page is unloaded
window.addEventListener('beforeunload', cleanupTimers);

/* =====================
   INIT
===================== */
// Initialize love if not set
if (!localStorage.getItem("love")) {
    setLove(50); // Neutral starting point
}

// Initialize session storage for follow-ups
if (!sessionStorage.getItem('follow_up_initialized')) {
    sessionStorage.clear();
    sessionStorage.setItem('follow_up_initialized', 'true');
}

updateAvatarByLove();
startWaitingTimer();

// Prevent form submission
if (textinput.form) {
    textinput.form.addEventListener('submit', (e) => {
        e.preventDefault();
        inputtext();
    });
}

// Welcome message on first load
if (!localStorage.getItem('welcome_shown')) {
    setTimeout(() => {
        typeText(yushitext, `Привіт, ${userName}! Рада бачити тебе знову 💜`);
        localStorage.setItem('welcome_shown', 'true');
    }, 1000);
}