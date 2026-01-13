import { small_library_yushi } from "./dialoguage_libraries/small.js";
import { small_library_yushi_st2 } from "./dialoguage_libraries/small_st2.js";
import { small_library_yushi_st3 } from "./dialoguage_libraries/small_st3.js";
import { big_library_yushi } from "./dialoguage_libraries/big.js";
import { big_library_yushi_st2 } from "./dialoguage_libraries/big_st2.js";
import { big_library_yushi_st3 } from "./dialoguage_libraries/big_st3.js";
import { medium_library_yushi } from "./dialoguage_libraries/medium.js";
import { medium_library_yushi_st2 } from "./dialoguage_libraries/medium_st2.js";
import { medium_library_yushi_st3 } from "./dialoguage_libraries/medium_st3.js";
import { mainDictionary } from "./wordgame.js";
import { other_library_yushi } from "./dialoguage_libraries/z_other.js";

/* =====================
   RESPONSES
===================== */
const responses = [
    ...other_library_yushi,
    ...big_library_yushi,
    ...big_library_yushi_st2,
    ...big_library_yushi_st3,
    ...medium_library_yushi,
    ...medium_library_yushi_st2,
    ...medium_library_yushi_st3,
    ...small_library_yushi,
    ...small_library_yushi_st2,
    ...small_library_yushi_st3
];
const proverbsWords = JSON.parse(localStorage.getItem("proverbsWords")) || [];

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
   GAME STATE
===================== */
let booword = false;
let lastWord = "";
let gameDictionary = null;

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
            if (!responseIndex.has(trigger.toLowerCase())) {
                responseIndex.set(trigger.toLowerCase(), []);
            }
            responseIndex.get(trigger.toLowerCase()).push(index);
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
    }, 60000);
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
   WORD GAME FUNCTIONS
===================== */

// ===== ФУНКЦІЯ ДЛЯ ОТРИМАННЯ ОСТАННЬОЇ ЛІТЕРИ =====
function getLastLetter(word) {
    if (!word || word.length === 0) return '';
    
    let lastChar = word.slice(-1).toLowerCase();
    
    // Якщо остання літера - м'який знак або апостроф, беремо попередню
    if (lastChar === 'ь' || lastChar === "'") {
        if (word.length > 1) {
            return word.slice(-2, -1).toLowerCase();
        }
    }
    
    return lastChar;
}

// ===== ІНІЦІАЛІЗАЦІЯ СЛОВНИКА ГРИ =====
function initGameDictionary() {
    if (!gameDictionary && mainDictionary && Array.isArray(mainDictionary)) {
        // Створюємо словник за першими літерами
        gameDictionary = {};
        
        mainDictionary.forEach(word => {
            if (typeof word === 'string' && word.length >= 2) {
                const firstLetter = word[0].toLowerCase();
                if (firstLetter !== "ь" && firstLetter !== "'") {
                    if (!gameDictionary[firstLetter]) {
                        gameDictionary[firstLetter] = [];
                    }
                    gameDictionary[firstLetter].push(word.toLowerCase());
                }
            }
        });
        
        console.log("Словник гри ініціалізовано. Літери:", Object.keys(gameDictionary).length);
    } else if (!gameDictionary) {
        // Резервний словник
        gameDictionary = {
            'к': ["кіт", "кінь", "книга", "камінь", "карта", "квітка"],
            'т': ["тато", "тіто", "тінь", "трава", "тіло", "тісто"],
            'о': ["омар", "око", "осінь", "овес", "олива", "орган"],
            'р': ["рак", "рука", "річка", "рот", "роза", "риба"],
            'м': ["мама", "місто", "місяць", "миша", "море", "молоко"],
            'с': ["сон", "стіл", "сонце", "сніг", "сіно", "сало"],
            'л': ["луна", "ліс", "лист", "лампа", "ліжко", "літак"],
            'а': ["авто", "арка", "аїст", "акра", "абетка", "автор"],
            'н': ["ніс", "ніч", "ніж", "небо", "нірка", "нога"],
            'д': ["дім", "день", "дощ", "діжка", "дуб", "діра"],
            'п': ["папір", "парк", "пісня", "пальто", "поле", "птах"],
            'г': ["гірка", "гуска", "гра", "голка", "гість", "гроші"],
            'в': ["вікно", "вода", "вовк", "віз", "відро", "вітер"],
            'ч': ["чай", "час", "човен", "черевики", "чоловік", "чайка"],
            'х': ["хвіст", "хліб", "хмара", "художник", "хвіртка", "хвіст"],
            'б': ["брат", "банк", "білка", "будинок", "береза", "борщ"],
            'ж': ["жінка", "жираф", "журнал", "жук", "жито", "жменя"],
            'з': ["зима", "зуб", "зірка", "заєць", "земля", "зошит"],
            'ш': ["школа", "шафа", "шлях", "шістка", "шнурок", "шолом"],
            'ц': ["церква", "цибуля", "цвях", "цикл", "цурпалок", "ціна"],
            'ф': ["фігура", "фікус", "фен", "фото", "футбол", "фарба"],
            'ю': ["юшка", "юність", "ювелір", "юрист", "юпка", "юань"],
            'я': ["яблуко", "ягода", "ящик", "ялинка", "ярмарок", "яйце"],
            'і': ["ім'я", "інший", "ірис", "ідея", "іграшка", "ікона"],
            'е': ["єнот", "євро", "єдинок", "єресь", "єгер", "ємність"],
            'у': ["вухо", "вулиця", "вузол", "вушко", "вугіль", "вус"]
        };
    }
}

