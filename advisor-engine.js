// מנוע ההתאמה של יועץ התמציות - פורט נאמן של backend/advisor_engine.py
// (הגרסה המורחבת: טוקניזציה, נרמול תחיליות ואותיות סופיות, לקסיקון דפוסים
// עם משקלים, שלילה מבוססת-הקשר, שאלות yesno/choice, ובחירת שאלה דטרמיניסטית).
//
// כל מבני הנתונים (LEXICON, CLARIFYING_QUESTIONS וכו') יוצאו ישירות מהמודול
// הפייתוני המקורי (ר' mobile/tests/gen_cases.py) כדי להבטיח התאמה מדויקת של
// כל מחרוזת עברית, כל משקל וכל סדר - בלי הקלדה ידנית.
(function (global) {
  "use strict";

  var isNode = typeof module !== "undefined" && module.exports;
  var flowersMod = isNode ? require("./bach-flowers.js") : (global.BachApp && global.BachApp.flowers);
  var BY_KEY = flowersMod.BY_KEY;

  var MIN_QUESTIONS = 2;
  var MAX_QUESTIONS = 6;
  var MAX_REMEDIES_IN_BLEND = 6;
  var QUALIFY_MIN_SCORE = 2;
  var QUALITY_GATE_MIN_SCORE = 3;

  var REMEDY_ORDER = [
  "rock_rose",
  "mimulus",
  "cherry_plum",
  "aspen",
  "red_chestnut",
  "cerato",
  "scleranthus",
  "gentian",
  "gorse",
  "hornbeam",
  "wild_oat",
  "clematis",
  "honeysuckle",
  "wild_rose",
  "olive",
  "white_chestnut",
  "mustard",
  "chestnut_bud",
  "water_violet",
  "impatiens",
  "heather",
  "agrimony",
  "centaury",
  "walnut",
  "holly",
  "larch",
  "pine",
  "elm",
  "sweet_chestnut",
  "star_of_bethlehem",
  "willow",
  "oak",
  "crab_apple",
  "chicory",
  "vervain",
  "vine",
  "beech",
  "rock_water",
  "rescue_remedy"
];
  var ALL_KEYS = [
  "rock_rose",
  "mimulus",
  "cherry_plum",
  "aspen",
  "red_chestnut",
  "cerato",
  "scleranthus",
  "gentian",
  "gorse",
  "hornbeam",
  "wild_oat",
  "clematis",
  "honeysuckle",
  "wild_rose",
  "olive",
  "white_chestnut",
  "mustard",
  "chestnut_bud",
  "water_violet",
  "impatiens",
  "heather",
  "agrimony",
  "centaury",
  "walnut",
  "holly",
  "larch",
  "pine",
  "elm",
  "sweet_chestnut",
  "star_of_bethlehem",
  "willow",
  "oak",
  "crab_apple",
  "chicory",
  "vervain",
  "vine",
  "beech",
  "rock_water",
  "rescue_remedy"
];
  var REMEDY_INDEX = {};
  REMEDY_ORDER.forEach(function (k, i) { REMEDY_INDEX[k] = i; });

  // ==========================================================================
  // A. נרמול טקסט וטוקניזציה
  // ==========================================================================

  var NIQQUD_RE = /[\u0591-\u05C7]/g;
  var NON_WORD_RE = /[^\u05D0-\u05EA0-9A-Za-z\u05F3\u05F4'" \t\n]/g;
  var WHITESPACE_RE = /\s+/g;

  function _normalize(text) {
    if (!text) return "";
    text = text.replace(NIQQUD_RE, "");
    text = text.replace(NON_WORD_RE, " ");
    text = text.replace(WHITESPACE_RE, " ").trim();
    return text;
  }

  function tokenize(text) {
    var norm = _normalize(text);
    if (!norm) return [];
    return norm.split(" ");
  }

  var PREFIXES = [
  "וה",
  "וש",
  "שה",
  "וב",
  "ול",
  "ומ",
  "שב",
  "של",
  "כש",
  "מה",
  "לה",
  "בה",
  "ו",
  "ה",
  "ש",
  "ב",
  "ל",
  "מ",
  "כ"
];

  function _tokenReadings(token) {
    var readings = [token];
    for (var i = 0; i < PREFIXES.length; i++) {
      var prefix = PREFIXES[i];
      if (token.indexOf(prefix) === 0 && token.length > prefix.length) {
        var stripped = token.slice(prefix.length);
        if (readings.indexOf(stripped) === -1) readings.push(stripped);
      }
    }
    return readings;
  }

  var FINAL_LETTERS_MAP = { "\u05DA": "\u05DB", "\u05DD": "\u05DE", "\u05DF": "\u05E0", "\u05E3": "\u05E4", "\u05E5": "\u05E6" };

  function _definalize(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      out += FINAL_LETTERS_MAP.hasOwnProperty(c) ? FINAL_LETTERS_MAP[c] : c;
    }
    return out;
  }

  function _stemMatches(token, stem) {
    var stemNorm = _definalize(stem);
    var readings = _tokenReadings(token);
    for (var i = 0; i < readings.length; i++) {
      if (_definalize(readings[i]).indexOf(stemNorm) === 0) return true;
    }
    return false;
  }

  // ==========================================================================
  // B. הלקסיקון - דפוסים עשירים לכל תמצית (יוצא מ-Python, ר' הערה למעלה)
  // ==========================================================================

  var LEXICON = {
  "rock_rose": [
    {
      "terms": [
        "פאניקה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "התקף",
        "פאניקה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "התקף",
        "חרדה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אימה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בהלה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נבהל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מבועת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מזועזע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "טרור"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קפא",
        "מפחד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לב",
        "דופק",
        "חזק"
      ],
      "weight": 1
    },
    {
      "terms": [
        "דופק",
        "מהיר"
      ],
      "weight": 1
    },
    {
      "terms": [
        "חירום",
        "נפשי"
      ],
      "weight": 2
    }
  ],
  "mimulus": [
    {
      "terms": [
        "מפחד",
        "מבחן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מפחד",
        "בחינ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "מבחן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "בחינ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מפחד",
        "ראיון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "ראיון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מפחד",
        "הופע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "במה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "לדבר",
        "ציבור"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "חיות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "כלבים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "גובה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "טיסה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "טיסות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "רופא",
        "שיניים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "מחלה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "חושך"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ביישן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ביישנות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חושש"
      ],
      "weight": 1
    },
    {
      "terms": [
        "פוביה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד"
      ],
      "weight": 1
    }
  ],
  "cherry_plum": [
    {
      "terms": [
        "לאבד",
        "שליטה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "יאבד",
        "שליטה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תאבד",
        "שליטה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "איבוד",
        "שליטה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "להשתגע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "שתגע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דחפים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מחשבות",
        "מפחיד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "לפגוע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מפחד",
        "מעצמו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קרוב",
        "להתמוטטות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "על",
        "סף",
        "התפרצות"
      ],
      "weight": 1
    },
    {
      "terms": [
        "פחד",
        "מהשפיות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרגיש",
        "משתגע"
      ],
      "weight": 2
    }
  ],
  "aspen": [
    {
      "terms": [
        "פחד",
        "ללא",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "בלי",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חרדה",
        "מעורפלת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תחושה",
        "רעה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תחושת",
        "רוע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "לא",
        "מוסבר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "מהלא",
        "נודע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתעורר",
        "בפחד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתח",
        "לא",
        "מזוהה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פחד",
        "סתמי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חושש",
        "סתם"
      ],
      "weight": 1
    },
    {
      "terms": [
        "חרדה"
      ],
      "weight": 1
    }
  ],
  "red_chestnut": [
    {
      "terms": [
        "דואג",
        "לילד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דואג",
        "לבעל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דואג",
        "לאישה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דואג",
        "להורים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חרד",
        "לשלום"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "שיקרה",
        "להם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דאגה",
        "מוגזמת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דאגת",
        "יתר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חוששת",
        "לבן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מפחד",
        "למשפחה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בודקת",
        "אותם",
        "כל",
        "הזמן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דואג"
      ],
      "weight": 1
    }
  ],
  "cerato": [
    {
      "terms": [
        "לא",
        "סומך",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "סומכת",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתייעץ",
        "כולם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "שואל",
        "כולם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מבקש",
        "דעה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "צריך",
        "אישור"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "בוטח",
        "בשיפוט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחקה",
        "אחרים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חסר",
        "ביטחון",
        "בהחלטות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מה",
        "אחרים",
        "חושבים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "צריך",
        "חוות",
        "דעת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סומך",
        "שיפוט"
      ],
      "weight": 2
    }
  ],
  "scleranthus": [
    {
      "terms": [
        "מתלבט"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתקשה",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מצליח",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מסוגל",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קשה",
        "לה",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קשה",
        "לו",
        "להחליט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בין",
        "שתי",
        "אפשרויות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תנודות",
        "מצב",
        "רוח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "לבחור"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתנדנד",
        "בין"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "יודע",
        "להכריע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "התלבטות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתחרט",
        "מהר"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מתנדנד",
        "בהחלטות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "להכריע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "החלטה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "החלטות"
      ],
      "weight": 1
    }
  ],
  "gentian": [
    {
      "terms": [
        "מתייאש",
        "בקלות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ספקן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פסימי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתייאש",
        "מהר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרים",
        "ידיים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתייאש",
        "אחרי",
        "כישלון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתאכזב",
        "בקלות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ספק",
        "בעצמו"
      ],
      "weight": 1
    },
    {
      "terms": [
        "חוסר",
        "אמונה",
        "בהצלחה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מרגיש",
        "שזה",
        "לא",
        "ילך"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מתייאש"
      ],
      "weight": 1
    },
    {
      "terms": [
        "ירידה",
        "במורל"
      ],
      "weight": 1
    }
  ],
  "gorse": [
    {
      "terms": [
        "חוסר",
        "תקווה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "תקווה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "סיכוי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ויתר",
        "המאבק"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ויתר",
        "לגמרי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אין",
        "אור",
        "בקצה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "הפסיק",
        "להאמין"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חסר",
        "תקווה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "טעם",
        "להמשיך"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מוותר",
        "על",
        "הכל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ייאוש",
        "מוחלט"
      ],
      "weight": 2
    },
    {
      "terms": [
        "התייאשות",
        "מלאה"
      ],
      "weight": 2
    }
  ],
  "hornbeam": [
    {
      "terms": [
        "עייפות",
        "נפשית"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "כוח",
        "להתחיל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "כוח"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לא",
        "מסוגל",
        "להתחיל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מתחשק"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עייף",
        "לפני",
        "שמתחיל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דחיינות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דוחה",
        "משימות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עייפות",
        "יום",
        "ראשון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "לצאת",
        "למיטה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "אין",
        "מוטיבציה",
        "להתחיל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתעכב",
        "בהתחלה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "גורר",
        "רגליים"
      ],
      "weight": 1
    },
    {
      "terms": [
        "צריך",
        "דחיפה",
        "כדי",
        "להתחיל"
      ],
      "weight": 1
    }
  ],
  "wild_oat": [
    {
      "terms": [
        "חוסר",
        "כיוון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מבולבל",
        "לגבי",
        "עתיד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מבולבל",
        "לגבי",
        "קריירה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חסר",
        "מטרה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "יודע",
        "מה",
        "לעשות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "צומת",
        "בחיים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מוצא",
        "כיוון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מבולבל",
        "לגבי",
        "מקצוע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחפש",
        "את",
        "עצמ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "בוחר",
        "מקצוע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אין",
        "תוכנית",
        "לחיים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "יודעת",
        "מה",
        "לעשות"
      ],
      "weight": 2
    }
  ],
  "clematis": [
    {
      "terms": [
        "חלימה",
        "בהקיץ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מנותק"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בעננים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חולמני"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מרוכז"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בורח",
        "למחשבות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חי",
        "בעולם",
        "משלו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרחף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מפוזר"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לא",
        "נוכח"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מדמיין",
        "עתיד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בורח",
        "מהמציאות"
      ],
      "weight": 3
    }
  ],
  "honeysuckle": [
    {
      "terms": [
        "געגוע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "געגועים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תקוע",
        "בעבר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נוסטלגיה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתגעגע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ימים",
        "טובים",
        "מאחוריו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "משתחרר",
        "מהעבר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חי",
        "בזיכרונות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חושב",
        "על",
        "העבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתקשה",
        "לשכוח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חי",
        "בעבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מדבר",
        "כל",
        "הזמן",
        "עבר"
      ],
      "weight": 1
    }
  ],
  "wild_rose": [
    {
      "terms": [
        "אדיש"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אין",
        "חשק"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ויתור",
        "פסיבי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נכנע",
        "לנסיבות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חיים",
        "מונוטוניים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "אכפת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חוסר",
        "מוטיבציה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בלי",
        "חשק",
        "לכלום"
      ],
      "weight": 3
    },
    {
      "terms": [
        "משלים",
        "עם",
        "המצב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "נלחם"
      ],
      "weight": 1
    },
    {
      "terms": [
        "חסר",
        "עניין",
        "בחיים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "משועמם",
        "מהחיים"
      ],
      "weight": 2
    }
  ],
  "olive": [
    {
      "terms": [
        "תשישות",
        "מוחלטת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מותש"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אין",
        "כוחות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "כוח"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מיצוי"
      ],
      "weight": 1
    },
    {
      "terms": [
        "עייפות",
        "פיזית",
        "ונפשית"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "יותר",
        "כוח"
      ],
      "weight": 3
    },
    {
      "terms": [
        "גמור"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אין",
        "אנרגיה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "סחוט"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עבודה",
        "קשה",
        "בלי",
        "הנאה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תשוש"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עייף"
      ],
      "weight": 1
    }
  ],
  "white_chestnut": [
    {
      "terms": [
        "מחשבות",
        "טורדניות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחשבות",
        "חוזרות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מפסיק",
        "לחשוב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ראש",
        "לא",
        "שקט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחשבות",
        "רצות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחשבות",
        "סחור"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "נותנות",
        "לישון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נדודי",
        "שינה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לא",
        "ישן",
        "כי",
        "המחשבות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מוח",
        "לא",
        "נח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רעש",
        "מחשבתי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחשבות"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לא",
        "ישן",
        "בלילות"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לא",
        "נרדם"
      ],
      "weight": 1
    }
  ],
  "mustard": [
    {
      "terms": [
        "עצבות",
        "פתאומית"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ענן",
        "שחור"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דיכאון",
        "בלי",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עצבות",
        "בלי",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עצוב",
        "בלי",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עצוב",
        "ללא",
        "סיבה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דיכאון",
        "משום",
        "מקום"
      ],
      "weight": 3
    },
    {
      "terms": [
        "יורד",
        "עלי",
        "פתאום"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עצב",
        "פתאומי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מצב",
        "רוח",
        "יורד"
      ],
      "weight": 1
    },
    {
      "terms": [
        "עצוב"
      ],
      "weight": 1
    },
    {
      "terms": [
        "דיכאון"
      ],
      "weight": 1
    },
    {
      "terms": [
        "בוכה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "ענן",
        "כבד"
      ],
      "weight": 2
    }
  ],
  "chestnut_bud": [
    {
      "terms": [
        "חוזר",
        "על",
        "אותה",
        "טעות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "לומד",
        "מהניסיון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אותה",
        "טעות",
        "שוב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נופל",
        "שוב",
        "באותו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חוזר",
        "על",
        "הדפוס"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מפיק",
        "לקחים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "טעויות",
        "חוזרות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דפוס",
        "חוזר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "משתנה",
        "מהניסיון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נכשל",
        "באותו",
        "דבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "לומד"
      ],
      "weight": 1
    }
  ],
  "water_violet": [
    {
      "terms": [
        "מעדיף",
        "להיות",
        "לבד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מעדיפה",
        "להיות",
        "לבד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מסתגר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שומר",
        "מרחק"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קשה",
        "לו",
        "לשתף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שומר",
        "על",
        "פרטיות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "כופה",
        "דעתו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מופנם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נהנה",
        "מבדידות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "משתף",
        "ברגשות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מרוחק",
        "רגשית"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עצמאי",
        "מאוד"
      ],
      "weight": 1
    }
  ],
  "impatiens": [
    {
      "terms": [
        "חוסר",
        "סבלנות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חסר",
        "סבלנות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ממהר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתעצבן",
        "מהר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לחוץ",
        "בקצב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עושה",
        "הכל",
        "מהר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סבלן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קצר",
        "רוח"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתפרץ",
        "מחוסר",
        "סבלנות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "הכל",
        "עכשיו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עצבני",
        "מהמתנה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סובל",
        "להמתין"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לחץ"
      ],
      "weight": 1
    }
  ],
  "heather": [
    {
      "terms": [
        "צריך",
        "תשומת",
        "לב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "יכול",
        "להיות",
        "לבד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מדבר",
        "על",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "זקוק",
        "לחברה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרוכז",
        "בעצמו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מדברן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "צריך",
        "להיות",
        "מוקף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בודד",
        "ומחפש",
        "חברה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מפחד",
        "להיות",
        "לבד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מחפש",
        "תשומת",
        "לב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "סובל",
        "בדידות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "שיקשיבו",
        "לו"
      ],
      "weight": 1
    }
  ],
  "agrimony": [
    {
      "terms": [
        "מסתיר",
        "מצוקה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חיוך",
        "מזויף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מעמיד",
        "פנים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחייך",
        "למרות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "הכל",
        "בסדר",
        "כלפי",
        "חוץ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מחפש",
        "חברה",
        "לברוח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לבד",
        "עם",
        "המחשבות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מסווה",
        "כאב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מצליח",
        "להעמיד",
        "פנים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "בורח",
        "מקונפליקט"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מסתיר",
        "כאב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חזות",
        "עליזה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחייך"
      ],
      "weight": 1
    },
    {
      "terms": [
        "תמיד",
        "מחייך"
      ],
      "weight": 2
    },
    {
      "terms": [
        "הכל",
        "בסדר"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מסתיר",
        "מכולם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מסתיר",
        "מהכל"
      ],
      "weight": 2
    }
  ],
  "centaury": [
    {
      "terms": [
        "לא",
        "יודע",
        "לסרב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "יודע",
        "להגיד",
        "לא"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קשה",
        "לו",
        "לומר",
        "לא"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתאים",
        "עצמ",
        "לכולם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתאים",
        "עצמ",
        "לאחרים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "כנוע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מזניח",
        "את",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרצה",
        "אחרים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מנסה",
        "לרצות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מאפשר",
        "לאחרים",
        "להעמיס"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתכחש",
        "לרצונות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "לסרב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עושה",
        "מה",
        "שמבקשים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "עומד",
        "על",
        "שלו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ריצוי"
      ],
      "weight": 2
    }
  ],
  "walnut": [
    {
      "terms": [
        "גירושין"
      ],
      "weight": 3
    },
    {
      "terms": [
        "התגרש"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתגרש"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פרידה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נפרד",
        "מבן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נפרדה",
        "מבן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מעבר",
        "דירה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עבר",
        "דירה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עוברת",
        "דירה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עובר",
        "דירה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עבודה",
        "חדשה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "התחיל",
        "עבודה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לידה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ילדה",
        "תינוק"
      ],
      "weight": 1
    },
    {
      "terms": [
        "גיל",
        "המעבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קושי",
        "בהסתגלות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מסתגל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תקופת",
        "מעבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מושפע",
        "מדעות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נסחף",
        "מהתלהבות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתוסכל",
        "כשמוסטים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שינוי",
        "גדול",
        "בחיים"
      ],
      "weight": 2
    }
  ],
  "holly": [
    {
      "terms": [
        "כועס"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עצבני"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתפרץ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קנאה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חשד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שנאה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תוקפנות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עוין"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מזג",
        "רע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "כעס",
        "בלתי",
        "נשלט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קנאי",
        "באחרים"
      ],
      "weight": 2
    }
  ],
  "larch": [
    {
      "terms": [
        "חוסר",
        "ביטחון",
        "עצמי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מצפה",
        "לכישלון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פחד",
        "להיכשל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מספיק",
        "טוב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מאמין",
        "ביכולת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בטוח",
        "ייכשל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בטוח",
        "תיכשל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ייכשל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תיכשל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "ינסה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תחושת",
        "נחיתות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרגיש",
        "נחות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חוסר",
        "ערך",
        "עצמי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מאמין",
        "בעצמו"
      ],
      "weight": 3
    }
  ],
  "pine": [
    {
      "terms": [
        "אשמה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מאשים",
        "את",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מאשימה",
        "את",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתנצל",
        "כל",
        "הזמן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ביקורת",
        "עצמית"
      ],
      "weight": 2
    },
    {
      "terms": [
        "יכל",
        "לעשות",
        "טוב",
        "יותר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לוקח",
        "אחריות",
        "על",
        "טעויות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מרגיש",
        "אשם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרגישה",
        "אשמה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תחושת",
        "אשמה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מענישה",
        "את",
        "עצמ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סולח",
        "לעצמו"
      ],
      "weight": 3
    }
  ],
  "elm": [
    {
      "terms": [
        "עומס",
        "רגעי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "יותר",
        "מדי",
        "אחריות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קורס",
        "מעומס"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מוצף",
        "מאחריות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מוכרע",
        "תחת",
        "נטל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מאבד",
        "זמנית",
        "אמון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "יותר",
        "מדי",
        "על",
        "הראש"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עומס",
        "עבודה",
        "כבד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשה",
        "להכיל",
        "הכל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מוצף"
      ],
      "weight": 1
    },
    {
      "terms": [
        "אחריות",
        "גדולה",
        "מדי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נטל",
        "כבד",
        "מדי"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לוקח",
        "על",
        "עצמ",
        "הכל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לוקחת",
        "על",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "גמור"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לחץ"
      ],
      "weight": 1
    }
  ],
  "sweet_chestnut": [
    {
      "terms": [
        "ייאוש",
        "קיצוני"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קצה",
        "גבול",
        "היכולת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מיצוי",
        "מוחלט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ייסורים",
        "קשים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מצוקה",
        "נוראה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קצה",
        "גבול",
        "הסבל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "אור",
        "בקצה",
        "המנהרה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "יכול",
        "יותר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שבור",
        "לגמרי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ריק",
        "מכל",
        "תקווה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "כאב",
        "בלתי",
        "נסבל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "הגעתי",
        "לקצה"
      ],
      "weight": 2
    }
  ],
  "star_of_bethlehem": [
    {
      "terms": [
        "הלם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "טראומה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אחרי",
        "אירוע",
        "קשה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עדיין",
        "מושפע",
        "מהאירוע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "התאושש",
        "מהאירוע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מסרב",
        "להתנחם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אובדן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נפטר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תאונה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תאונת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "טרגדיה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שכול"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בהלם",
        "מהחדשות"
      ],
      "weight": 2
    }
  ],
  "willow": [
    {
      "terms": [
        "מרירות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תחושת",
        "קורבן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עוול"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "הוגן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "בצדק"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מאשים",
        "נסיבות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "רחמים",
        "עצמיים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרחם",
        "על",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "היה",
        "ראוי",
        "לצרה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מר",
        "על",
        "גורלו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "למה",
        "דווקא",
        "לי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מריר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתלונן",
        "על",
        "העולם"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מלא",
        "טינה"
      ],
      "weight": 2
    }
  ],
  "oak": [
    {
      "terms": [
        "לא",
        "מוותר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מבקש",
        "עזרה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתמיד",
        "עד",
        "כלות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ממשיך",
        "למרות",
        "הכול"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ממשיך",
        "לא",
        "משנה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתעלם",
        "מהעייפות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "עוצר",
        "לרגע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נושא",
        "הכל",
        "לבד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ממשיך",
        "לעבוד",
        "למרות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מרשה",
        "לעצמו",
        "לנוח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "נשבר",
        "לעולם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "ממשיך",
        "בשקט",
        "לסבול"
      ],
      "weight": 1
    }
  ],
  "crab_apple": [
    {
      "terms": [
        "גועל",
        "עצמי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אובססיה",
        "לניקיון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מרגיש",
        "מלוכלך"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתמקד",
        "בפגם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דימוי",
        "גוף",
        "ירוד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מגעיל",
        "את",
        "עצמ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חייב",
        "להתנקות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "להיטהר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מרגישה",
        "מטונפת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סובל",
        "לכלוך"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מוטרד",
        "ממראהו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פרפקציוניסט",
        "בניקיון"
      ],
      "weight": 2
    }
  ],
  "chicory": [
    {
      "terms": [
        "אהבה",
        "תובענית"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דורש",
        "תשומת",
        "לב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתערב",
        "יותר",
        "מדי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "שתלטנית",
        "ברגש"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נותן",
        "כדי",
        "לקבל"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מצפה",
        "שיתאימו",
        "אליו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נודניק"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "תודה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נעלב",
        "כשלא",
        "מעריכים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דואג",
        "לילדים",
        "הבוגרים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מרגיש",
        "מנוצל"
      ],
      "weight": 1
    },
    {
      "terms": [
        "רוצה",
        "הכרה",
        "בתמורה"
      ],
      "weight": 1
    }
  ],
  "vervain": [
    {
      "terms": [
        "התלהבות",
        "יתר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קנאי",
        "לרעיון"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "יודע",
        "לוותר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "להמיר",
        "את",
        "כולם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נלהב",
        "מדי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "פעיל",
        "יתר",
        "על",
        "המידה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מפסיק",
        "לרוץ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נאבק",
        "על",
        "האמונות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מיסיונר"
      ],
      "weight": 1
    },
    {
      "terms": [
        "תמיד",
        "בפעולה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לחוץ",
        "מרוב",
        "מרץ"
      ],
      "weight": 1
    },
    {
      "terms": [
        "נלחם",
        "על",
        "הצדק"
      ],
      "weight": 1
    },
    {
      "terms": [
        "לחץ"
      ],
      "weight": 1
    }
  ],
  "vine": [
    {
      "terms": [
        "שתלטן"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מכתיב",
        "לאחרים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "רודני"
      ],
      "weight": 3
    },
    {
      "terms": [
        "דורש",
        "ציות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מקבל",
        "דעה",
        "אחרת"
      ],
      "weight": 3
    },
    {
      "terms": [
        "תאב",
        "שליטה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בז",
        "לרגשות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נוקשה"
      ],
      "weight": 1
    },
    {
      "terms": [
        "חייב",
        "לשלוט"
      ],
      "weight": 2
    },
    {
      "terms": [
        "צריך",
        "לשלוט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מטיל",
        "מרות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "סובל",
        "התנגדות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מתפשר"
      ],
      "weight": 1
    }
  ],
  "beech": [
    {
      "terms": [
        "ביקורתי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "סובלני"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "סובל",
        "טעויות"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מבקר",
        "אחרים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מבקר",
        "כל",
        "הזמן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מזלזל",
        "באחרים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מוצא",
        "את",
        "הטוב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מוצא",
        "דבר",
        "טוב"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מוכן",
        "לפשרות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שחור",
        "ולבן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "הכול",
        "או",
        "כלום"
      ],
      "weight": 1
    },
    {
      "terms": [
        "קפדן"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רואה",
        "רק",
        "חסרונות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתעצבן",
        "מהתנהגות",
        "אחרים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מזלזל",
        "בדעות",
        "אחרות"
      ],
      "weight": 2
    }
  ],
  "rock_water": [
    {
      "terms": [
        "נוקשות",
        "עצמית"
      ],
      "weight": 3
    },
    {
      "terms": [
        "פרפקציוניסט"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מסרב",
        "להנאה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מחמיר",
        "עם",
        "עצמ"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מונע",
        "מעצמו",
        "הנאות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "להיות",
        "דוגמה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "שחור",
        "ולבן",
        "עם",
        "עצמ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מרשה",
        "לעצמו",
        "הנאה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חוקים",
        "נוקשים",
        "לעצמו"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מדוקדק",
        "מדי"
      ],
      "weight": 1
    },
    {
      "terms": [
        "מקפיד",
        "על",
        "עצמ"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חוקים",
        "קשוחים",
        "לעצמו"
      ],
      "weight": 1
    }
  ],
  "rescue_remedy": [
    {
      "terms": [
        "התקף",
        "פאניקה",
        "עכשיו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בהלם",
        "עכשיו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קרה",
        "הרגע"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מיד",
        "אחרי",
        "התאונה"
      ],
      "weight": 3
    },
    {
      "terms": [
        "זקוק",
        "למשהו",
        "מיידי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מצב",
        "חירום",
        "עכשיו"
      ],
      "weight": 3
    },
    {
      "terms": [
        "ממש",
        "עכשיו",
        "בהלם"
      ],
      "weight": 2
    }
  ]
};

  // ==========================================================================
  // C. שלילה (Negation)
  // ==========================================================================

  var NEGATION_MARKERS_LIST = [
  "אין",
  "אינה",
  "אינו",
  "איננו",
  "אף",
  "בלי",
  "בלתי",
  "לא",
  "ללא"
];
  var NEGATION_MARKERS = {};
  NEGATION_MARKERS_LIST.forEach(function (m) { NEGATION_MARKERS[m] = true; });

  function _patternIsNegationImmune(terms) {
    return terms.some(function (t) { return NEGATION_MARKERS.hasOwnProperty(t); });
  }

  function _isNegated(tokens, matchStart, terms) {
    if (_patternIsNegationImmune(terms)) return false;
    var start = Math.max(0, matchStart - 2);
    var context = tokens.slice(start, matchStart);
    return context.some(function (t) { return NEGATION_MARKERS.hasOwnProperty(t); });
  }

  // ==========================================================================
  // מנוע ההתאמה: איתור דפוסים בתוך רצף טוקנים, עם פער-מילוי של עד שני טוקנים
  // ==========================================================================

  function _findPatternMatches(tokens, terms) {
    var n = tokens.length;
    var matches = [];
    var i = 0;
    while (i < n) {
      if (_stemMatches(tokens[i], terms[0])) {
        var positions = [i];
        var cur = i;
        var ok = true;
        for (var t = 1; t < terms.length; t++) {
          var term = terms[t];
          var found = null;
          for (var gap = 1; gap <= 3; gap++) {
            var idx = cur + gap;
            if (idx < n && _stemMatches(tokens[idx], term)) { found = idx; break; }
          }
          if (found === null) { ok = false; break; }
          positions.push(found);
          cur = found;
        }
        if (ok) {
          matches.push([positions[0], positions[positions.length - 1] + 1]);
          i = positions[positions.length - 1] + 1;
          continue;
        }
      }
      i += 1;
    }
    return matches;
  }

  function _cuesPresent(tokens, cues) {
    for (var i = 0; i < tokens.length; i++) {
      for (var j = 0; j < cues.length; j++) {
        if (_stemMatches(tokens[i], cues[j])) return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // D. עדות וניקוד
  // ==========================================================================

  function _newEvidenceStore() {
    var store = {};
    ALL_KEYS.forEach(function (k) { store[k] = []; });
    return store;
  }

  function _record(evidence, rejected, key, weight, source, surface, topic) {
    var item = { weight: weight, source: source };
    if (surface !== undefined && surface !== null) item.surface = surface;
    if (topic !== undefined && topic !== null) item.topic = topic;
    evidence[key].push(item);
    if (weight >= 3 && rejected[key]) rejected[key] = false;
  }

  function _rejectKey(evidence, rejected, key, topic) {
    rejected[key] = true;
    evidence[key].push({ weight: 0, source: "rejected", topic: topic !== undefined ? topic : null });
  }

  function _scoreText(tokens, evidence, rejected, source) {
    ALL_KEYS.forEach(function (key) {
      LEXICON[key].forEach(function (pattern) {
        var terms = pattern.terms;
        _findPatternMatches(tokens, terms).forEach(function (range) {
          var start = range[0], end = range[1];
          if (_isNegated(tokens, start, terms)) return;
          var surface = tokens.slice(start, end).join(" ");
          _record(evidence, rejected, key, pattern.weight, source, surface, null);
        });
      });
    });
  }

  function _scores(evidence, rejected, excludeSources) {
    excludeSources = excludeSources || [];
    var result = {};
    ALL_KEYS.forEach(function (key) {
      if (rejected[key]) {
        result[key] = 0;
      } else {
        var sum = 0;
        evidence[key].forEach(function (item) {
          if (excludeSources.indexOf(item.source) === -1) sum += item.weight;
        });
        result[key] = sum;
      }
    });
    return result;
  }

  function _questionSelectionScores(evidence, rejected) {
    return _scores(evidence, rejected, ["confirmed_weak"]);
  }

  function _hasConfirmed(items) {
    return items.some(function (item) {
      return item.source === "confirmed" && item.weight >= QUALITY_GATE_MIN_SCORE;
    });
  }

  // ==========================================================================
  // E. שאלות הבהרה ופענוח תשובות
  // ==========================================================================

  var CLARIFYING_QUESTIONS = [
  {
    "id": "opening_group",
    "topic": "כיוון רגשי כללי",
    "opening": true,
    "kind": "choice",
    "text": "מה הרגש המרכזי שמעסיק את המטופל/ת כרגע: פחד וחרדה, התלבטות וחוסר ביטחון בקבלת החלטות, עצבות או עייפות מתמשכת, בדידות וקושי בקשר עם אחרים, נטייה להיות מושפע/ת יתר על המידה מהסביבה, ייאוש ותחושת אשמה, או צורך לשלוט בהתנהגות של אחרים ולשנות אותם?",
    "options": [
      {
        "keys": [
          "rock_rose",
          "mimulus",
          "cherry_plum",
          "aspen",
          "red_chestnut"
        ],
        "cues": [
          "פחד",
          "חרד",
          "פאניקה",
          "בהלה"
        ]
      },
      {
        "keys": [
          "cerato",
          "scleranthus",
          "gentian",
          "gorse",
          "hornbeam",
          "wild_oat"
        ],
        "cues": [
          "מתלבט",
          "להחליט",
          "ביטחון",
          "כיוון",
          "תקווה",
          "דחיינות"
        ]
      },
      {
        "keys": [
          "clematis",
          "honeysuckle",
          "wild_rose",
          "olive",
          "white_chestnut",
          "mustard",
          "chestnut_bud"
        ],
        "cues": [
          "עצוב",
          "עייף",
          "מנותק",
          "געגוע",
          "אדיש",
          "מחשבות",
          "דיכאון"
        ]
      },
      {
        "keys": [
          "water_violet",
          "impatiens",
          "heather"
        ],
        "cues": [
          "לבד",
          "בדיד",
          "סבלנות",
          "חברה"
        ]
      },
      {
        "keys": [
          "agrimony",
          "centaury",
          "walnut",
          "holly"
        ],
        "cues": [
          "מסתיר",
          "לסרב",
          "שינוי",
          "כעס",
          "קנאה"
        ]
      },
      {
        "keys": [
          "larch",
          "pine",
          "elm",
          "sweet_chestnut",
          "star_of_bethlehem",
          "willow",
          "oak",
          "crab_apple"
        ],
        "cues": [
          "ייאוש",
          "אשמה",
          "עומס",
          "הלם",
          "טראומה",
          "מרירות",
          "נחיתות"
        ]
      },
      {
        "keys": [
          "chicory",
          "vervain",
          "vine",
          "beech",
          "rock_water"
        ],
        "cues": [
          "שולט",
          "לשנות",
          "ביקורתי",
          "נוקש",
          "שתלטן",
          "תובעני"
        ]
      }
    ]
  },
  {
    "id": "mimulus_vs_aspen",
    "topic": "סוג הפחד",
    "kind": "choice",
    "text": "האם הפחד של המטופל/ת מתמקד במשהו ספציפי וידוע (למשל מבחן, מצב חברתי, חיה או מחלה מסוימת), או שמדובר בפחד מעורפל שאין לו מקור ברור?",
    "options": [
      {
        "keys": [
          "mimulus"
        ],
        "cues": [
          "מבחן",
          "בחינ",
          "חיה",
          "מחלה",
          "ספציפי",
          "ידוע",
          "מסוים"
        ]
      },
      {
        "keys": [
          "aspen"
        ],
        "cues": [
          "מעורפל",
          "סתמי",
          "ברור"
        ]
      }
    ]
  },
  {
    "id": "mimulus_vs_larch",
    "topic": "אופי החשש",
    "kind": "choice",
    "text": "כשעולה הפחד הזה אצל המטופל/ת - האם זה בעיקר פחד מהמצב או מהדבר עצמו, בעיקר ציפייה מראש לכישלון וחוסר ביטחון ביכולת, או שני הדברים יחד?",
    "options": [
      {
        "keys": [
          "mimulus"
        ],
        "cues": [
          "מהמצב",
          "מהמבחן",
          "מהחוויה"
        ]
      },
      {
        "keys": [
          "larch"
        ],
        "cues": [
          "כישלון",
          "לא מספיק טוב",
          "בטוח",
          "ייכשל",
          "תיכשל"
        ]
      }
    ]
  },
  {
    "id": "cerato_vs_scleranthus",
    "topic": "אופי חוסר הביטחון בהחלטות",
    "kind": "choice",
    "text": "האם המטופל/ת נוטה להתייעץ עם כולם ולא לסמוך על שיפוט עצמו, או שהקושי הוא בעיקר בהכרעה בין שתי אפשרויות עם תנודות מצב רוח?",
    "options": [
      {
        "keys": [
          "cerato"
        ],
        "cues": [
          "מתייעץ",
          "שואל",
          "כולם",
          "דעה",
          "אישור"
        ]
      },
      {
        "keys": [
          "scleranthus"
        ],
        "cues": [
          "מתלבט",
          "שתי",
          "אפשרויות",
          "להכריע"
        ]
      }
    ]
  },
  {
    "id": "gentian_gorse_sweetchestnut",
    "topic": "עומק הייאוש",
    "kind": "choice",
    "text": "האם מדובר בייאוש קל וזמני אחרי כישלון או מכשול נקודתי, בתחושת חוסר תקווה עמוקה וממושכת, או בייאוש קיצוני שמרגיש כמו קצה גבול היכולת הנפשית?",
    "options": [
      {
        "keys": [
          "gentian"
        ],
        "cues": [
          "קל",
          "זמני",
          "נקודתי",
          "כישלון"
        ]
      },
      {
        "keys": [
          "gorse"
        ],
        "cues": [
          "עמוק",
          "ממושך",
          "תקווה"
        ]
      },
      {
        "keys": [
          "sweet_chestnut"
        ],
        "cues": [
          "קיצוני",
          "קצה",
          "גבול"
        ]
      }
    ]
  },
  {
    "id": "olive_vs_hornbeam",
    "topic": "סוג העייפות",
    "kind": "choice",
    "text": "האם מדובר בתשישות פיזית ונפשית מוחלטת אחרי מאמץ או תקופה ממושכת וקשה, או בעייפות נפשית וחוסר חשק להתחיל משימות, שחולפת ברגע שמתחילים בפועל?",
    "options": [
      {
        "keys": [
          "olive"
        ],
        "cues": [
          "מוחלטת",
          "ממושכת",
          "פיזית"
        ]
      },
      {
        "keys": [
          "hornbeam"
        ],
        "cues": [
          "להתחיל",
          "דחיינות",
          "משימות"
        ]
      }
    ]
  },
  {
    "id": "elm_vs_oak",
    "topic": "עומס מול התמדה",
    "kind": "choice",
    "text": "האם מדובר בתחושת עומס זמנית מאחריות גדולה, אצל אדם שבדרך כלל מתפקד היטב, או בהתמדה עיקשת ללא ויתור וללא בקשת עזרה למרות תשישות מתמשכת?",
    "options": [
      {
        "keys": [
          "elm"
        ],
        "cues": [
          "עומס",
          "מוצף",
          "אחריות"
        ]
      },
      {
        "keys": [
          "oak"
        ],
        "cues": [
          "מוותר",
          "עזרה",
          "ממשיך",
          "מתמיד"
        ]
      }
    ]
  },
  {
    "id": "elm_vs_sweet_chestnut",
    "topic": "עומס מול ייאוש קיצוני",
    "kind": "choice",
    "text": "האם תחושת העומס היא זמנית ומצבית אצל אדם שבדרך כלל מסתדר היטב, או שמדובר בייאוש עמוק וממושך שמרגיש כמו קצה גבול היכולת?",
    "options": [
      {
        "keys": [
          "elm"
        ],
        "cues": [
          "זמני",
          "מצבי",
          "בדרך כלל מסתדר"
        ]
      },
      {
        "keys": [
          "sweet_chestnut"
        ],
        "cues": [
          "עמוק",
          "ממושך",
          "קצה",
          "גבול"
        ]
      }
    ]
  },
  {
    "id": "heather_vs_water_violet",
    "topic": "יחס לבדידות",
    "kind": "choice",
    "text": "האם המטופל/ת מעדיף/ה להתבודד ולשמור מרחק רגשי, או שהוא/היא זקוק/ה מאוד לתשומת לב וקשה לו/לה להיות לבד?",
    "options": [
      {
        "keys": [
          "water_violet"
        ],
        "cues": [
          "מעדיף",
          "לבד",
          "מרחק",
          "מסתגר"
        ]
      },
      {
        "keys": [
          "heather"
        ],
        "cues": [
          "תשומת",
          "לב",
          "זקוק",
          "לחברה"
        ]
      }
    ]
  },
  {
    "id": "impatiens_vs_vervain",
    "topic": "אופי חוסר המנוחה",
    "kind": "choice",
    "text": "האם יש חוסר סבלנות בולט וצורך למהר ולעשות הכול לבד, או שמדובר בהתלהבות יתר לרעיון או מטרה, עד כדי קושי להירגע ולוותר?",
    "options": [
      {
        "keys": [
          "impatiens"
        ],
        "cues": [
          "סבלנות",
          "ממהר",
          "מהר"
        ]
      },
      {
        "keys": [
          "vervain"
        ],
        "cues": [
          "התלהבות",
          "קנאי",
          "רעיון"
        ]
      }
    ]
  },
  {
    "id": "vine_vs_chicory",
    "topic": "אופי הצורך בשליטה",
    "kind": "choice",
    "text": "האם המטופל/ת נוטה להיות שתלטן/ית ולדרוש שאחרים ינהגו בדיוק כפי שנראה לו/לה נכון, או שהוא/היא נותן/ת אהבה ותמיכה תוך ציפייה מובלעת לקבל תשומת לב בתמורה?",
    "options": [
      {
        "keys": [
          "vine"
        ],
        "cues": [
          "שתלטן",
          "מכתיב",
          "רודני",
          "ציות"
        ]
      },
      {
        "keys": [
          "chicory"
        ],
        "cues": [
          "תובענית",
          "תשומת",
          "מתערב"
        ]
      }
    ]
  },
  {
    "id": "beech_vs_rock_water",
    "topic": "כיוון הביקורתיות",
    "kind": "choice",
    "text": "האם המטופל/ת ביקורתי/ת בעיקר כלפי אחרים וקשה לו/לה לקבל התנהגות שונה משלו/ה, או שהוא/היא נוקש/ה בעיקר כלפי עצמו/ה, פרפקציוניסט/ית, ומסרב/ת לאפשר לעצמו/ה הנאה או גמישות?",
    "options": [
      {
        "keys": [
          "beech"
        ],
        "cues": [
          "באחרים",
          "אחרים",
          "מבקר"
        ]
      },
      {
        "keys": [
          "rock_water"
        ],
        "cues": [
          "עצמו",
          "עצמה",
          "פרפקציוניסט",
          "מחמיר"
        ]
      }
    ]
  },
  {
    "id": "white_chestnut",
    "topic": "מחשבות טורדניות",
    "kind": "yesno",
    "keys": [
      "white_chestnut"
    ],
    "text": "האם יש מחשבות חוזרות וטורדניות שקשה להשתיק, במיוחד בשעות הלילה?"
  },
  {
    "id": "star_of_bethlehem",
    "topic": "רקע של הלם או טראומה",
    "kind": "yesno",
    "keys": [
      "star_of_bethlehem"
    ],
    "text": "האם יש רקע של אירוע מטלטל, הלם, אובדן או טראומה שעדיין משפיע על המטופל/ת?"
  },
  {
    "id": "walnut",
    "topic": "הסתגלות לשינוי",
    "kind": "yesno",
    "keys": [
      "walnut"
    ],
    "text": "האם מדובר בקושי להסתגל לשינוי או מעבר משמעותי בחיים (כגון גירושין, מעבר דירה, לידה או עבודה חדשה)?"
  },
  {
    "id": "pine",
    "topic": "אשמה עצמית",
    "kind": "yesno",
    "keys": [
      "pine"
    ],
    "text": "האם יש נטייה להאשים את עצמו/ה ולהתנצל, גם כשאין סיבה אמיתית לכך?"
  },
  {
    "id": "holly",
    "topic": "כעס וקנאה",
    "kind": "yesno",
    "keys": [
      "holly"
    ],
    "text": "האם עולים כעס, קנאה או חשדנות בולטים כלפי אחרים?"
  },
  {
    "id": "willow",
    "topic": "מרירות ותחושת עוול",
    "kind": "yesno",
    "keys": [
      "willow"
    ],
    "text": "האם יש תחושת מרירות, עוול, או האשמת הנסיבות והסביבה במצבו/ה?"
  },
  {
    "id": "agrimony",
    "topic": "הסתרת מצוקה",
    "kind": "yesno",
    "keys": [
      "agrimony"
    ],
    "text": "האם המטופל/ת נוטה להסתיר מצוקה מאחורי חיוך וחזות עליזה כלפי חוץ?"
  },
  {
    "id": "centaury",
    "topic": "קושי לסרב",
    "kind": "yesno",
    "keys": [
      "centaury"
    ],
    "text": "האם קשה למטופל/ת לסרב לבקשות של אחרים ולעמוד על שלו/ה?"
  },
  {
    "id": "red_chestnut",
    "topic": "דאגה לאנשים קרובים",
    "kind": "yesno",
    "keys": [
      "red_chestnut"
    ],
    "text": "האם הדאגה מופנית בעיקר כלפי אנשים קרובים (כמו ילדים או בן/בת זוג), יותר מאשר כלפי המטופל/ת עצמו/ה?"
  },
  {
    "id": "cherry_plum",
    "topic": "פחד מאיבוד שליטה",
    "kind": "yesno",
    "keys": [
      "cherry_plum"
    ],
    "text": "האם עולה חשש מאיבוד שליטה עצמית או ממחשבות שמפחידות את המטופל/ת בעצמו/ה?"
  },
  {
    "id": "clematis_vs_honeysuckle",
    "topic": "כיוון הבריחה מההווה",
    "kind": "choice",
    "text": "האם יש נטייה לברוח במחשבות אל העתיד ולהתנתק מההווה, לעומת קושי להשתחרר מזיכרונות וגעגוע לתקופה שחלפה?",
    "options": [
      {
        "keys": [
          "clematis"
        ],
        "cues": [
          "עתיד",
          "בעננים",
          "חולם"
        ]
      },
      {
        "keys": [
          "honeysuckle"
        ],
        "cues": [
          "עבר",
          "געגוע",
          "זיכרונות"
        ]
      }
    ]
  },
  {
    "id": "wild_rose_vs_mustard",
    "topic": "אדישות מול עצבות פתאומית",
    "kind": "choice",
    "text": "האם מדובר באדישות כללית וחוסר מוטיבציה מתמשך, או בעצבות/דיכאון שיורדים בפתאומיות ובלי סיבה ברורה, כמו ענן שחור?",
    "options": [
      {
        "keys": [
          "wild_rose"
        ],
        "cues": [
          "אדיש",
          "מתמשך",
          "מוטיבציה"
        ]
      },
      {
        "keys": [
          "mustard"
        ],
        "cues": [
          "פתאום",
          "ענן",
          "פתאומי"
        ]
      }
    ]
  },
  {
    "id": "crab_apple",
    "topic": "תחושת טומאה או פגם",
    "kind": "yesno",
    "keys": [
      "crab_apple"
    ],
    "text": "האם עולה תחושת גועל עצמי, אובססיה לניקיון, או התמקדות מוגזמת בפגם קטן?"
  },
  {
    "id": "chestnut_bud",
    "topic": "חזרה על אותה טעות",
    "kind": "yesno",
    "keys": [
      "chestnut_bud"
    ],
    "text": "האם המטופל/ת חוזר/ת שוב ושוב על אותה טעות או דפוס, בלי ללמוד מהניסיון?"
  },
  {
    "id": "wild_oat",
    "topic": "כיוון בחיים",
    "kind": "yesno",
    "keys": [
      "wild_oat"
    ],
    "text": "האם יש חוסר כיוון כללי בחיים, קושי לבחור דרך או מקצוע, למרות יכולות טובות?"
  },
  {
    "id": "rock_rose",
    "topic": "פאניקה או בהלה חריפה",
    "kind": "yesno",
    "keys": [
      "rock_rose"
    ],
    "text": "האם היו התקפי פאניקה או בהלה חריפה וקיצונית?"
  },
  {
    "id": "rescue_check",
    "topic": "משבר אקוטי",
    "kind": "yesno",
    "keys": [
      "rescue_remedy"
    ],
    "text": "האם מדובר במצב משבר אקוטי, הלם או פאניקה שקרו ממש עכשיו וזקוקים למענה מיידי?"
  }
];

  var QUESTION_BY_TEXT = {};
  CLARIFYING_QUESTIONS.forEach(function (q) { QUESTION_BY_TEXT[q.text] = q; });
  var QUESTION_ORDER = {};
  CLARIFYING_QUESTIONS.forEach(function (q, i) { QUESTION_ORDER[q.id] = i; });

  var CHALLENGE_PREFIX = "הערת המטפל/ת על ההרכב שהוצע:";

  var AFFIRMATIVE_LEAD_LIST = [
  "אכן",
  "בדיוק",
  "בהחלט",
  "יש",
  "כן",
  "מאוד",
  "ממש",
  "נכון"
];
  var NEGATIVE_LEAD_LIST = [
  "אין",
  "בכלל",
  "לא"
];
  var PARTIAL_LEAD_LIST = [
  "במידה",
  "חלקית",
  "לפעמים",
  "קצת"
];
  var ORDINAL_STEMS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי"
];

  function _toSet(list) {
    var o = {};
    list.forEach(function (x) { o[x] = true; });
    return o;
  }
  var AFFIRMATIVE_LEAD = _toSet(AFFIRMATIVE_LEAD_LIST);
  var NEGATIVE_LEAD = _toSet(NEGATIVE_LEAD_LIST);
  var PARTIAL_LEAD = _toSet(PARTIAL_LEAD_LIST);

  function _classifyYesno(tokens) {
    var head = tokens.slice(0, 3);
    if (head.some(function (t) { return NEGATIVE_LEAD.hasOwnProperty(t); })) return "no";
    if (head.some(function (t) { return PARTIAL_LEAD.hasOwnProperty(t); })) return "partial";
    if (head.some(function (t) { return AFFIRMATIVE_LEAD.hasOwnProperty(t); })) return "yes";
    return null;
  }

  function _ordinalIndex(tokens) {
    for (var i = 0; i < ORDINAL_STEMS.length; i++) {
      var stem = ORDINAL_STEMS[i];
      for (var j = 0; j < tokens.length; j++) {
        if (_stemMatches(tokens[j], stem)) return i;
      }
    }
    return null;
  }

  // מחזיר "both" / "none" / Set(indices) לא-ריק / null.
  function _classifyChoice(tokens, options) {
    var normText = tokens.join(" ");
    if (normText.indexOf("\u05D0\u05E3 \u05D0\u05D7\u05D3") !== -1 ||
        normText.indexOf("\u05DC\u05D0 \u05D6\u05D4 \u05D5\u05DC\u05D0 \u05D6\u05D4") !== -1) {
      return "none";
    }

    var gamCount = 0;
    tokens.forEach(function (t) { if (_stemMatches(t, "\u05D2\u05DD")) gamCount++; });
    var bothWord = tokens.some(function (t) { return _stemMatches(t, "\u05E9\u05E0\u05D9\u05D4\u05DD"); });
    if (gamCount >= 2 || bothWord) return "both";

    var ordinal = _ordinalIndex(tokens);
    if (ordinal !== null && ordinal < options.length) {
      var s = new Set();
      s.add(ordinal);
      return s;
    }

    var hits = new Set();
    options.forEach(function (opt, i) {
      if (_cuesPresent(tokens, opt.cues || [])) hits.add(i);
    });
    if (hits.size === 0) return null;
    return hits;
  }

  function _applyQuestionAnswer(question, ansTokens, evidence, rejected) {
    var topic = question.topic !== undefined ? question.topic : null;
    var isOpening = !!question.opening;
    var confirmWeight = isOpening ? 1 : 3;
    var confirmSource = isOpening ? "confirmed_weak" : "confirmed";

    if (question.kind === "yesno") {
      var verdict = _classifyYesno(ansTokens);
      if (verdict === "yes") {
        question.keys.forEach(function (k) { _record(evidence, rejected, k, confirmWeight, confirmSource, null, topic); });
      } else if (verdict === "no") {
        if (!isOpening) {
          question.keys.forEach(function (k) { _rejectKey(evidence, rejected, k, topic); });
        }
      } else if (verdict === "partial") {
        question.keys.forEach(function (k) { _record(evidence, rejected, k, 1, "answer", null, topic); });
      }
      return;
    }

    var options = question.options;
    var verdict2 = _classifyChoice(ansTokens, options);
    if (verdict2 === "none") {
      options.forEach(function (opt) { opt.keys.forEach(function (k) { _rejectKey(evidence, rejected, k, topic); }); });
      return;
    }
    if (verdict2 === "both") {
      options.forEach(function (opt) { opt.keys.forEach(function (k) { _record(evidence, rejected, k, confirmWeight, confirmSource, null, topic); }); });
      return;
    }
    if (verdict2 instanceof Set && verdict2.size > 0) {
      verdict2.forEach(function (idx) {
        options[idx].keys.forEach(function (k) { _record(evidence, rejected, k, confirmWeight, confirmSource, null, topic); });
      });
      if (verdict2.size === 1 && !isOpening) {
        options.forEach(function (opt, i) {
          if (!verdict2.has(i)) {
            opt.keys.forEach(function (k) { _rejectKey(evidence, rejected, k, topic); });
          }
        });
      }
      return;
    }
    // verdict2 === null: no clear choice - keyword scoring (done separately) is all we get.
  }

  function _questionKeys(q) {
    if (q.kind === "yesno") return new Set(q.keys);
    var result = new Set();
    q.options.forEach(function (opt) { opt.keys.forEach(function (k) { result.add(k); }); });
    return result;
  }

  // ==========================================================================
  // ניתוח מלא של תמליל השיחה
  // ==========================================================================

  function _analyze(initialDescription, transcript) {
    var evidence = _newEvidenceStore();
    var rejected = {};
    var askedTexts = new Set();

    var descTokens = tokenize(initialDescription);
    _scoreText(descTokens, evidence, rejected, "description");

    var pendingQuestion = null;
    transcript.forEach(function (entry) {
      var etype = entry.type;
      var text = entry.text || "";

      if (etype === "question") {
        askedTexts.add(text);
        pendingQuestion = QUESTION_BY_TEXT.hasOwnProperty(text) ? QUESTION_BY_TEXT[text] : null;
        return;
      }

      if (etype === "answer") {
        var isChallenge = text.indexOf(CHALLENGE_PREFIX) === 0;
        var ansText = isChallenge ? text.slice(CHALLENGE_PREFIX.length) : text;
        var ansTokens = tokenize(ansText);

        if (pendingQuestion !== null && !isChallenge) {
          _applyQuestionAnswer(pendingQuestion, ansTokens, evidence, rejected);
        }

        _scoreText(ansTokens, evidence, rejected, "answer");
        pendingQuestion = null;
        return;
      }

      pendingQuestion = null;
    });

    return { evidence: evidence, rejected: rejected, askedTexts: askedTexts };
  }

  // ==========================================================================
  // F. בחירת השאלה הבאה
  // ==========================================================================

  function _topCandidates(scores) {
    var items = [];
    ALL_KEYS.forEach(function (k) {
      if (scores[k] >= QUALIFY_MIN_SCORE) items.push([k, scores[k]]);
    });
    items.sort(function (a, b) {
      if (b[1] !== a[1]) return b[1] - a[1];
      return REMEDY_INDEX[a[0]] - REMEDY_INDEX[b[0]];
    });
    return items.slice(0, MAX_REMEDIES_IN_BLEND);
  }

  function _pickQuestion(scores, rejected, askedTexts, askedCount) {
    var top = _topCandidates(scores);

    var candidates = [];
    CLARIFYING_QUESTIONS.forEach(function (q) {
      if (askedTexts.has(q.text)) return;
      var keysOfQ = _questionKeys(q);
      if (keysOfQ.size > 0) {
        var allRejected = true;
        keysOfQ.forEach(function (k) { if (!rejected[k]) allRejected = false; });
        if (allRejected) return;
      }
      candidates.push(q);
    });

    if (candidates.length === 0) return null;

    function relevantAmong(pool) {
      var found = [];
      pool.forEach(function (q) {
        var keysOfQ = _questionKeys(q);
        var touched = top.filter(function (ks) { return keysOfQ.has(ks[0]); });
        if (touched.length > 0) {
          var maxScore = touched.reduce(function (m, ks) { return Math.max(m, ks[1]); }, -Infinity);
          var count = touched.length;
          found.push([q, maxScore, count]);
        }
      });
      found.sort(function (a, b) {
        if (b[1] !== a[1]) return b[1] - a[1];
        if (b[2] !== a[2]) return b[2] - a[2];
        return QUESTION_ORDER[a[0].id] - QUESTION_ORDER[b[0].id];
      });
      return found;
    }

    var nonOpening = candidates.filter(function (q) { return !q.opening; });
    var relevant = relevantAmong(nonOpening);
    if (relevant.length > 0) return relevant[0][0];

    var opening = candidates.filter(function (q) { return !!q.opening; });
    if (opening.length > 0) return opening[0];

    return null;
  }

  // ==========================================================================
  // H. בניית ההרכב הסופי (ללא מילוי מלאכותי - רק תמציות עם עדות)
  // ==========================================================================

  var NO_PATTERN_MESSAGE = "לא זוהה דפוס רגשי ברור מהמידע שנמסר. מומלץ להוסיף תמציות באופן ידני מתוך הרשימה המלאה באמצעות הכפתור \"+ הוסיפו תמצית נוספת\", ולשקול לאסוף מהמטופל/ת תיאור מפורט יותר בפגישה הבאה או בשיחת המשך.";

  function _chooseBlend(scores, rejected, evidence) {
    var chosen = ALL_KEYS.filter(function (k) {
      return !rejected[k] && (scores[k] >= QUALIFY_MIN_SCORE || _hasConfirmed(evidence[k]));
    });
    chosen.sort(function (a, b) {
      if (scores[b] !== scores[a]) return scores[b] - scores[a];
      return REMEDY_INDEX[a] - REMEDY_INDEX[b];
    });
    return chosen.slice(0, MAX_REMEDIES_IN_BLEND);
  }

  function _formatReason(key, items) {
    var flower = BY_KEY[key];
    var quotes = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if ((item.source === "description" || item.source === "answer") && item.surface) {
        if (quotes.indexOf(item.surface) === -1) quotes.push(item.surface);
        if (quotes.length >= 4) break;
      }
    }

    var topics = [];
    items.forEach(function (item) {
      if (item.source === "confirmed" && item.topic && topics.indexOf(item.topic) === -1) {
        topics.push(item.topic);
      }
    });

    var parts = [flower.keynote];
    if (quotes.length) {
      var quoted = quotes.join("', '");
      parts.push("\u05D1\u05D3\u05D1\u05E8\u05D9 \u05D4\u05DE\u05D8\u05D5\u05E4\u05DC/\u05EA \u05E2\u05DC\u05D5 \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9\u05D9\u05DD: '" + quoted + "'.");
    }
    if (topics.length) {
      var topicsStr = topics.join(", ");
      parts.push("\u05D0\u05D5\u05E9\u05E8 \u05D1\u05EA\u05E9\u05D5\u05D1\u05D4 \u05DC\u05E9\u05D0\u05DC\u05D4 \u05E2\u05DC " + topicsStr + ".");
    }
    return parts.join(" ");
  }

  function _buildGeneralNotes(chosen, evidence, rejected) {
    var groupOrder = [];
    var groups = {};
    chosen.forEach(function (k) {
      var g = BY_KEY[k].group_he;
      if (!groups.hasOwnProperty(g)) { groups[g] = []; groupOrder.push(g); }
      groups[g].push(k);
    });

    var clauses = groupOrder.map(function (groupName) {
      var keys = groups[groupName];
      var names = keys.map(function (k) { return BY_KEY[k].name_he; }).join(" \u05D5");
      var terms = [];
      keys.forEach(function (k) {
        evidence[k].forEach(function (item) {
          if ((item.source === "description" || item.source === "answer") && item.surface) {
            if (terms.indexOf(item.surface) === -1) terms.push(item.surface);
          }
        });
      });
      var clause = "\u05DC" + names + " \u05D4\u05EA\u05D0\u05DE\u05D4 \u05D1\u05E7\u05D1\u05D5\u05E6\u05EA " + groupName;
      if (terms.length) {
        var termsStr = terms.slice(0, 6).join("', '");
        clause += ", \u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9\u05D9\u05DD '" + termsStr + "'";
      }
      return clause;
    });

    var paragraph = clauses.length ? (clauses.join("; ") + ".") : "";

    var rejectedWithEvidence = ALL_KEYS.filter(function (k) {
      return rejected[k] && evidence[k].some(function (item) { return item.weight > 0; });
    });
    rejectedWithEvidence.sort(function (a, b) { return REMEDY_INDEX[a] - REMEDY_INDEX[b]; });
    if (rejectedWithEvidence.length) {
      var names2 = rejectedWithEvidence.map(function (k) { return BY_KEY[k].name_he; }).join(", ");
      paragraph += " \u05E0\u05D1\u05D3\u05E7 \u05D5\u05E0\u05E9\u05DC\u05DC: " + names2 + ".";
    }

    return paragraph.trim();
  }

  function _buildRemedyEntries(chosen, evidence) {
    return chosen.map(function (key) {
      var flower = BY_KEY[key];
      return {
        key: key,
        name_he: flower.name_he,
        name_en: flower.name_en,
        reason: _formatReason(key, evidence[key]),
      };
    });
  }

  function _finalize(scores, rejected, evidence) {
    var chosen = _chooseBlend(scores, rejected, evidence);
    if (chosen.length === 0) {
      return {
        type: "proposal",
        remedies: [],
        general_notes: NO_PATTERN_MESSAGE,
        usage_instructions: _usageInstructionsText(),
      };
    }

    var remedies = _buildRemedyEntries(chosen, evidence);
    var generalNotes = _buildGeneralNotes(chosen, evidence, rejected);

    return {
      type: "proposal",
      remedies: remedies,
      general_notes: generalNotes,
      usage_instructions: _usageInstructionsText(),
    };
  }

  function _usageInstructionsText() {
    return "\u05D4\u05DB\u05D9\u05E0\u05D5 \u05D1\u05E7\u05D1\u05D5\u05E7\u05D5\u05DF (30 \u05DE\u05F4\u05DC) \u05E2\u05DD \u05DE\u05D9\u05DD \u05DE\u05D9\u05E0\u05E8\u05DC\u05D9\u05D9\u05DD, \u05D5\u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 2 \u05D8\u05D9\u05E4\u05D5\u05EA \u05DE\u05DB\u05DC \u05EA\u05DE\u05E6\u05D9\u05EA \u05E9\u05E0\u05D1\u05D7\u05E8\u05D4. " +
      "\u05D9\u05E9 \u05DC\u05D9\u05D8\u05D5\u05DC 4 \u05D8\u05D9\u05E4\u05D5\u05EA \u05DE\u05D4\u05EA\u05E2\u05E8\u05D5\u05D1\u05EA \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DE\u05D4\u05D1\u05E7\u05D1\u05D5\u05E7\u05D5\u05DF, 4 \u05E4\u05E2\u05DE\u05D9\u05DD \u05D1\u05D9\u05D5\u05DD (\u05E0\u05D9\u05EA\u05DF \u05D2\u05DD \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D0\u05D5\u05DB\u05DC). " +
      "\u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D4\u05E2\u05E8\u05D9\u05DA \u05DE\u05D7\u05D3\u05E9 \u05D0\u05EA \u05D4\u05D4\u05E8\u05DB\u05D1 \u05DC\u05D0\u05D7\u05E8 \u05DB-3-4 \u05E9\u05D1\u05D5\u05E2\u05D5\u05EA.";
  }

  // ==========================================================================
  // API ציבורי
  // ==========================================================================

  function next_step(initialDescription, historyContext, transcript) {
    var analyzed = _analyze(initialDescription, transcript);
    var evidence = analyzed.evidence, rejected = analyzed.rejected, askedTexts = analyzed.askedTexts;
    var scores = _scores(evidence, rejected, []);
    var askedCount = transcript.filter(function (e) { return e.type === "question"; }).length;

    if (askedCount >= MAX_QUESTIONS) {
      return _finalize(scores, rejected, evidence);
    }

    var questionScores = _questionSelectionScores(evidence, rejected);
    var question = _pickQuestion(questionScores, rejected, askedTexts, askedCount);
    if (question === null) {
      return _finalize(scores, rejected, evidence);
    }

    return { type: "question", text: question.text };
  }

  var QUESTION_MARKERS = [
  "למה",
  "מדוע",
  "מה הסיבה",
  "על שום מה"
];

  function explain_if_asked(message, currentRemedies) {
    if (!currentRemedies || !currentRemedies.length) return null;
    if (!QUESTION_MARKERS.some(function (marker) { return message.indexOf(marker) !== -1; })) return null;

    var lowerMsg = message.toLowerCase();
    var mentioned = currentRemedies.filter(function (r) {
      return message.indexOf(r.name_he) !== -1 || lowerMsg.indexOf(r.name_en.toLowerCase()) !== -1;
    });
    if (!mentioned.length) return null;

    var parts = mentioned.map(function (r) { return r.name_he + " (" + r.name_en + "): " + r.reason; });
    return "\u05EA\u05E9\u05D5\u05D1\u05D4 \u05DC\u05E9\u05D0\u05DC\u05EA\u05DB\u05DD \u05E2\u05DC \u05D4\u05D4\u05E8\u05DB\u05D1:\n\n" + parts.join("\n\n");
  }

  function has_signal(text) {
    var tokens = tokenize(text);
    if (tokens.length === 0) return false;
    for (var ki = 0; ki < ALL_KEYS.length; ki++) {
      var key = ALL_KEYS[ki];
      var patterns = LEXICON[key];
      for (var pi = 0; pi < patterns.length; pi++) {
        var terms = patterns[pi].terms;
        var matches = _findPatternMatches(tokens, terms);
        for (var mi = 0; mi < matches.length; mi++) {
          var start = matches[mi][0];
          if (!_isNegated(tokens, start, terms)) return true;
        }
      }
    }
    return false;
  }

  function build_history_context(pastSessions) {
    var saved = pastSessions.filter(function (s) { return s.status === "saved" && s.final_remedies; });
    if (!saved.length) return "";

    var lines = ["\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05DE\u05E4\u05D2\u05E9\u05D9\u05DD \u05E7\u05D5\u05D3\u05DE\u05D9\u05DD \u05E2\u05DD \u05DE\u05D8\u05D5\u05E4\u05DC \u05D6\u05D4:"];
    saved.forEach(function (s) {
      var names = s.final_remedies.map(function (r) { return r.name_he; }).join(", ");
      lines.push("- \u05DE\u05E4\u05D2\u05E9 \u05DE\u05EA\u05D0\u05E8\u05D9\u05DA " + s.created_at.slice(0, 10) + ": \u05D4\u05E8\u05DB\u05D1 \u05E9\u05E0\u05D9\u05EA\u05DF - " + names + ".");
      if (s.practitioner_notes) {
        lines.push("  \u05D4\u05E2\u05E8\u05D5\u05EA \u05D4\u05DE\u05D8\u05E4\u05DC/\u05EA: " + s.practitioner_notes);
      }
    });
    return lines.join("\n");
  }

  var api = {
    MIN_QUESTIONS: MIN_QUESTIONS,
    MAX_QUESTIONS: MAX_QUESTIONS,
    MAX_REMEDIES_IN_BLEND: MAX_REMEDIES_IN_BLEND,
    QUALIFY_MIN_SCORE: QUALIFY_MIN_SCORE,
    QUALITY_GATE_MIN_SCORE: QUALITY_GATE_MIN_SCORE,
    REMEDY_ORDER: REMEDY_ORDER,
    ALL_KEYS: ALL_KEYS,
    LEXICON: LEXICON,
    CLARIFYING_QUESTIONS: CLARIFYING_QUESTIONS,
    QUESTION_BY_TEXT: QUESTION_BY_TEXT,
    next_step: next_step,
    explain_if_asked: explain_if_asked,
    has_signal: has_signal,
    build_history_context: build_history_context,
    // חשופים גם לצורך בדיקות פנימיות (מקביל ל-engine._analyze וכו' בפייתון)
    tokenize: tokenize,
    _analyze: _analyze,
    _questionKeys: _questionKeys,
    _scores: _scores,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.engine = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
