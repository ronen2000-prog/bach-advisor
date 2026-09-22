// מנוע ההתאמה של יועץ התמציות - פורט נאמן של backend/advisor_engine.py
// (הגרסה עם שאלון מובנה multi-select): 7 קבוצות באך, שאלת-המשך אחת פר קבוצה
// שנבחרה, הלקסיקון העשיר משמש רק לסימון "suggested" מראש/ציטוט/הוספה
// בערעור (challenge add-mode), וטיפול בתמלילים legacy (מגרסאות קודמות בלי
// question_id).
//
// כל מבני הנתונים (LEXICON, GROUPS, REMEDY_LABELS וכו') יוצאו ישירות מהמודול
// הפייתוני המקורי כדי להבטיח התאמה מדויקת של כל מחרוזת עברית, כל משקל וכל
// סדר - בלי הקלדה ידנית.
(function (global) {
  "use strict";

  var isNode = typeof module !== "undefined" && module.exports;
  var flowersMod = isNode ? require("./bach-flowers.js") : (global.BachApp && global.BachApp.flowers);
  var BY_KEY = flowersMod.BY_KEY;

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
  // B. הלקסיקון - דפוסים עשירים לכל תמצית (יוצא מ-Python)
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

  // ==========================================================================
  // D. עדות וניקוד
  // ==========================================================================

  function _newEvidenceStore() {
    var store = {};
    ALL_KEYS.forEach(function (k) { store[k] = []; });
    return store;
  }

  function _record(evidence, key, weight, source, surface) {
    var item = { weight: weight, source: source };
    if (surface !== undefined && surface !== null) item.surface = surface;
    evidence[key].push(item);
  }

  function _scoreText(tokens, evidence, source) {
    ALL_KEYS.forEach(function (key) {
      LEXICON[key].forEach(function (pattern) {
        var terms = pattern.terms;
        _findPatternMatches(tokens, terms).forEach(function (range) {
          var start = range[0], end = range[1];
          if (_isNegated(tokens, start, terms)) return;
          var surface = tokens.slice(start, end).join(" ");
          _record(evidence, key, pattern.weight, source, surface);
        });
      });
    });
  }

  function _scores(evidence) {
    var result = {};
    ALL_KEYS.forEach(function (key) {
      var sum = 0;
      evidence[key].forEach(function (item) { sum += item.weight; });
      result[key] = sum;
    });
    return result;
  }

  function _matchedSurfaces(items, limit) {
    if (limit === undefined) limit = 4;
    var quotes = [];
    for (var i = 0; i < items.length; i++) {
      var surface = items[i].surface;
      if (surface && quotes.indexOf(surface) === -1) quotes.push(surface);
      if (quotes.length >= limit) break;
    }
    return quotes;
  }

  // ==========================================================================
  // E. שאלון מובנה - 7 קבוצות באך, ואז שאלת-משנה אחת פר קבוצה שנבחרה
  // ==========================================================================

  var SUGGEST_MIN_SCORE = 2;
  var SOFT_BLEND_SIZE_NOTE_THRESHOLD = 6;

  var GROUPS = [
  {
    "id": "fear",
    "group_he": "פחד",
    "label": "פחד וחרדה - פחדים ספציפיים, חרדה מעורפלת, פאניקה או דאגת יתר לאחרים",
    "keys": [
      "rock_rose",
      "mimulus",
      "cherry_plum",
      "aspen",
      "red_chestnut"
    ],
    "extra_keys": [
      "rescue_remedy"
    ]
  },
  {
    "id": "uncertainty",
    "group_he": "חוסר ודאות",
    "label": "חוסר ודאות - קושי להחליט, חוסר ביטחון בשיפוט עצמי, ייאוש מהיר מכישלון",
    "keys": [
      "cerato",
      "scleranthus",
      "gentian",
      "gorse",
      "hornbeam",
      "wild_oat"
    ]
  },
  {
    "id": "interest",
    "group_he": "חוסר עניין בהווה",
    "label": "חוסר עניין בהווה - עצבות, שעמום, עייפות, מחשבות טורדניות או געגוע לעבר",
    "keys": [
      "clematis",
      "honeysuckle",
      "wild_rose",
      "olive",
      "white_chestnut",
      "mustard",
      "chestnut_bud"
    ]
  },
  {
    "id": "loneliness",
    "group_he": "בדידות",
    "label": "בדידות - העדפת בדידות, או לחלופין קושי להיות לבד וחוסר סבלנות",
    "keys": [
      "water_violet",
      "impatiens",
      "heather"
    ]
  },
  {
    "id": "oversensitive",
    "group_he": "רגישות יתר להשפעה",
    "label": "רגישות יתר להשפעה - קושי לסרב, הסתרת מצוקה, קושי בשינויים, כעס",
    "keys": [
      "agrimony",
      "centaury",
      "walnut",
      "holly"
    ]
  },
  {
    "id": "despondency",
    "group_he": "ייאוש וייסורים",
    "label": "ייאוש וייסורים - אשמה, חוסר ביטחון עצמי, עומס, הלם, מרירות או תשישות קשה",
    "keys": [
      "larch",
      "pine",
      "elm",
      "sweet_chestnut",
      "star_of_bethlehem",
      "willow",
      "oak",
      "crab_apple"
    ]
  },
  {
    "id": "overcare",
    "group_he": "דאגת יתר לזולת",
    "label": "דאגת יתר לזולת - צורך לשלוט, ביקורתיות, נוקשות עצמית, התלהבות יתר",
    "keys": [
      "chicory",
      "vervain",
      "vine",
      "beech",
      "rock_water"
    ]
  }
];

  var GROUP_BY_ID = {};
  GROUPS.forEach(function (g) { GROUP_BY_ID[g.id] = g; });
  var GROUP_ORDER = {};
  GROUPS.forEach(function (g, i) { GROUP_ORDER[g.id] = i; });

  var NONE_OPTION_LABEL = "אף אחד מאלה";

  var REMEDY_LABELS = {
  "rock_rose": "פאניקה, בהלה או אימה עזה במצב חירום נפשי",
  "mimulus": "פחד ממשהו מוגדר ומוכר (מבחן, מחלה, חיות, חושך), ביישנות",
  "cherry_plum": "פחד לאבד שליטה עצמית, מחשבות או דחפים שמפחידים",
  "aspen": "פחד או חרדה מעורפלים, בלי מקור ברור",
  "red_chestnut": "דאגת יתר לשלום אנשים קרובים (ילדים, בן/בת זוג)",
  "rescue_remedy": "מצב חירום או הלם אקוטי שקרה ממש עכשיו",
  "cerato": "לא סומך/ת על שיפוט עצמו/ה, מתייעץ/ת עם כולם לפני החלטה",
  "scleranthus": "מתלבט/ת בין שתי אפשרויות, קשה להכריע, תנודות מצב רוח",
  "gentian": "מתייאש/ת בקלות אחרי כישלון או מכשול נקודתי",
  "gorse": "תחושת חוסר תקווה עמוקה, ויתור על סיכוי לשיפור",
  "hornbeam": "עייפות נפשית וחוסר חשק להתחיל, שחולפת ברגע שמתחילים",
  "wild_oat": "חוסר כיוון כללי בחיים, קושי לבחור דרך או מקצוע",
  "clematis": "מנותק/ת מההווה, חולמני/ת, בורח/ת למחשבות על העתיד",
  "honeysuckle": "געגוע לעבר, קושי להשתחרר מזיכרונות",
  "wild_rose": "אדישות, חוסר מוטיבציה, השלמה פסיבית עם המצב",
  "olive": "תשישות פיזית ונפשית מוחלטת אחרי מאמץ ממושך",
  "white_chestnut": "מחשבות טורדניות וחוזרות שקשה להשתיק, בעיקר בלילה",
  "mustard": "עצבות או דיכאון שיורדים בפתאומיות בלי סיבה ברורה",
  "chestnut_bud": "חזרה על אותה טעות, קושי ללמוד מהניסיון",
  "water_violet": "מעדיף/ה להיות לבד, מסתגר/ת, קושי לשתף ברגשות",
  "impatiens": "חוסר סבלנות, ממהר/ת, מעדיף/ה לעשות הכול לבד ומהר",
  "heather": "צורך עז בתשומת לב, קושי להיות לבד",
  "agrimony": "מסתיר/ה מצוקה מאחורי חיוך וחזות עליזה",
  "centaury": "קושי לסרב, כניעות יתר לרצון אחרים על חשבון הצרכים העצמיים",
  "walnut": "קושי להסתגל לשינוי או מעבר משמעותי בחיים",
  "holly": "כעס, קנאה או חשדנות כלפי אחרים",
  "larch": "חוסר ביטחון עצמי, ציפייה מראש לכישלון",
  "pine": "אשמה עצמית מוגזמת, נטייה להתנצל גם כשלא אשם/ה",
  "elm": "עומס רגעי מאחריות גדולה, אצל אדם שבדרך כלל מתפקד היטב",
  "sweet_chestnut": "ייאוש קיצוני, תחושת מיצוי מוחלט, קצה גבול היכולת",
  "star_of_bethlehem": "הלם או טראומה, גם כאלה שהשפעתם נמשכת זמן רב",
  "willow": "מרירות, תחושת קורבנות ועוול, קושי לקחת אחריות",
  "oak": "התמדה עד כלות הכוחות, קושי לוותר או לבקש עזרה",
  "crab_apple": "תחושת גועל או טומאה עצמית, אובססיה לניקיון או לפרט קטן",
  "chicory": "אהבה תובענית, ציפייה לתשומת לב בתמורה לנתינה",
  "vervain": "התלהבות יתר לרעיון או מטרה, קושי להירגע ולוותר",
  "vine": "שליטנות, נוקשות, צורך להכתיב לאחרים כיצד לנהוג",
  "beech": "ביקורתיות, חוסר סובלנות לחולשות ולשונות של אחרים",
  "rock_water": "נוקשות עצמית קיצונית, פרפקציוניזם, סירוב להנאה"
};

  var GROUP_QUESTION_ID = "groups";
  var GROUP_QUESTION_TEXT = "אילו תחומים רגשיים בולטים אצל המטופל/ת? אפשר לסמן כמה";

  function _groupQuestionId(groupId) {
    return "group_" + groupId;
  }

  function _groupDescScore(group, descScores) {
    var keys = group.keys.concat(group.extra_keys || []);
    var scores = keys.map(function (k) { return descScores[k] || 0; });
    return scores.length ? Math.max.apply(null, scores) : 0;
  }

  function _buildGroupQuestion(descScores) {
    var options = GROUPS.map(function (g) {
      return { id: g.id, label: g.label, suggested: _groupDescScore(g, descScores) >= SUGGEST_MIN_SCORE };
    });
    return { question_id: GROUP_QUESTION_ID, text: GROUP_QUESTION_TEXT, multi: true, options: options };
  }

  function _buildGroupRemedyQuestion(group, descScores) {
    var keys = group.keys.concat(group.extra_keys || []);
    var options = keys.map(function (k) {
      return { id: k, label: REMEDY_LABELS[k], suggested: (descScores[k] || 0) >= SUGGEST_MIN_SCORE };
    });
    options.push({ id: "none", label: NONE_OPTION_LABEL, suggested: false });
    var groupName = group.label.split(" - ")[0];
    var text = "\u05D1\u05EA\u05D7\u05D5\u05DD \u05E9\u05DC " + groupName + ": \u05DE\u05D4 \u05DE\u05EA\u05D5\u05DA \u05D4\u05D1\u05D0\u05D9\u05DD \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DE\u05D8\u05D5\u05E4\u05DC/\u05EA?";
    return { question_id: _groupQuestionId(group.id), text: text, multi: true, options: options };
  }

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
  var NONE_WORDS_SUBSTRINGS = [
  "אף אחד",
  "לא זה ולא זה",
  "none"
];
  var ORDINAL_STEMS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שביעי",
  "שמיני",
  "תשיעי",
  "עשירי"
];

  function _toSet(list) {
    var o = {};
    list.forEach(function (x) { o[x] = true; });
    return o;
  }
  var AFFIRMATIVE_LEAD = _toSet(AFFIRMATIVE_LEAD_LIST);
  var NEGATIVE_LEAD = _toSet(NEGATIVE_LEAD_LIST);

  function _classifyYesno(tokens) {
    var head = tokens.slice(0, 3);
    if (head.some(function (t) { return NEGATIVE_LEAD.hasOwnProperty(t); })) return "no";
    if (head.some(function (t) { return AFFIRMATIVE_LEAD.hasOwnProperty(t); })) return "yes";
    return null;
  }

  function _mentionsNone(rawTextLower) {
    return NONE_WORDS_SUBSTRINGS.some(function (sub) { return rawTextLower.indexOf(sub) !== -1; });
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

  // מפענח תשובה לשאלת multi-select: קודם מנסים התאמה מדויקת שורה-שורה מול
  // התוויות של האפשרויות. אם אין אף התאמת-לייבל, נופלים חזרה על טקסט חופשי.
  // מחזיר {ids: [...], extraText: "..."}.
  function _parseMultiselectAnswer(rawText, question) {
    var options = question.options;
    var labelToId = {};
    options.forEach(function (opt) { labelToId[opt.label] = opt.id; });

    var lines = rawText.split("\n").map(function (ln) { return ln.trim(); }).filter(function (ln) { return ln; });
    var matchedIds = [];
    var noteParts = [];
    var unmatchedLines = [];

    lines.forEach(function (line) {
      if (line.indexOf("\u05D4\u05E2\u05E8\u05D4:") === 0) {
        noteParts.push(line.slice("\u05D4\u05E2\u05E8\u05D4:".length).trim());
        return;
      }
      if (labelToId.hasOwnProperty(line)) {
        var oid = labelToId[line];
        if (matchedIds.indexOf(oid) === -1) matchedIds.push(oid);
      } else {
        unmatchedLines.push(line);
      }
    });

    if (matchedIds.length) {
      matchedIds = matchedIds.filter(function (i) { return i !== "none"; });
      var extraText = unmatchedLines.concat(noteParts).join(" ");
      return { ids: matchedIds, extraText: extraText };
    }

    var fullText = rawText.trim();
    var tokens = tokenize(fullText);
    if (!tokens.length) return { ids: [], extraText: "" };

    if (_mentionsNone(fullText.toLowerCase())) {
      return { ids: [], extraText: fullText };
    }

    var verdict = _classifyYesno(tokens);
    if (verdict === "yes") {
      var ids = options.filter(function (opt) { return opt.suggested; }).map(function (opt) { return opt.id; });
      return { ids: ids, extraText: fullText };
    }
    if (verdict === "no") {
      return { ids: [], extraText: fullText };
    }

    var ev = _newEvidenceStore();
    _scoreText(tokens, ev, "answer");
    var scores = _scores(ev);
    var matched2 = options.filter(function (opt) {
      return opt.id !== "none" && (scores[opt.id] || 0) >= SUGGEST_MIN_SCORE;
    }).map(function (opt) { return opt.id; });

    var ordinal = _ordinalIndex(tokens);
    if (ordinal !== null && ordinal < options.length) {
      var oid2 = options[ordinal].id;
      if (oid2 !== "none" && matched2.indexOf(oid2) === -1) matched2.push(oid2);
    }

    return { ids: matched2, extraText: fullText };
  }

  // ==========================================================================
  // שחזור מצב השאלון מהתמליל, וזיהוי תמליל "legacy"
  // ==========================================================================

  function _lastQuestionEntry(transcript) {
    for (var i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].type === "question") return transcript[i];
    }
    return null;
  }

  function _isLegacyTranscript(transcript) {
    var lastQ = _lastQuestionEntry(transcript);
    if (lastQ === null) return false;
    return !lastQ.question_id;
  }

  function _firstProposalIndex(transcript) {
    for (var i = 0; i < transcript.length; i++) {
      if (transcript[i].type === "proposal") return i;
    }
    return null;
  }

  function _replayStructured(transcript) {
    var groupSelection = null;
    var groupAnswers = {};
    var freeText = [];
    var pendingQuestion = null;

    transcript.forEach(function (entry) {
      var etype = entry.type;
      var text = entry.text || "";

      if (etype === "question") {
        pendingQuestion = entry;
        return;
      }

      if (etype === "answer") {
        if (text.indexOf(CHALLENGE_PREFIX) === 0) {
          pendingQuestion = null;
          return;
        }
        if (pendingQuestion !== null && pendingQuestion.options) {
          var parsed = _parseMultiselectAnswer(text, pendingQuestion);
          if (parsed.extraText) freeText.push(parsed.extraText);
          var qid = pendingQuestion.question_id;
          if (qid === GROUP_QUESTION_ID) {
            groupSelection = parsed.ids;
          } else if (qid && qid.indexOf("group_") === 0) {
            groupAnswers[qid.slice("group_".length)] = parsed.ids;
          }
        } else if (text) {
          freeText.push(text);
        }
        pendingQuestion = null;
        return;
      }

      pendingQuestion = null;
    });

    return { groupSelection: groupSelection, groupAnswers: groupAnswers, freeText: freeText };
  }

  function _orderedSelectedGroups(groupSelection, descScores) {
    var seen = {};
    var unique = [];
    groupSelection.forEach(function (gid) {
      if (GROUP_BY_ID.hasOwnProperty(gid) && !seen[gid]) {
        seen[gid] = true;
        unique.push(gid);
      }
    });
    unique.sort(function (a, b) {
      var sa = _groupDescScore(GROUP_BY_ID[a], descScores);
      var sb = _groupDescScore(GROUP_BY_ID[b], descScores);
      if (sb !== sa) return sb - sa;
      return GROUP_ORDER[a] - GROUP_ORDER[b];
    });
    return unique;
  }

  function _descriptionScores(initialDescription, extraFreeText) {
    var evidence = _newEvidenceStore();
    _scoreText(tokenize(initialDescription), evidence, "description");
    (extraFreeText || []).forEach(function (snippet) {
      _scoreText(tokenize(snippet), evidence, "answer");
    });
    return _scores(evidence);
  }

  // ==========================================================================
  // בניית ההרכב הסופי מהבחירות המובנות - בדיוק מה שסומן, בלי חיתוך
  // ==========================================================================

  var NO_PATTERN_MESSAGE = "לא זוהה דפוס רגשי ברור מהמידע שנמסר. מומלץ להוסיף תמציות באופן ידני מתוך הרשימה המלאה באמצעות הכפתור \"+ הוסיפו תמצית נוספת\", ולשקול לאסוף מהמטופל/ת תיאור מפורט יותר בפגישה הבאה או בשיחת המשך.";

  function _formatStructuredReason(key, checkedByPractitioner, evidenceItems) {
    var flower = BY_KEY[key];
    var parts = [flower.keynote];
    if (checkedByPractitioner) {
      parts.push("\u05E1\u05D5\u05DE\u05DF/\u05D4 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05DE\u05D8\u05E4\u05DC/\u05EA \u05D1\u05E9\u05D0\u05DC\u05D5\u05DF.");
    }
    var quotes = _matchedSurfaces(evidenceItems);
    if (quotes.length) {
      var quoted = quotes.join("', '");
      parts.push("\u05D1\u05EA\u05D9\u05D0\u05D5\u05E8 \u05E2\u05DC\u05D5 \u05D4\u05D1\u05D9\u05D8\u05D5\u05D9\u05D9\u05DD: '" + quoted + "'.");
    }
    return parts.join(" ");
  }

  function _buildGeneralNotesStructured(chosen, evidence, addedByChallenge) {
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
        _matchedSurfaces(evidence[k], 6).forEach(function (term) {
          if (terms.indexOf(term) === -1) terms.push(term);
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

    if (chosen.length > SOFT_BLEND_SIZE_NOTE_THRESHOLD) {
      paragraph += " \u05D4\u05D4\u05E8\u05DB\u05D1 \u05DB\u05D5\u05DC\u05DC " + chosen.length + " \u05EA\u05DE\u05E6\u05D9\u05D5\u05EA - \u05D1\u05E4\u05E8\u05E7\u05D8\u05D9\u05E7\u05D4 \u05E9\u05DC \u05D1\u05D0\u05DA \u05E0\u05D4\u05D5\u05D2 \u05D1\u05D3\u05E8\u05DA \u05DB\u05DC\u05DC \u05E2\u05D3 6-7 \u05EA\u05DE\u05E6\u05D9\u05D5\u05EA \u05D1\u05D4\u05E8\u05DB\u05D1 \u05D0\u05D7\u05D3, \u05D5\u05DB\u05D3\u05D0\u05D9 \u05DC\u05E9\u05E7\u05D5\u05DC \u05DC\u05EA\u05E2\u05D3\u05E3 \u05D0\u05EA \u05D4\u05DE\u05E8\u05DB\u05D6\u05D9\u05D5\u05EA \u05E9\u05D1\u05D4\u05DF.";
    }

    if (addedByChallenge && addedByChallenge.length) {
      var addedParts = addedByChallenge.map(function (k) {
        var surfaces = _matchedSurfaces(evidence[k], 3);
        var name = BY_KEY[k].name_he;
        if (surfaces.length) {
          return name + " (\u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 '" + surfaces.join(", ") + "')";
        }
        return name;
      });
      paragraph += " \u05D1\u05E2\u05E7\u05D1\u05D5\u05EA \u05D4\u05D4\u05E2\u05E8\u05D4 \u05D4\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4 \u05E0\u05D5\u05E1\u05E4\u05D5 \u05DC\u05D4\u05E8\u05DB\u05D1: " + addedParts.join("; ") + ".";
    }

    return paragraph.trim();
  }

  function _finalizeStructured(initialDescription, orderedSelectedGroups, groupAnswers, freeText, addedByChallenge) {
    addedByChallenge = addedByChallenge || [];
    var chosen = [];
    orderedSelectedGroups.forEach(function (gid) {
      (groupAnswers[gid] || []).forEach(function (k) {
        if (chosen.indexOf(k) === -1) chosen.push(k);
      });
    });
    addedByChallenge.forEach(function (k) {
      if (chosen.indexOf(k) === -1) chosen.push(k);
    });

    if (!chosen.length) {
      return {
        type: "proposal",
        remedies: [],
        general_notes: NO_PATTERN_MESSAGE,
        usage_instructions: _usageInstructionsText(),
      };
    }

    var evidence = _newEvidenceStore();
    _scoreText(tokenize(initialDescription), evidence, "description");
    freeText.forEach(function (snippet) { _scoreText(tokenize(snippet), evidence, "answer"); });

    var addedSet = {};
    addedByChallenge.forEach(function (k) { addedSet[k] = true; });

    var remedies = chosen.map(function (key) {
      var flower = BY_KEY[key];
      return {
        key: key,
        name_he: flower.name_he,
        name_en: flower.name_en,
        reason: _formatStructuredReason(key, !addedSet[key], evidence[key]),
      };
    });

    var generalNotes = _buildGeneralNotesStructured(chosen, evidence, addedByChallenge);

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

  function _challengeAdd(initialDescription, transcript, proposalIndex) {
    var prefix = transcript.slice(0, proposalIndex);
    var replay = _replayStructured(prefix);
    var groupSelection = replay.groupSelection, groupAnswers = replay.groupAnswers, freeText = replay.freeText;
    var descScores = _descriptionScores(initialDescription, freeText);

    var ordered, originalChosen;
    if (groupSelection === null) {
      originalChosen = ALL_KEYS.filter(function (k) { return (descScores[k] || 0) >= SUGGEST_MIN_SCORE; });
      groupAnswers = { "__legacy__": originalChosen };
      ordered = ["__legacy__"];
    } else {
      ordered = _orderedSelectedGroups(groupSelection, descScores);
      originalChosen = [];
      ordered.forEach(function (gid) {
        (groupAnswers[gid] || []).forEach(function (k) {
          if (originalChosen.indexOf(k) === -1) originalChosen.push(k);
        });
      });
    }

    var challengeTexts = [];
    for (var i = proposalIndex; i < transcript.length; i++) {
      var e = transcript[i];
      var t = e.text || "";
      if (e.type === "answer" && t.indexOf(CHALLENGE_PREFIX) === 0) {
        challengeTexts.push(t.slice(CHALLENGE_PREFIX.length));
      }
    }

    var added = [];
    challengeTexts.forEach(function (text) {
      var ev = _newEvidenceStore();
      _scoreText(tokenize(text), ev, "answer");
      var scores = _scores(ev);
      ALL_KEYS.forEach(function (key) {
        if ((scores[key] || 0) >= SUGGEST_MIN_SCORE && originalChosen.indexOf(key) === -1 && added.indexOf(key) === -1) {
          added.push(key);
        }
      });
      freeText.push(text);
    });

    return _finalizeStructured(initialDescription, ordered, groupAnswers, freeText, added);
  }

  // ==========================================================================
  // API ציבורי
  // ==========================================================================

  function next_step(initialDescription, historyContext, transcript) {
    var proposalIndex = _firstProposalIndex(transcript);
    if (proposalIndex !== null) {
      return _challengeAdd(initialDescription, transcript, proposalIndex);
    }

    if (_isLegacyTranscript(transcript)) {
      var oldFreeText = transcript.filter(function (e) {
        return e.type === "answer" && (e.text || "").indexOf(CHALLENGE_PREFIX) !== 0;
      }).map(function (e) { return e.text || ""; });
      var descScores1 = _descriptionScores(initialDescription, oldFreeText);
      var gq1 = _buildGroupQuestion(descScores1);
      return { type: "question", question_id: gq1.question_id, text: gq1.text, multi: gq1.multi, options: gq1.options };
    }

    var replay = _replayStructured(transcript);
    var groupSelection = replay.groupSelection, groupAnswers = replay.groupAnswers, freeText = replay.freeText;

    if (groupSelection === null) {
      var descScores2 = _descriptionScores(initialDescription);
      var gq2 = _buildGroupQuestion(descScores2);
      return { type: "question", question_id: gq2.question_id, text: gq2.text, multi: gq2.multi, options: gq2.options };
    }

    var descScores3 = _descriptionScores(initialDescription, freeText);
    var ordered = _orderedSelectedGroups(groupSelection, descScores3);

    var remaining = ordered.filter(function (gid) { return !groupAnswers.hasOwnProperty(gid); });
    if (remaining.length) {
      var nextGroup = GROUP_BY_ID[remaining[0]];
      var grq = _buildGroupRemedyQuestion(nextGroup, descScores3);
      return { type: "question", question_id: grq.question_id, text: grq.text, multi: grq.multi, options: grq.options };
    }

    return _finalizeStructured(initialDescription, ordered, groupAnswers, freeText);
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
    REMEDY_ORDER: REMEDY_ORDER,
    ALL_KEYS: ALL_KEYS,
    LEXICON: LEXICON,
    GROUPS: GROUPS,
    GROUP_BY_ID: GROUP_BY_ID,
    NONE_OPTION_LABEL: NONE_OPTION_LABEL,
    REMEDY_LABELS: REMEDY_LABELS,
    GROUP_QUESTION_ID: GROUP_QUESTION_ID,
    GROUP_QUESTION_TEXT: GROUP_QUESTION_TEXT,
    CHALLENGE_PREFIX: CHALLENGE_PREFIX,
    SUGGEST_MIN_SCORE: SUGGEST_MIN_SCORE,
    SOFT_BLEND_SIZE_NOTE_THRESHOLD: SOFT_BLEND_SIZE_NOTE_THRESHOLD,
    NO_PATTERN_MESSAGE: NO_PATTERN_MESSAGE,
    QUESTION_MARKERS: QUESTION_MARKERS,
    next_step: next_step,
    explain_if_asked: explain_if_asked,
    has_signal: has_signal,
    build_history_context: build_history_context,
    // חשופים גם לצורך בדיקות פנימיות
    tokenize: tokenize,
    _isLegacyTranscript: _isLegacyTranscript,
    _firstProposalIndex: _firstProposalIndex,
    _replayStructured: _replayStructured,
    _parseMultiselectAnswer: _parseMultiselectAnswer,
    _descriptionScores: _descriptionScores,
    _buildGroupQuestion: _buildGroupQuestion,
    _buildGroupRemedyQuestion: _buildGroupRemedyQuestion,
    _orderedSelectedGroups: _orderedSelectedGroups,
    _groupQuestionId: _groupQuestionId,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.engine = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