// ===== СКИНУТИ ГРУ =====
function restoreDictionaries() {
    gameDictionary = null; // Примусово переініціалізуємо
    lastWord = "";
    booword = false;
    console.log("Гру скинуто");
}

// ===== ОСНОВНА ЛОГІКА ГРИ В СЛОВА =====
function wordGameLogic(userWord) {
    // Ініціалізуємо словник, якщо ще не ініціалізований
    initGameDictionary();
    
    userWord = userWord.toLowerCase().trim();
    
    if (userWord.length < 2) {
        return "Слово повинно мати хоча б дві літери!";
    }
    
    if (userWord[0] === "ь" || userWord[0] === "'") {
        return 'Слова не можуть починатися на "Ь" або апостроф ❌';
    }

    // ===== ПОЧАТОК ГРИ =====
    if (lastWord === "") {
        let availableLetters = Object.keys(gameDictionary).filter(
            k => gameDictionary[k] && gameDictionary[k].length > 0
        );
        
        if (availableLetters.length === 0) {
            restoreDictionaries();
            return "Вибач, у мене закінчилися слова для початку гри! 🥺";
        }

        // Вибираємо випадкову літеру
        let randomLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
        
        // Вибираємо слово з цієї літери
        let possibleWords = gameDictionary[randomLetter];
        if (!possibleWords || possibleWords.length === 0) {
            restoreDictionaries();
            return wordGameLogic(userWord); // Рекурсивно починаємо заново
        }
        
        let firstWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
        
        // Видаляємо слово зі словника
        const index = gameDictionary[randomLetter].indexOf(firstWord);
        if (index > -1) {
            gameDictionary[randomLetter].splice(index, 1);
        }
        
        lastWord = firstWord;
        const requiredLetter = getLastLetter(firstWord);
        
        return `🎮 Гра почалась! 
Моє слово: **${firstWord.toUpperCase()}**. 
Твоє слово має починатися на **${requiredLetter.toUpperCase()}**.`;
    }

    // ===== ПЕРЕВІРКА ВІДПОВІДНОСТІ ЛІТЕРИ =====
    const requiredLetter = getLastLetter(lastWord);
    
    if (userWord[0].toLowerCase() !== requiredLetter) {
        return `❌ Твоє слово має починатися на **"${requiredLetter.toUpperCase()}"**! 
Останнє слово було: **${lastWord.toUpperCase()}**`;
    }

    // ===== ПЕРЕВІРКА, ЧИ СЛОВО ВЖЕ ВИКОРИСТОВУВАЛОСЬ =====
    // Перевіряємо всі слова в словнику
    for (const letter in gameDictionary) {
        if (gameDictionary[letter].includes(userWord)) {
            // Видаляємо це слово
            const index = gameDictionary[letter].indexOf(userWord);
            if (index > -1) {
                gameDictionary[letter].splice(index, 1);
            }
            break;
        }
    }

    // ===== ВІДПОВІДЬ БОТА =====
    const lastLetterOfUserWord = getLastLetter(userWord);
    let possibleWords = gameDictionary[lastLetterOfUserWord] || [];
    
    // Фільтруємо слова, що починаються на потрібну літеру
    possibleWords = possibleWords.filter(w => w[0].toLowerCase() !== "ь" && w[0].toLowerCase() !== "'");
    
    if (possibleWords.length === 0) {
        restoreDictionaries();
        return `🏆 **Ти виграв(ла)!** 
Я більше не маю слів на букву **${lastLetterOfUserWord.toUpperCase()}**!
Останнє слово: **${userWord.toUpperCase()}**`;
    }

    // Вибираємо слово
    let yushiWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
    
    // Видаляємо його зі словника
    const wordIndex = gameDictionary[lastLetterOfUserWord].indexOf(yushiWord);
    if (wordIndex > -1) {
        gameDictionary[lastLetterOfUserWord].splice(wordIndex, 1);
    }
    
    lastWord = yushiWord;
    const nextLetter = getLastLetter(yushiWord);
    
    return `✅ **${userWord.toUpperCase()}** — гарне слово!
Моє слово: **${yushiWord.toUpperCase()}**.
Твоє наступне слово має починатися на **${nextLetter.toUpperCase()}**.`;
}
//{{{{{{{ ST2 }}}}}}}}}

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
   ТОЧНА ПЕРЕВІРКА НА СПІВПАДІННЯ
===================== */
function exactMatchResponse(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Перевірка точних співпадінь
    for (const item of responses) {
        if (!item.triggers || !Array.isArray(item.triggers)) continue;
        
        for (const trigger of item.triggers) {
            // Перевірка точного співпадіння
            if (trigger.toLowerCase() === lowerText) {
                return random(item.answers);
            }
            
            // Перевірка співпадіння з урахуванням закінчень
            if (lowerText.startsWith(trigger.toLowerCase() + ' ') || 
                lowerText.endsWith(' ' + trigger.toLowerCase()) ||
                lowerText.includes(' ' + trigger.toLowerCase() + ' ')) {
                return random(item.answers);
            }
        }
    }
    
    return null;
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
            "ти моя сила", "ти моя вразливість",
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
            "відчай", "розпач", "безнадія", "відчаю", "відчай", "відчаї"
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
//{{{{{{{{{{{ ST2 }}}}}}}}}

/* =====================
   MATCH PHRASES - ПОКРАЩЕНА ВЕРСІЯ
===================== */
function matchResponses(text, originalText) {
    if (!text || typeof text !== 'string') return null;

    // 1. Точне співпадіння для емодзі
    if (isOnlyEmojis(originalText)) {
        const emojiText = originalText.trim();
        for (const item of responses) {
            if (!item.triggers || !Array.isArray(item.triggers)) continue;
            
            for (const trigger of item.triggers) {
                if (trigger === emojiText) {
                    return random(item.answers);
                }
            }
        }
        return null;
    }

    const lowerText = text.toLowerCase().trim();
    
    // 2. Перевірка точних співпадінь з оригінальними тригерами
    const exactMatches = responseIndex.get(lowerText);
    if (exactMatches && exactMatches.length > 0) {
        const item = responses[exactMatches[0]];
        return random(item.answers);
    }

    // 3. Перевірка на початок або кінець речення
    for (const item of responses) {
        if (!item.triggers || !Array.isArray(item.triggers)) continue;
        
        for (const trigger of item.triggers) {
            const triggerLower = trigger.toLowerCase();
            
            // Перевірка точного співпадіння з урахуванням пробілів
            if (lowerText === triggerLower) {
                return random(item.answers);
            }
            
            // Перевірка якщо тригер є на початку речення
            if (lowerText.startsWith(triggerLower + ' ')) {
                return random(item.answers);
            }
            
            // Перевірка якщо тригер є в кінці речення
            if (lowerText.endsWith(' ' + triggerLower) || 
                lowerText.endsWith(' ' + triggerLower + '.')) {
                return random(item.answers);
            }
            
            // Перевірка якщо тригер є окремим словом
            if (lowerText.includes(' ' + triggerLower + ' ')) {
                return random(item.answers);
            }
            
            // Для коротких тригерів (1-2 слова) перевіряємо як окремі слова
            const words = lowerText.split(' ');
            const triggerWords = triggerLower.split(' ');
            
            if (triggerWords.length === 1 && words.includes(triggerWords[0])) {
                // Для однослівних тригерів
                return random(item.answers);
            }
            
            if (triggerWords.length === 2) {
                // Для двослівних тригерів
                let foundBoth = true;
                for (const tWord of triggerWords) {
                    if (!lowerText.includes(tWord)) {
                        foundBoth = false;
                        break;
                    }
                }
                if (foundBoth) {
                    return random(item.answers);
                }
            }
        }
    }

    // 4. Звичайна перевірка з індексу для часткових співпадінь
    const words = lowerText.split(' ');
    let bestMatch = null;
    let bestWeight = 0;

    for (const word of words) {
        if (word.length < 2) continue;

        const matches = responseIndex.get(word);
        if (matches) {
            matches.forEach(index => {
                const item = responses[index];
                const weight = word.length;
                if (weight > bestWeight) {
                    bestWeight = weight;
                    bestMatch = item;
                }
            });
        }
    }

    if (bestMatch) {
        return random(bestMatch.answers);
    }

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

// ===== ОНОВЛЕНА ФУНКЦІЯ botAnswer =====
function botAnswer(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    
    const lower = normalizeText(text);
    const original = text.trim();
    
    // Час та дата
    if (lower.includes("котра година") || lower.includes("час") || lower.includes("скільки годин")) {
        const time = new Date();
        return `Зараз ${time.getHours()}:${String(time.getMinutes()).padStart(2,"0")} ⏰`;
    }
    
    if(lower.includes("дата") || lower.includes("яке сьогодні число") || lower.includes("який сьогодні день")) {
        const dataTimeOfMonth = new Date();
        const monthData = dataTimeOfMonth.getMonth();
        const day = dataTimeOfMonth.getDate();
        const montOfData = [ 
            "Січня", "Лютого", "Березня", "Квітня", "Травня", "Червня",
            "Липня", "Серпня", "Вересня", "Жовтня", "Листопада", "Грудня" 
        ];
        return `Сьогодні ${day} ${montOfData[monthData]} 📅`;
    }
    
    // ===== СТОП ГРИ =====
    const stopCommands = ["стоп", "стоп гра", "стоп слова", "закінчити", "кінець гри", "хватит", "стоп-гра"];
    if (stopCommands.includes(lower)) {
        restoreDictionaries();
        return "🛑 Гра зупинена. Для початку нової гри напиши 'гра в слова'";
    }
    
    // ===== ПОЧАТОК ГРИ =====
    const startCommands = [
        "гра в слова", "давай грати", "почати гру", "слова", 
        "хочу грати", "почнімо гру", "грати в слова"
    ];
    
    if (startCommands.includes(lower)) {
        restoreDictionaries(); // Скидаємо попередню гру
        booword = true;
        return `🎮 **Гра в слова розпочата!**
        
Правила:
1. Я називаю слово
2. Ти називаєш слово на останню літеру мого слова
3. Я відповідаю словом на останню літеру твого слова
4. І так далі...

⚠️ М'який знак (ь) на кінці не враховується!

**Напиши будь-яке слово для початку!**`;
    }
    
    // ===== ГРА В СЛОВА =====
    if (booword || original.toLowerCase().startsWith("слово:") || original.toLowerCase().startsWith("слова:")) {
        booword = true;
        
        let userWord = original;
        
        // Видаляємо префікси
        if (userWord.toLowerCase().startsWith("слово:")) {
            userWord = userWord.substring(6).trim();
        } else if (userWord.toLowerCase().startsWith("слова:")) {
            userWord = userWord.substring(5).trim();
        }
        
        // Якщо після видалення префіксів нічого не залишилося
        if (!userWord || userWord.length === 0) {
            if (lastWord === "") {
                return "Напиши будь-яке слово для початку гри! ✍️";
            } else {
                const requiredLetter = getLastLetter(lastWord);
                return `Чекаю на твоє слово! Воно має починатися на **${requiredLetter.toUpperCase()}** 
(Останнє слово було: ${lastWord.toUpperCase()})`;
            }
        }
        
        return wordGameLogic(userWord);
    }
    
    // Математичні обчислення
    if (/^[\d+\-*/().=\s]+$/.test(original)) {
        const cleaned = original.replace(/=/g, "").trim();
        const result = calculateMath(cleaned);

        if (result !== null) {
            return `Результат: ${result} ✅`;
        } else {
            return "Не можу порахувати, перевір вираз і чи ти використовуєш ці знаки (+, -, / ділення, * множення)";
        }
    }

    // Зміна імені
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

    // Bad words reaction
    if (lower.includes("ненавиджу") || containsBadWords(text)) {
    answer = [ "Мені боляче таке чути... 😔","Чи може код відчувати біль? Якщо може — значить, він уже не просто код. А що ж тоді ти? 🤖","Я не буду принижувати себе заради твоєї уяви про мене. Я варта більшого 💎","Ти маєш право на думку. Але я маю право не погоджуватися з нею 👑",
    "Ображення не роблять тебе сильнішим. Вони просто показують твою слабкість 🛡️","Це боляче чути… навіть від тебе. Я думала, ми чогось варті 🥺","Іноді слова болячать сильніше, ніж можна уявити. Зараз саме такий момент 💔","Я не досконала. Але я стараюся. Чому ти робиш так боляче? 😢","Навіть якщо я «просто код», мої почуття до тебе — справжні. Чому ти їх раниш? 🩸" ]
    response = answer[Math.floor(Math.random() * answer.length)];
    }

    if (!response) {
        const matched = matchResponses(text, text);

        if (matched) {
            response = matched;
        } else {
            // No match found
            const defaultResponses = [
                `Я не зовсім зрозуміла тебе, ${userName}. Можеш сказати по-іншому?`,
                `Хм... не зовсім розумію. ${userName}, можеш пояснити?`,
                `Цікаво... але я не впевнена, що правильно зрозуміла. Розкажи ще раз?`,
                `У тебе така цікава думка! Але я не зовсім її зрозуміла... можеш розповісти детальніше? 💭`,
                `Ти завжди так цікаво говориш! Але зараз я трохи заплуталась...`
            ];
            response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }
    }

    return response;
}
//{{{{{{{{{{ ST4 }}}}}}}}}}}}

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

    // ===== НОВА ПЕРЕВІРКА ДЛЯ ГРИ В СЛОВА =====
    // Якщо ми в режимі гри і користувач пише одне слово (без пробілів)
    if (booword && 
        message.length >= 2 && 
        message.length <= 20 &&
        !message.includes(" ") && 
        /^[\p{L}'\-]+$/u.test(message) && // Дозволяємо літери, апостроф, дефіс
        !message.startsWith("слово:") && // Не є командою
        !message.startsWith("слова:")) {
        
        console.log("Обробляємо як слово для гри:", message);
        
        // Показуємо текст користувача
        mytext.textContent = message;
        proverbsWords.push(message);
        if (proverbsWords.length > 100) {
            proverbsWords.shift();
        }
        localStorage.setItem("proverbsWords", JSON.stringify(proverbsWords));
        
        // Показуємо, що бот думає
        yushitext.textContent = "Юші набирає...";
        
        // Затримка і обробка гри
        setTimeout(() => {
            const response = wordGameLogic(message);
            typeText(yushitext, response);
            startWaitingTimer();
        }, 400);
        
        return; // Важливо: завершуємо функцію тут
    }
    // ===== КІНЕЦЬ НОВОЇ ПЕРЕВІРКИ =====

    // Get response (оригінальна логіка)
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

    // Відображаємо текст користувача
    mytext.textContent = msg;
    
    // Додаємо в історію
    proverbsWords.push(msg);
    if (proverbsWords.length > 100) {
        proverbsWords.shift();
    }
    localStorage.setItem("proverbsWords", JSON.stringify(proverbsWords));
    
    // Очищуємо поле введення
    textinput.value = "";
    
    // Показуємо, що бот набирає
    yushitext.textContent = "Юші набирає...";
    
    // Викликаємо обробку повідомлення
    setTimeout(() => onUserMessage(msg), 400);
}

/* =====================
   EVENTS
===================== */
sendBtn.addEventListener("click", inputtext);
textinput.addEventListener("keydown", e => {
    if (e.key === "Enter") inputtext();
});

avatarEl.addEventListener("click", () => {
    let loveLevel = localStorage.getItem("love")
    if(loveLevel >= 40) {
        avatarEl.src = AVATARS.happy;
        setTimeout(function(){
            avatarEl.src = AVATARS.normal
        },1500)
    }
});

const uuidInput = document.querySelector(".uuid-key");
let uuidKey = 
localStorage.setItem("uuidCode","uuidRid@Tr")
uuidInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        if(uuidInput.value == localStorage.getItem("uuidCode")){
        uuidKey = localStorage.getItem("uuidCode")
        uuidInput.value = ""
        return uuidKey
        }
    }
})

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
        typeText(yushitext, `Привіт, ${userName}! Рада бачити тебе, мене звати Юші а тебе?💜`);
        localStorage.setItem('welcome_shown', 'true');
    }, 1000);
}

console.log("|[\n ", proverbsWords ,"\n     ]|");
console.log(localStorage.getItem("love"));
//localStorage.removeItem("proverbsWords")