// מנוע ההתאמה של יועץ התמציות - פורט נאמן של backend/advisor_engine.py
// (שאלון מובנה multi-select + שאלת משלימות + דגלי בטיחות): 7 קבוצות באך,
// שאלת-המשך אחת פר קבוצה שנבחרה (כולל "hint" מהשאלה המבדלת של הפרופיל
// המקצועי), שאלת "תמציות משלימות לשקול" אחרי שכל הקבוצות נענו (מבוססת
// backend/bach_knowledge.py: COMPLEMENTS/CLUSTERS/OPPOSITE_PAIRS), והערכת
// דגלי בטיחות (SAFETY_FLAGS) שמוצגת בראש general_notes.
//
// כל מבני הנתונים (LEXICON, GROUPS, REMEDY_LABELS, וכל מאגר הידע המקצועי -
// PROFILES, COMPLEMENTS, CLUSTERS, OPPOSITE_PAIRS, SAFETY_FLAGS,
// EVIDENCE_NOTE_HE) יוצאו ישירות מהמודולים הפייתוניים המקוריים (advisor_engine
// ו-bach_knowledge.json_export()) כדי להבטיח התאמה מדויקת - בלי הקלדה ידנית.
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
  // B. הלקסיקון - דפוסים עשירים לכל תמצית (כולל _LEXICON_ENRICHMENT, כבר
  // ממוזג בתוך הדאמפ - יוצא מ-Python)
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
    },
    {
      "terms": [
        "קפא"
      ],
      "weight": 2
    },
    {
      "terms": [
        "סיוט"
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
    },
    {
      "terms": [
        "מסמיק"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "עומד",
        "להשתגע"
      ],
      "weight": 3
    },
    {
      "terms": [
        "מתפוצץ"
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
    },
    {
      "terms": [
        "משהו",
        "רע",
        "עומד",
        "לקרות"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "לא",
        "עונה",
        "לטלפון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עד",
        "שכולם",
        "בבית"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "נרדמת",
        "עד",
        "שכולם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "ישנה",
        "בלילות"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "כולם",
        "אמרו",
        "לי"
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
    },
    {
      "terms": [
        "רגע",
        "למעלה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "להחליט",
        "לבד"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "לא",
        "יעבוד"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נתקע"
      ],
      "weight": 1
    },
    {
      "terms": [
        "קשה",
        "להאמין"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "שום",
        "דבר",
        "לא",
        "עוזר"
      ],
      "weight": 3
    },
    {
      "terms": [
        "לא",
        "מצפה",
        "לכלום"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "מעייף",
        "אותי"
      ],
      "weight": 1
    },
    {
      "terms": [
        "בלי",
        "קפה"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "לא",
        "יודע",
        "מה",
        "רוצה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מבזבז",
        "חיים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מחפש",
        "משמעות"
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
    },
    {
      "terms": [
        "בעולם",
        "שלי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רעיונות",
        "לא",
        "מתחיל"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "ימים",
        "טובים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מסתכל",
        "תמונות"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "למה",
        "להתאמץ"
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
    },
    {
      "terms": [
        "אין",
        "כוח",
        "לכלום"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לקום",
        "עייף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מצליח",
        "להתאושש"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "בשלוש",
        "בלילה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קופצת",
        "מחשבה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "משחזר",
        "הוויכוח"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "אין",
        "כוח",
        "לחייך"
      ],
      "weight": 3
    },
    {
      "terms": [
        "עובר",
        "כמו",
        "שבא"
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
    },
    {
      "terms": [
        "שוב",
        "ושוב",
        "אותו",
        "סיפור"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אותן",
        "טעויות"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "מעדיף",
        "להתמודד",
        "לבד"
      ],
      "weight": 3
    },
    {
      "terms": [
        "נסגר",
        "בחדר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתנשא"
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
    },
    {
      "terms": [
        "כמה",
        "זמן",
        "זה",
        "לוקח"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "יכול",
        "לחכות"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "אף",
        "אחד",
        "לא",
        "מבין"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אף",
        "אחד",
        "לא",
        "ענה"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "אין",
        "מה",
        "לדבר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מצחיק",
        "כולם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "אוהב",
        "ריבים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "כוס",
        "יין"
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
    },
    {
      "terms": [
        "לא",
        "מצליח",
        "להגיד",
        "לא"
      ],
      "weight": 3
    },
    {
      "terms": [
        "אין",
        "זמן",
        "לעצמי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "עבודה",
        "של",
        "כולם"
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
    },
    {
      "terms": [
        "מתבלבל"
      ],
      "weight": 1
    },
    {
      "terms": [
        "בין",
        "שני",
        "עולמות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "סופג",
        "אווירה"
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
    },
    {
      "terms": [
        "מגיע",
        "לו",
        "שיסבול"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מקנא"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מסתירה",
        "ממני"
      ],
      "weight": 1
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
    },
    {
      "terms": [
        "אין",
        "לי",
        "סיכוי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "למה",
        "לנסות"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אחרים",
        "יכולים"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "באשמתי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "יכולתי",
        "לעשות",
        "יותר"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מגיע",
        "לי",
        "לנוח"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "לא",
        "יודע",
        "מאיפה",
        "להתחיל"
      ],
      "weight": 2
    },
    {
      "terms": [
        "גדול",
        "עליי"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "יכול",
        "לשאת"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מתפרק",
        "מבפנים"
      ],
      "weight": 3
    },
    {
      "terms": [
        "שום",
        "דבר",
        "לא",
        "נשאר"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "לא",
        "אותו",
        "בן",
        "אדם"
      ],
      "weight": 3
    },
    {
      "terms": [
        "קפא",
        "בפנים"
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
    },
    {
      "terms": [
        "דווקא",
        "לי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לאחרים",
        "הכל",
        "בא",
        "בקלות"
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
    },
    {
      "terms": [
        "להרשות",
        "לעצמי",
        "ליפול"
      ],
      "weight": 3
    },
    {
      "terms": [
        "חולה",
        "הולך",
        "לעבודה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מתלונן"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "במראה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חייב",
        "לבדוק",
        "שוב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "משהו",
        "רעיל"
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
    },
    {
      "terms": [
        "עשיתי",
        "בשבילם"
      ],
      "weight": 2
    },
    {
      "terms": [
        "רוצה",
        "שיהיה",
        "להם",
        "טוב"
      ],
      "weight": 2
    },
    {
      "terms": [
        "נעלבתי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "הבית",
        "ריק"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "לא",
        "יכול",
        "לשתוק"
      ],
      "weight": 2
    },
    {
      "terms": [
        "דלוק",
        "על",
        "זה"
      ],
      "weight": 2
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
    },
    {
      "terms": [
        "אצלי",
        "עושים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "תעשו",
        "מה",
        "שאמרתי"
      ],
      "weight": 3
    },
    {
      "terms": [
        "בלעדיי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "לא",
        "מבקש",
        "אני",
        "אומר"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "כל",
        "כך",
        "טיפשים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "חוסר",
        "מקצועיות"
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
    },
    {
      "terms": [
        "פספסתי",
        "אימון"
      ],
      "weight": 2
    },
    {
      "terms": [
        "כללים",
        "ברורים"
      ],
      "weight": 2
    },
    {
      "terms": [
        "קשוח",
        "עם",
        "עצמ"
      ],
      "weight": 3
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
    },
    {
      "terms": [
        "רועד",
        "כולי"
      ],
      "weight": 2
    },
    {
      "terms": [
        "טלפון",
        "נורא"
      ],
      "weight": 2
    },
    {
      "terms": [
        "אחרי",
        "האזעקה"
      ],
      "weight": 2
    },
    {
      "terms": [
        "להתעלף"
      ],
      "weight": 2
    },
    {
      "terms": [
        "מבחן",
        "בעוד",
        "שעה"
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
  // מאגר הידע המקצועי (backend/bach_knowledge.py, יוצא דרך json_export())
  // ==========================================================================

  var KNOWLEDGE = {
  "source_labels": {
    "bach_centre": "מרכז באך",
    "author": "מחבר",
    "common_practice": "נוהג מקובל",
    "inference": "הסקה"
  },
  "evidence_note_he": "פרחי באך הם פרקטיקה משלימה מסורתית. ניסויים מבוקרים לא הראו השפעה מעבר לפלצבו, והם אינם תחליף לטיפול רפואי או נפשי. הם נחשבים בטוחים, אך מכילים אלכוהול.",
  "profiles": {
    "rock_rose": {
      "negative_state": "אימה ופאניקה במצב חירום נפשי; קיפאון מוחלט מול איום פתאומי.",
      "positive_potential": "אומץ וצלילות דעת תחת לחץ קיצוני.",
      "series": 12,
      "type_mood": "כמעט תמיד מצב אקוטי, לא טיפוס",
      "typical_situations": [
        "התקף פאניקה",
        "אזעקה או מצב חירום",
        "סיוט לילה",
        "תאונה או בשורה קשה שקרתה הרגע"
      ],
      "client_phrases_he": [
        "קפאתי. לא יכולתי לזוז.",
        "הלב שלי דפק כאילו אני הולך/ת למות.",
        "בכל אזעקה אני נכנס/ת לפאניקה מוחלטת.",
        "התעוררתי בצרחות מסיוט.",
        "הייתי בטוח/ה שזה הסוף."
      ],
      "discriminating_question": "הפחד ממוקד וידוע, או שזו אימה/בהלה חריפה ברגע הזה?",
      "discriminates_vs": [
        "mimulus",
        "star_of_bethlehem"
      ],
      "safety_note": null
    },
    "mimulus": {
      "negative_state": "פחדים יומיומיים עם שם וכתובת (חיות, רופאים, קהל, חושך, מחלה); ביישנות ונשיאת הפחד בשקט.",
      "positive_potential": "אומץ שקט מול הדבר הידוע - הפחד עדיין קיים אך אינו שולט.",
      "series": 12,
      "type_mood": "גם וגם; טיפוס קלאסי לביישנים",
      "typical_situations": [
        "לפני מבחן, ריאיון או בדיקה רפואית",
        "בית ספר או עבודה חדשה",
        "פחד ממשהו ספציפי לאורך שנים"
      ],
      "client_phrases_he": [
        "אני פשוט מפחד/ת מכלבים, מאז שאני זוכר/ת את עצמי.",
        "אני לא אוהב/ת לדבר מול אנשים, אני ישר מסמיק/ה.",
        "יש לי תור לרופא שיניים ואני כבר שבוע לא ישן/ה בגלל זה.",
        "אני לא מספר/ת לאף אחד שאני פוחד/ת, זה נראה לי מביך."
      ],
      "discriminating_question": "אפשר לתת שם למה שמפחיד? פחד עם שם וכתובת מול פחד עמום בלי שם.",
      "discriminates_vs": [
        "aspen",
        "larch",
        "red_chestnut"
      ],
      "safety_note": null
    },
    "cherry_plum": {
      "negative_state": "פחד לאבד שליטה, \"להשתגע\" או לפגוע במישהו; לחץ פנימי שעומד להתפרץ.",
      "positive_potential": "שליטה עצמית רגועה ושפיות דעת תחת לחץ קיצוני.",
      "series": 19,
      "type_mood": "בעיקר מצב/משבר אקוטי",
      "typical_situations": [
        "שחיקת הורות ('אני מפחד/ת שאפגע בתינוק')",
        "משבר זעם",
        "גמילה מהתמכרות",
        "מצוקה חריפה אחרי טראומה"
      ],
      "client_phrases_he": [
        "אני מרגיש/ה שאני עומד/ת להשתגע.",
        "אני מפחד/ת שאעשה משהו שאתחרט עליו.",
        "יש לי מחשבות מפחידות שאני לא רוצה בהן.",
        "עוד שנייה אני מתפוצץ/ת."
      ],
      "discriminating_question": "הפחד הוא מאיום חיצוני, או מאיבוד שליטה על עצמך?",
      "discriminates_vs": [
        "rock_rose",
        "holly"
      ],
      "safety_note": "כל גילוי של מחשבות פגיעה עצמית או באחר מחייב הפניה מקצועית מיידית - התמצית אינה טיפול במצב כזה."
    },
    "aspen": {
      "negative_state": "פחד עמום בלי סיבה או שם, תחושת אסון מתקרב, לעיתים בעיקר בלילה.",
      "positive_potential": "ביטחון פנימי; הרגישות הופכת לאינטואיציה במקום לחרדה.",
      "series": 19,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "חרדה צפה ('free-floating') ללא זיהוי מקור",
        "פחד ליליים חוזרים",
        "תחושת איום כללית בתקופת מתח ביטחוני"
      ],
      "client_phrases_he": [
        "יש לי תחושה שמשהו רע עומד לקרות, ואני לא יודע/ת מה.",
        "אני מתעורר/ת בלילה עם פחד, בלי שום סיבה.",
        "זה סתם פחד כזה, קשה להסביר.",
        "אני לא מספר/ת לאף אחד, יחשבו שאני משוגע/ת."
      ],
      "discriminating_question": "אפשר לתת שם לפחד? בלי שם ובלי סיבה = אספן; עם שם וכתובת = מימולוס.",
      "discriminates_vs": [
        "mimulus"
      ],
      "safety_note": null
    },
    "red_chestnut": {
      "negative_state": "חרדה קטסטרופלית לשלום אנשים קרובים; קושי להירגע עד שכולם בטוחים.",
      "positive_potential": "אכפתיות רגועה ובוטחת כלפי יקירים.",
      "series": 19,
      "type_mood": "גם וגם; שכיח אצל הורים",
      "typical_situations": [
        "ילד או בן זוג לא עונה לטלפון",
        "בן משפחה בצבא או במילואים",
        "דאגה כרונית להורה חולה"
      ],
      "client_phrases_he": [
        "כל פעם שהבן שלי לא עונה לטלפון אני כבר רואה את הגרוע מכול.",
        "אני לא נרדמת עד שכולם בבית.",
        "מאז שהוא בצבא אני לא ישנה בלילות.",
        "אני יודע/ת שאני מגזים/ה, אבל אני לא מצליח/ה להפסיק לדאוג."
      ],
      "discriminating_question": "הדאגה מופנית כלפי אחרים קרובים, יותר מאשר כלפי עצמך?",
      "discriminates_vs": [
        "chicory",
        "mimulus"
      ],
      "safety_note": null
    },
    "cerato": {
      "negative_state": "חוסר אמון בשיקול הדעת העצמי; שואל/ת את כולם ולעיתים נסחף/ת לעצה שגויה.",
      "positive_potential": "אמון בקול הפנימי ובאינטואיציה.",
      "series": 12,
      "type_mood": "גם וגם",
      "typical_situations": [
        "החלטת קריירה או לימודים",
        "בחירת דירה, חתונה או טיפול רפואי",
        "הורים טריים מוצפים מעצות סותרות"
      ],
      "client_phrases_he": [
        "מה אתה/את היית עושה במקומי?",
        "שאלתי כבר חמישה אנשים ועדיין אני לא בטוח/ה.",
        "הרגשתי שזה לא נכון, אבל כולם אמרו לי ללכת על זה.",
        "אני לא סומך/ת על עצמי בדברים כאלה."
      ],
      "discriminating_question": "כשצריך להחליט - שואל/ת את כולם (צראטו), או מתנדנד/ת בשקט לבד בין שתי אפשרויות (סקלרנתוס)?",
      "discriminates_vs": [
        "scleranthus",
        "wild_oat"
      ],
      "safety_note": null
    },
    "scleranthus": {
      "negative_state": "התנדנדות שקטה בין שתי אפשרויות, כולל תנודות במצב הרוח עצמו.",
      "positive_potential": "החלטיות ואיזון פנימי.",
      "series": 12,
      "type_mood": "גם וגם",
      "typical_situations": [
        "התלבטות בין שתי אופציות ברורות",
        "תנודות מצב רוח מחזוריות",
        "מחלת תנועה (רק אם גם המצב הרגשי מתאים)"
      ],
      "client_phrases_he": [
        "בבוקר אני בטוח/ה שכן, ובערב שלא.",
        "אני קופץ/ת בין שתי האפשרויות ולא מצליח/ה להחליט.",
        "רגע אני למעלה ורגע למטה.",
        "אני לא שואל/ת אף אחד, זה משהו שאני צריך/ה להחליט לבד."
      ],
      "discriminating_question": "יש שתי אפשרויות מוגדרות שמתנדנדים ביניהן, או שהכיוון הכללי בחיים לא ברור?",
      "discriminates_vs": [
        "cerato",
        "wild_oat"
      ],
      "safety_note": null
    },
    "gentian": {
      "negative_state": "ייאוש קל אחרי נסיגה עם סיבה ידועה; ספקנות שמחלישה ניסיון חוזר.",
      "positive_potential": "התמדה ואופטימיות מציאותית.",
      "series": 12,
      "type_mood": "גם וגם",
      "typical_situations": [
        "כישלון בבחינה או מבחן נהיגה",
        "נסיגה בטיפול או בדיאטה",
        "ספק לפני ניסיון נוסף"
      ],
      "client_phrases_he": [
        "ידעתי שזה לא יעבוד.",
        "בדיוק כשהתחיל להיות טוב, שוב נתקעתי.",
        "אולי זה פשוט לא בשבילי.",
        "קשה לי להאמין שזה ישתפר."
      ],
      "discriminating_question": "יש סיבה ידועה לייאוש, ועדיין יש נכונות לנסות שוב?",
      "discriminates_vs": [
        "gorse",
        "mustard"
      ],
      "safety_note": null
    },
    "gorse": {
      "negative_state": "חוסר תקווה עמוק וממושך; ויתור על האפשרות שמשהו ישתפר.",
      "positive_potential": "תקווה מחודשת ונכונות לנסות.",
      "series": 7,
      "type_mood": "בעיקר מצב ממושך",
      "typical_situations": [
        "מחלה כרונית או ממושכת",
        "טיפולים חוזרים שלא הצליחו",
        "מגיע לטיפול רק בלחץ בן/בת הזוג"
      ],
      "client_phrases_he": [
        "ניסיתי כבר הכול, שום דבר לא עוזר.",
        "אני בא/ה רק כי אשתי/בעלי התעקש/ה.",
        "זה גנטי, אין מה לעשות.",
        "אני כבר לא מצפה לכלום."
      ],
      "discriminating_question": "עדיין יש ניסיון וסיבה ידועה (ג'נציאנה), או שהתקווה עצמה אבדה (גורס)?",
      "discriminates_vs": [
        "gentian",
        "sweet_chestnut",
        "wild_rose"
      ],
      "safety_note": "חוסר תקווה ממושך, בייחוד אצל בני נוער, מצריך הפניה להערכה מקצועית לדיכאון."
    },
    "hornbeam": {
      "negative_state": "עייפות מנטלית שקודמת למאמץ - \"תחושת יום ראשון\" שחולפת כשמתחילים.",
      "positive_potential": "רעננות וביטחון שיהיה כוח כשצריך.",
      "series": 19,
      "type_mood": "מצב",
      "typical_situations": [
        "דחיינות בבוקר לפני העבודה",
        "שגרה מתישה בלי גיוון",
        "תלות בקפאין כדי \"לתפקד\""
      ],
      "client_phrases_he": [
        "אין לי כוח להתחיל את היום.",
        "רק לחשוב על כל מה שיש לי לעשות מעייף אותי.",
        "בלי קפה אני לא מתפקד/ת.",
        "כשאני כבר מתחיל/ה, זה בסדר."
      ],
      "discriminating_question": "העייפות לפני המאמץ ועוברת כשמתחילים, או תשישות אמיתית אחריו?",
      "discriminates_vs": [
        "olive"
      ],
      "safety_note": "עייפות מתמשכת מצדיקה גם בדיקה רפואית (למשל אנמיה)."
    },
    "wild_oat": {
      "negative_state": "שאפתנות בלי ייעוד ברור; הרבה התחלות ש\"זה לא זה\".",
      "positive_potential": "ייעוד ברור ומספק.",
      "series": 7,
      "type_mood": "גם וגם",
      "typical_situations": [
        "החלפת תחומי לימוד או קריירה שוב ושוב",
        "תחושת חוסר משמעות למרות הצלחה חיצונית",
        "צומת גדול בחיים בלי כיוון"
      ],
      "client_phrases_he": [
        "אני טוב/ה בהרבה דברים, אבל לא יודע/ת מה אני באמת רוצה לעשות.",
        "החלפתי כבר שלושה תארים.",
        "יש לי תחושה שאני מבזבז/ת את החיים.",
        "אני מחפש/ת משמעות."
      ],
      "discriminating_question": "יש שתי אפשרויות מוגדרות (סקלרנתוס), או שהכיוון הכללי בחיים לא ברור בכלל?",
      "discriminates_vs": [
        "scleranthus",
        "cerato"
      ],
      "safety_note": null
    },
    "clematis": {
      "negative_state": "חלמנות והיעדרות מההווה; חי בעתיד ובדמיון, עד כדי נמנום או עילפון במשבר.",
      "positive_potential": "אידיאליזם מקורקע שמממש חלומות בפועל.",
      "series": 12,
      "type_mood": "גם וגם",
      "typical_situations": [
        "חוסר ריכוז בשיחה או בלימודים",
        "תכנון \"יום אחד\" בלי פעולה בהווה",
        "עייפות וישנוניות יתרה"
      ],
      "client_phrases_he": [
        "סליחה, לא שמעתי, הייתי בעולם שלי.",
        "יום אחד, כשאני אעבור לחו״ל, הכול יהיה אחרת.",
        "אני כל הזמן עייף/ה ורוצה לישון.",
        "יש לי המון רעיונות, אבל אף פעם לא מתחיל/ה."
      ],
      "discriminating_question": "הראש נודד לעתיד ולחלומות, או לעבר ולגעגוע?",
      "discriminates_vs": [
        "honeysuckle",
        "wild_rose"
      ],
      "safety_note": null
    },
    "honeysuckle": {
      "negative_state": "חיים בעבר; געגוע ל\"ימים הטובים\" וחרטה על מה שהיה יכול להיות.",
      "positive_potential": "העבר כניסיון שממנו לומדים, לצד פתיחות לשמחה חדשה.",
      "series": 19,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "אבל או פרידה",
        "געגוע לבית/מולדת אחרי הגירה",
        "קושי לוותר על תקופה או קשר שהסתיימו"
      ],
      "client_phrases_he": [
        "פעם היה הרבה יותר טוב.",
        "אני מתגעגע/ת הביתה כל הזמן.",
        "הימים הכי טובים שלי כבר מאחוריי.",
        "אני עדיין מסתכל/ת על התמונות שלנו כל ערב."
      ],
      "discriminating_question": "הראש נודד לעבר ולגעגוע, או לעתיד ולדמיון?",
      "discriminates_vs": [
        "clematis",
        "chestnut_bud"
      ],
      "safety_note": null
    },
    "wild_rose": {
      "negative_state": "השלמה ואדישות בלי תלונה; \"ככה זה\", בלי מאבק ובלי סבל גלוי.",
      "positive_potential": "עניין מחודש ושמחת חיים.",
      "series": 19,
      "type_mood": "גם וגם, לעיתים כרוני",
      "typical_situations": [
        "שגרה מונוטונית שהתקבלה כמובנת מאליה",
        "ותרנות פסיבית על שאיפות",
        "תשישות רגשית ללא מרד גלוי"
      ],
      "client_phrases_he": [
        "ככה זה, מה אפשר לעשות.",
        "לא אכפת לי, באמת, מה שיהיה יהיה.",
        "אין לי חשק לכלום, אבל גם לא רע לי במיוחד.",
        "למה להתאמץ? זה לא ישנה כלום."
      ],
      "discriminating_question": "יש עוד סבל וניסיון (גורס/ג'נציאנה), או שזו השלמה שקטה בלי תלונה (ווילד רוז)?",
      "discriminates_vs": [
        "gorse",
        "olive"
      ],
      "safety_note": null
    },
    "olive": {
      "negative_state": "תשישות מלאה, גופנית ונפשית, אחרי מאמץ או סבל ממושכים.",
      "positive_potential": "כוח וחיוניות שחוזרים.",
      "series": 7,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "אחרי מחלה ממושכת או לידה",
        "תקופת עומס ארוכה בעבודה",
        "שחיקת הורות או טיפול בבן משפחה"
      ],
      "client_phrases_he": [
        "אני גמור/ה. פשוט גמור/ה.",
        "אין לי כוח לכלום, אפילו לא לדברים שאני אוהב/ת.",
        "אני יכול/ה לישון 12 שעות ולקום עייף/ה.",
        "מאז הלידה אני לא מצליח/ה להתאושש."
      ],
      "discriminating_question": "העייפות מגיעה אחרי מאמץ אמיתי (אוליב), או לפניו ובראש (הורנבים)?",
      "discriminates_vs": [
        "hornbeam",
        "oak"
      ],
      "safety_note": "עייפות מתמשכת מצדיקה גם בדיקה רפואית."
    },
    "white_chestnut": {
      "negative_state": "מחשבות לא רצויות שחוזרות בלולאה; ויכוחים פנימיים, בעיקר לפני שינה.",
      "positive_potential": "מוח שקט שחושב וממשיך הלאה.",
      "series": 19,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "נדודי שינה ממחשבות חוזרות",
        "שחזור ויכוח או אירוע שוב ושוב",
        "קושי להתרכז בגלל \"רעש מחשבתי\""
      ],
      "client_phrases_he": [
        "הראש שלי לא מפסיק לחשוב, כמו רדיו שאי אפשר לכבות.",
        "אני משחזר/ת את הוויכוח שוב ושוב.",
        "אני מתעורר/ת בשלוש בלילה והמחשבות מתחילות.",
        "אני לא מצליח/ה להתרכז, כל הזמן קופצת לי אותה מחשבה."
      ],
      "discriminating_question": "יש תוכן ספציפי למחשבות (דאגה ליקירים = רד צ'סנאט, אשמה = פיין, כעס = הולי), או שזו לולאה כללית?",
      "discriminates_vs": [
        "red_chestnut",
        "pine",
        "holly"
      ],
      "safety_note": null
    },
    "mustard": {
      "negative_state": "ענן שחור של עצבות שיורד ועולה בלי סיבה נראית לעין.",
      "positive_potential": "יציבות רגשית - האור חוזר מעצמו.",
      "series": 19,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "עצבות פתאומית ללא טריגר מזוהה",
        "דיכאון שבא והולך במחזוריות",
        "תחושת ריקנות באמצע יום רגיל"
      ],
      "client_phrases_he": [
        "פתאום נופל עליי ענן שחור, ואין לי מושג למה.",
        "הכול בסדר בחיים שלי, ובכל זאת אני עצוב/ה.",
        "אין לי כוח לחייך, אפילו לא בשביל הילדים.",
        "זה עובר אחרי כמה ימים, כמו שזה בא."
      ],
      "discriminating_question": "יש סיבה ידועה לירידה (ג'נציאנה), או שהעננה יורדת ועולה בלי שום סיבה (מסטרד)?",
      "discriminates_vs": [
        "gentian"
      ],
      "safety_note": "עצבות ממושכת ללא סיבה, בייחוד אצל בני נוער, מצדיקה הערכה מקצועית לדיכאון."
    },
    "chestnut_bud": {
      "negative_state": "חזרה על אותן טעויות; קושי ללמוד מהניסיון וממה שכבר קרה.",
      "positive_potential": "למידה מכל חוויה, גם מאחרים.",
      "series": 19,
      "type_mood": "מצב / דפוס חוזר",
      "typical_situations": [
        "דפוס זוגי חוזר עם אותו סוג בן/בת זוג",
        "אותן טעויות במבחנים או בעבודה",
        "לא מפיק/ה לקחים מניסיון קודם"
      ],
      "client_phrases_he": [
        "זה קורה לי שוב ושוב, בדיוק אותו סיפור.",
        "אמרתי לעצמי שלא אחזור על זה… וחזרתי.",
        "איך אני תמיד נופל/ת על אותו סוג של אנשים?",
        "אני עושה את אותן טעויות במבחנים כל פעם."
      ],
      "discriminating_question": "יש חזרה במעשים על אותה טעות, או געגוע פסיבי לעבר בלי חזרה בהתנהגות?",
      "discriminates_vs": [
        "honeysuckle",
        "clematis"
      ],
      "safety_note": null
    },
    "water_violet": {
      "negative_state": "עצמאות גאה שהופכת לריחוק ולבדידות; מעדיף/ה להתמודד לבד.",
      "positive_potential": "עצמאות שלווה לצד יכולת חיבור חם כשרוצים בכך.",
      "series": 12,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "נסיגה חברתית אחרי משבר אישי",
        "קושי לבקש עזרה",
        "תיוג כ\"מתנשא\" בגלל שתיקה"
      ],
      "client_phrases_he": [
        "אני מעדיף/ה להתמודד לבד, ככה זה יותר פשוט.",
        "אני לא צריך/ה אף אחד שיחזיק לי את היד.",
        "אנשים חושבים שאני מתנשא/ת, אבל אני פשוט שקט/ה.",
        "כשרע לי, אני נסגר/ת בחדר."
      ],
      "discriminating_question": "מעדיף/ה להיות לבד (ווטר ויולט), או שקשה לו/לה להיות לבד וזקוק/ה לתשומת לב (הת'ר)?",
      "discriminates_vs": [
        "heather"
      ],
      "safety_note": null
    },
    "impatiens": {
      "negative_state": "חוסר סבלנות ומהירות שהופכים לעצבנות מול איטיות, גם של עצמם וגם של אחרים.",
      "positive_potential": "סבלנות ויעילות בלי מתח מיותר.",
      "series": 12,
      "type_mood": "גם וגם; טיפוס חזק",
      "typical_situations": [
        "תור או פקק תנועה",
        "עבודה בצוות עם קצב שונה",
        "דדליין לוחץ"
      ],
      "client_phrases_he": [
        "יאללה, נו, כמה זמן זה לוקח?!",
        "עזוב, אני אעשה את זה לבד, יותר מהר.",
        "אני לא יכול/ה לחכות בתור.",
        "אני מתעצבן/ת מהר, אבל גם נרגע/ת מהר."
      ],
      "discriminating_question": "חוסר הסבלנות הוא מקצב איטי (אימפיישנס), או ביקורת על האופי של האחר (ביץ')?",
      "discriminates_vs": [
        "vervain",
        "beech"
      ],
      "safety_note": null
    },
    "heather": {
      "negative_state": "צורך עז בתשומת לב וקהל; קושי מוחלט להיות לבד.",
      "positive_potential": "יכולת הקשבה אמפתית לזולת.",
      "series": 7,
      "type_mood": "לרוב טיפוס",
      "typical_situations": [
        "מתקשר/ת לכמה אנשים ברצף רק כדי לדבר",
        "קושי מוחלט להישאר לבד בבית",
        "משתלט/ת על שיחות עם סיפורים אישיים"
      ],
      "client_phrases_he": [
        "רגע, אני חייב/ת לספר לך מה קרה לי…",
        "אני לא יכול/ה להיות לבד בבית, אני משתגע/ת.",
        "אף אחד לא מבין כמה קשה לי.",
        "התקשרתי לחמישה אנשים היום, אף אחד לא ענה."
      ],
      "discriminating_question": "זקוק/ה מאוד לתשומת לב וקשה לו/לה להיות לבד (הת'ר), או מעדיף/ה להיות לבד (ווטר ויולט)?",
      "discriminates_vs": [
        "water_violet",
        "agrimony"
      ],
      "safety_note": null
    },
    "agrimony": {
      "negative_state": "ייסורים מוסתרים מאחורי עליזות; נמנע/ת מעימות ומסתיר/ה כאב מאחורי חיוך.",
      "positive_potential": "עליזות אמיתית לצד הכרה כנה בכאב.",
      "series": 12,
      "type_mood": "גם וגם (גם דוגמת מרכז באך למצב-רוח)",
      "typical_situations": [
        "גירושין או אבל \"מטופלים\" בבדיחות",
        "משפחה שבה \"החזות\" חשובה",
        "שימוש באלכוהול/אוכל/מסכים כדי \"לברוח\""
      ],
      "client_phrases_he": [
        "הכול בסדר, באמת, אין מה לדבר על זה.",
        "אני תמיד זה/זו שמצחיק/ה את כולם.",
        "אני לא אוהב/ת ריבים, עדיף לוותר.",
        "בלילה הראש לא מפסיק, אבל ביום אף אחד לא יודע.",
        "כוס יין בערב עוזרת לי להירגע."
      ],
      "discriminating_question": "מסתיר/ה מצוקה מאחורי חיוך (אגרימוני), או חושף/ת אותה בפתיחות (הת'ר)?",
      "discriminates_vs": [
        "centaury",
        "heather"
      ],
      "safety_note": "שימוש חוזר באלכוהול/סמים \"כדי להירגע\" מצריך הפניה, ותשומת לב לתכולת האלכוהול בתמציות עצמן."
    },
    "centaury": {
      "negative_state": "רצון חלש וקושי מוחלט לומר \"לא\"; משרת/ת עד תשישות.",
      "positive_potential": "גבולות בריאים בלי להתקשח.",
      "series": 12,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "מטפל/ת עיקרי/ת שמזניח/ה את עצמו/ה",
        "עובד/ת שמנוצל/ת על ידי בוס",
        "\"הילד/ה הטוב/ה\" במשפחה"
      ],
      "client_phrases_he": [
        "אני פשוט לא מצליח/ה להגיד לא.",
        "ביקשו ממני, אז הסכמתי… שוב.",
        "אין לי זמן לעצמי, תמיד יש מישהו שצריך משהו.",
        "אני עושה את העבודה של כולם."
      ],
      "discriminating_question": "כשמבקשים ממך טובה שלא רוצים לעשות - לא מסוגל/ת לסרב (סנטאורי), או נסחף/ת רק בזמן שינוי (וולנאט)?",
      "discriminates_vs": [
        "walnut",
        "cerato"
      ],
      "safety_note": null
    },
    "walnut": {
      "negative_state": "רגישות לשינוי ולהשפעת דעות חזקות; קושי לנתק קשרים לעבר בנקודת מעבר.",
      "positive_potential": "יציבות וחופש ללכת בדרך העצמית.",
      "series": 19,
      "type_mood": "בעיקר מצב (מעברים)",
      "typical_situations": [
        "לידה, גיל ההתבגרות, נישואין או פרישה",
        "עלייה, שחרור מצבא, מעבר דירה או גירושין",
        "השפעה חזקה של דעות אחרים בתקופת שינוי"
      ],
      "client_phrases_he": [
        "עברנו דירה ואני עדיין לא מרגיש/ה שייך/ת.",
        "אני יודע/ת מה אני רוצה, אבל כשאמא שלי מדברת אני מתבלבל/ת.",
        "אני באמצע שינוי גדול ומרגיש/ה שאני בין שני עולמות.",
        "אני סופג/ת את האווירה של כל מי שסביבי."
      ],
      "discriminating_question": "יש כרגע נקודת מעבר או השפעה חיצונית חזקה?",
      "discriminates_vs": [
        "cerato",
        "honeysuckle"
      ],
      "safety_note": null
    },
    "holly": {
      "negative_state": "קנאה, חשדנות ונקמנות; עוינות שמקורה בהיעדר תחושת אהבה.",
      "positive_potential": "נדיבות לב ושמחה בהצלחת אחרים.",
      "series": 19,
      "type_mood": "בעיקר מצב",
      "typical_situations": [
        "קנאה באח/ות או בעמית",
        "חשד כלפי בן/בת זוג",
        "כעס בלתי מוסבר כלפי הסביבה"
      ],
      "client_phrases_he": [
        "אני לא סובל/ת אותו, הכול בא לו בקלות.",
        "אני בטוח/ה שהיא מסתירה ממני משהו.",
        "מגיע לו/לה שיסבול/תסבול קצת.",
        "אני מקנא/ת בה, וזה אוכל אותי."
      ],
      "discriminating_question": "העוינות מופנית החוצה, פעיל, כלפי אחרים (הולי), או שזו מרירות פנימית (ווילו)?",
      "discriminates_vs": [
        "willow",
        "impatiens"
      ],
      "safety_note": null
    },
    "larch": {
      "negative_state": "חוסר ביטחון עצמי וציפייה מראש לכישלון, עד כדי הימנעות מניסיון.",
      "positive_potential": "ביטחון עצמי ונכונות להסתכן.",
      "series": 19,
      "type_mood": "גם וגם",
      "typical_situations": [
        "הימנעות מהתמודדות או קידום בעבודה",
        "חרדת ביצוע לפני מבחן או הופעה",
        "השוואה מתמדת לאחרים \"מוצלחים יותר\""
      ],
      "client_phrases_he": [
        "אני לא מספיק טוב/ה בשביל זה.",
        "אין לי סיכוי, יש מועמדים הרבה יותר טובים ממני.",
        "למה לנסות אם אני יודע/ת שאכשל?",
        "אחרים יכולים, אני לא."
      ],
      "discriminating_question": "יש חוסר ביטחון ביכולת עצמה (לארץ'), או חוסר אמון בשיקול הדעת (צראטו)?",
      "discriminates_vs": [
        "cerato",
        "pine"
      ],
      "safety_note": null
    },
    "pine": {
      "negative_state": "אשמה והאשמה עצמית, גם על טעויות של אחרים; \"סליחה\" רפלקסיבי.",
      "positive_potential": "קבלה עצמית ואחריות מציאותית.",
      "series": 19,
      "type_mood": "גם וגם",
      "typical_situations": [
        "הורה שמאשים את עצמו/ה על כל דבר",
        "מתנצל/ת גם כשלא אשם/ה",
        "אשמת ניצול/שכול"
      ],
      "client_phrases_he": [
        "זה בטח באשמתי.",
        "סליחה, סליחה, אני מצטער/ת שאני מטריד/ה.",
        "יכולתי לעשות יותר בשבילה.",
        "לא מגיע לי לנוח כשיש עוד עבודה."
      ],
      "discriminating_question": "מה אתה/את אומר/ת לעצמך - \"זו אשמתי\" (פיין), או \"אני לא מספיק טוב\" (לארץ')?",
      "discriminates_vs": [
        "crab_apple",
        "larch"
      ],
      "safety_note": null
    },
    "elm": {
      "negative_state": "אדם מסוגל שמוצף זמנית מגודל האחריות שנטל על עצמו.",
      "positive_potential": "ביטחון ופרופורציה מול עומס.",
      "series": 19,
      "type_mood": "מצב",
      "typical_situations": [
        "ניהול צוות/פרויקט גדול מדי לרגע נתון",
        "הורות בשיא העומס",
        "תפקיד חדש עם ציפיות גבוהות"
      ],
      "client_phrases_he": [
        "בדרך כלל אני מתמודד/ת עם הכול, אבל עכשיו זה פשוט יותר מדי.",
        "אני לא יודע/ת מאיפה להתחיל.",
        "כולם סומכים עליי ואני מרגיש/ה שאני קורס/ת.",
        "זה גדול עליי הפעם."
      ],
      "discriminating_question": "מדובר בעומס זמני אצל אדם שבדרך כלל מתפקד היטב (אלם), או בהתמדה כרונית מעבר לכוחות (אוק)?",
      "discriminates_vs": [
        "oak",
        "larch"
      ],
      "safety_note": null
    },
    "sweet_chestnut": {
      "negative_state": "ייסורים בקצה גבול הסבולת; תחושה שכל הדלתות סגורות.",
      "positive_potential": "פריצת דרך והתחדשות אחרי הקצה.",
      "series": 19,
      "type_mood": "מצב חריף",
      "typical_situations": [
        "משבר נפשי חריף",
        "אחרי אובדן משמעותי או שרשרת כישלונות",
        "תחושת \"אין יותר מה לעשות\""
      ],
      "client_phrases_he": [
        "הגעתי לקצה. אין לי יותר מאיפה להביא כוחות.",
        "זה יותר ממה שבן אדם יכול לשאת.",
        "אני מרגיש/ה שאני מתפרק/ת מבפנים.",
        "ניסיתי הכול ושום דבר לא נשאר."
      ],
      "discriminating_question": "עוד יש תקווה וניסיון (גורס), או שהגיע לקצה גבול היכולת ממש (סוויט צ'סנאט)?",
      "discriminates_vs": [
        "gorse",
        "cherry_plum"
      ],
      "safety_note": "מצוקה בעוצמה כזו מצדיקה בירור ישיר לגבי מחשבות אובדניות והפניה מקצועית מיידית."
    },
    "star_of_bethlehem": {
      "negative_state": "הלם וטראומה, טריים או ישנים; קהות ותחושת \"מסרב להתנחם\".",
      "positive_potential": "נחמה ועיבוד הדרגתי של האירוע.",
      "series": 19,
      "type_mood": "מצב (גם אירועים ישנים מאוד)",
      "typical_situations": [
        "בשורה קשה או אובדן",
        "אחרי תאונה",
        "טראומה ישנה שעדיין \"נושאים\""
      ],
      "client_phrases_he": [
        "מאז שזה קרה אני לא אותו בן אדם.",
        "אני עדיין בהלם, לא מעכל/ת.",
        "הכול קפא בפנים.",
        "זה קרה לפני שנים, ועדיין כשאני נזכר/ת הגוף שלי מגיב."
      ],
      "discriminating_question": "ההלם קורה עכשיו ממש (רסקיו), או שהוא נישא כבר זמן, ימים ואף שנים (סטאר אוף בת'להם)?",
      "discriminates_vs": [
        "rock_rose",
        "rescue_remedy"
      ],
      "safety_note": null
    },
    "willow": {
      "negative_state": "מרירות ורחמים עצמיים על מה שנתפס כעוול; \"למה דווקא אני\".",
      "positive_potential": "קבלה, אחריות ואופטימיות.",
      "series": 19,
      "type_mood": "גם וגם",
      "typical_situations": [
        "תחושת קיפוח אחרי מאמץ שלא תוגמל",
        "השוואה מרירה למי ש\"הכול בא לו בקלות\"",
        "גירושין או פיטורים שנתפסים כלא הוגנים"
      ],
      "client_phrases_he": [
        "למה זה תמיד קורה דווקא לי?",
        "עבדתי כל כך קשה, ומה קיבלתי בסוף?",
        "לאחרים הכול בא בקלות.",
        "זה פשוט לא הוגן.",
        "כבר לא בא לי לעשות את מה שפעם אהבתי."
      ],
      "discriminating_question": "התחושה היא מרירות פנימית וקורבנות (ווילו), או עוינות פעילה כלפי אחרים (הולי)?",
      "discriminates_vs": [
        "holly",
        "wild_rose"
      ],
      "safety_note": null
    },
    "oak": {
      "negative_state": "התמדה מעבר לכוחות מתוך תחושת חובה; לא מרשה לעצמו/ה לנוח.",
      "positive_potential": "כוח עם גמישות ויכולת לנוח.",
      "series": 7,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "ממשיך/ה לעבוד גם כשחולה",
        "לא מבקש/ת עזרה גם כשקורס/ת",
        "\"עמוד התווך\" של המשפחה"
      ],
      "client_phrases_he": [
        "אני לא יכול/ה להרשות לעצמי ליפול, כולם תלויים בי.",
        "גם כשאני חולה אני הולך/ת לעבודה.",
        "מנוחה? אין לי זמן לזה.",
        "אני לא מתלונן/ת, פשוט ממשיך/ה."
      ],
      "discriminating_question": "כשמתחילים, העייפות עוברת (הורנבים/אוליב), או שזו התמדה כרונית מעבר לגבול (אוק)?",
      "discriminates_vs": [
        "olive",
        "elm"
      ],
      "safety_note": null
    },
    "crab_apple": {
      "negative_state": "תחושת לכלוך או גועל עצמי, קיבעון על פרט \"חסר חשיבות\" לכאורה.",
      "positive_potential": "קבלה עצמית ופרופורציה נכונה.",
      "series": 19,
      "type_mood": "גם וגם",
      "typical_situations": [
        "התמקדות אובססיבית בפגם גופני קטן",
        "שטיפת ידיים או בדיקות חוזרות",
        "תחושת \"טומאה\" אחרי מעשה או מחלה"
      ],
      "client_phrases_he": [
        "אני מרגיש/ה מלוכלך/ת, לא משנה כמה אני מתקלח/ת.",
        "כל מה שאני רואה במראה זה את הפצעון הזה.",
        "אני שונא/ת את האף שלי.",
        "אני חייב/ת לבדוק שוב שסגרתי את הגז.",
        "יש לי תחושה שיש בי משהו רעיל."
      ],
      "discriminating_question": "יש תחושת לכלוך/גועל מהגוף או מהרגל (קראב אפל), ולא רק אשמה (פיין)?",
      "discriminates_vs": [
        "pine",
        "rock_water"
      ],
      "safety_note": "שטיפה/בדיקה חוזרת מצדיקה הערכה מקצועית ל-OCD; הגבלת אכילה קיצונית מצדיקה סינון להפרעת אכילה."
    },
    "chicory": {
      "negative_state": "אהבה רכושנית ומותנית שמצפה לתמורה, ונעלבת כשלא מקבלים אותה.",
      "positive_potential": "אהבה חופשית ובלתי מותנית.",
      "series": 12,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "הורה שמתערב יתר על המידה בחיי ילדים בוגרים",
        "\"קן ריק\" אחרי שהילדים עוזבים",
        "תחושת ניצול אחרי נתינה מרובה"
      ],
      "client_phrases_he": [
        "אחרי כל מה שעשיתי בשבילם, אפילו לא מתקשרים.",
        "אני רק רוצה שיהיה להם טוב, למה הם לא מקשיבים לי?",
        "אני יודע/ת מה טוב בשבילו/ה.",
        "נעלבתי, אבל לא אגיד כלום.",
        "הבית ריק, אף אחד לא צריך אותי."
      ],
      "discriminating_question": "מצווה בסמכות (ויין), או נותן/ת מתוך ציפייה סמויה לתמורה ותשומת לב (צ'יקורי)?",
      "discriminates_vs": [
        "vine",
        "red_chestnut"
      ],
      "safety_note": null
    },
    "vervain": {
      "negative_state": "להט יתר ועקרונות נחרצים; צורך לשכנע אחרים, עד מתח ואי-מנוחה.",
      "positive_potential": "שכנוע שקט ויכולת להרפות.",
      "series": 12,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "פעיל/ת חברתי/פוליטי בלהט תמידי",
        "קושי להירגע גם בחופשה",
        "מעורבות יתר במאבק של מישהו אחר"
      ],
      "client_phrases_he": [
        "אני לא יכול/ה לשתוק כשאני רואה עוול.",
        "אם רק יקשיבו לי, הם יבינו שאני צודק/ת.",
        "אני דלוק/ה על זה, לא מצליח/ה לעצור.",
        "אני תמיד על 200%.",
        "קשה לי להירדם, הראש ממשיך לרוץ עם רעיונות."
      ],
      "discriminating_question": "מצווה בסמכות (ויין), או משכנע/ת בלהט אידיאולוגי (ורוויין)?",
      "discriminates_vs": [
        "vine",
        "impatiens"
      ],
      "safety_note": null
    },
    "vine": {
      "negative_state": "שתלטנות ורצון נוקשה שאחרים ינהגו בדיוק כפי שנקבע.",
      "positive_potential": "מנהיגות מעוררת השראה בלי כפייה.",
      "series": 7,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "ניהול שתלטני בעבודה",
        "הורה שדורש ציות מוחלט",
        "בן/בת זוג ששולט/ת בכל החלטה"
      ],
      "client_phrases_he": [
        "אצלי עושים את זה ככה, נקודה.",
        "אני יודע/ת מה טוב בשבילם יותר מהם.",
        "אין לי סבלנות לוויכוחים, תעשו מה שאמרתי.",
        "בלעדיי שום דבר פה לא היה זז.",
        "אני לא מבקש/ת, אני אומר/ת."
      ],
      "discriminating_question": "דורש/ת ציות בסמכות (ויין), או מבקר/ת בלי לכפות (ביץ')?",
      "discriminates_vs": [
        "beech",
        "chicory"
      ],
      "safety_note": null
    },
    "beech": {
      "negative_state": "חוסר סובלנות וביקורתיות כלפי דרכי אחרים.",
      "positive_potential": "סובלנות וראיית הטוב שמתפתח בכל אחד.",
      "series": 19,
      "type_mood": "גם וגם",
      "typical_situations": [
        "חיכוך מתמיד עם עמיתים",
        "הורה או מנהל/ת ביקורתי/ת",
        "עצבנות מהרגלי אחרים (קול לעיסה, מבטא)"
      ],
      "client_phrases_he": [
        "אני לא מבין/ה איך אנשים יכולים להיות כל כך טיפשים.",
        "הכול מעצבן אותי אצלו/ה, אפילו איך שהוא/היא לועס/ת.",
        "אם היו עושים כמו שצריך, לא היו בעיות.",
        "אין לי סבלנות לחוסר מקצועיות."
      ],
      "discriminating_question": "הביקורת מכוונת לאחרים (ביץ'), או שהנוקשות מכוונת בעיקר כלפי עצמו/ה (רוק ווטר)?",
      "discriminates_vs": [
        "rock_water",
        "holly"
      ],
      "safety_note": null
    },
    "rock_water": {
      "negative_state": "משמעת עצמית נוקשה והתכחשות להנאות; \"אדון קשה לעצמו\".",
      "positive_potential": "אידיאלים גמישים ופתיחות לשמחה.",
      "series": 7,
      "type_mood": "בעיקר טיפוס",
      "typical_situations": [
        "דיאטה או משטר אימונים קיצוניים",
        "פרפקציוניזם עצמי בלי הנחות",
        "סירוב עקבי להנאה \"לא מוצדקת\""
      ],
      "client_phrases_he": [
        "אני לא מרשה לעצמי לאכול סוכר, בכלל.",
        "אם פספסתי אימון אחד אני מרגיש/ה שנכשלתי.",
        "יש לי כללים ברורים לחיים, ואני לא סוטה מהם.",
        "הנאות זה בזבוז זמן, יש דברים חשובים יותר.",
        "אני הכי קשוח/ה עם עצמי."
      ],
      "discriminating_question": "הנוקשות מכוונת כלפי עצמו/ה (רוק ווטר), או כלפי אחרים (ביץ')?",
      "discriminates_vs": [
        "beech",
        "crab_apple"
      ],
      "safety_note": null
    },
    "rescue_remedy": {
      "negative_state": "משבר אקוטי כרגע: אימה, הלם, דחיפות, אובדן שליטה או ערפול תודעה.",
      "positive_potential": "הרגעה מיידית ברגע המשבר.",
      "series": null,
      "type_mood": "מצב אקוטי בלבד",
      "typical_situations": [
        "מבחן נהיגה או בחינה בעוד רגע",
        "מיד אחרי תאונה או בשורה קשה",
        "בזמן אזעקה או בממ\"ד",
        "פאניקה לפני טיסה"
      ],
      "client_phrases_he": [
        "אני רועד/ת כולי, תני לי משהו להירגע.",
        "יש לי מבחן בעוד שעה ואני משתגע/ת.",
        "קיבלתי עכשיו טלפון נורא.",
        "אחרי האזעקה לא הצלחתי להפסיק לבכות.",
        "אני מרגיש/ה שאני עומד/ת להתעלף."
      ],
      "discriminating_question": "זה קורה עכשיו ממש (רסקיו), או שזה כבר נמשך ונישא זמן (תרופה אישית לפי המצב)?",
      "discriminates_vs": [
        "rock_rose",
        "star_of_bethlehem"
      ],
      "safety_note": "שימוש יומיומי ברסקיו מעיד על מצב מתמשך שדורש תערובת אישית ולא רק תמצית חירום. במקרה חירום רפואי יש לפנות לטיפול רפואי - התמצית לכל היותר תוספת."
    }
  },
  "clusters": {
    "fatigue": [
      "olive",
      "hornbeam",
      "oak",
      "elm"
    ],
    "fear": [
      "mimulus",
      "aspen",
      "rock_rose",
      "cherry_plum",
      "red_chestnut"
    ],
    "despair": [
      "gentian",
      "gorse",
      "sweet_chestnut",
      "mustard"
    ],
    "decision": [
      "cerato",
      "scleranthus",
      "wild_oat"
    ],
    "influence": [
      "centaury",
      "walnut",
      "cerato",
      "agrimony"
    ],
    "anger": [
      "holly",
      "willow",
      "beech"
    ]
  },
  "cluster_exceptions": [
    [
      "aspen",
      "mimulus"
    ]
  ],
  "opposite_pairs": [
    [
      "impatiens",
      "clematis"
    ],
    [
      "vervain",
      "wild_rose"
    ],
    [
      "vine",
      "centaury"
    ]
  ],
  "opposite_note_he": "מצבים הפוכים - כדאי לוודא ששני המצבים אכן קיימים אצל המטופל/ת.",
  "complements": [
    {
      "primary": "agrimony",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות",
            "לילה"
          ],
          "weight": 2
        },
        {
          "terms": [
            "לא",
            "ישן",
            "בלילות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "מחשבות לילה מעגליות מתחת לחיוך",
      "rationale_he": "האי-שקט הלילי לרוב נשאר מוסתר ביום.",
      "source": "common_practice"
    },
    {
      "primary": "agrimony",
      "candidate": "centaury",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "יודע",
            "לסרב"
          ],
          "weight": 3
        }
      ],
      "condition_he": "לא מסוגל/ת לסרב לבקשות",
      "rationale_he": "שני המצבים חולקים הימנעות מעימות.",
      "source": "common_practice"
    },
    {
      "primary": "agrimony",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        },
        {
          "terms": [
            "שבירת",
            "הרגל"
          ],
          "weight": 2
        }
      ],
      "condition_he": "שבירת הרגל או מעבר חיים",
      "rationale_he": "תומכת בהתמודדות עם שינוי תוך כדי חשיפת הכאב.",
      "source": "common_practice"
    },
    {
      "primary": "agrimony",
      "candidate": "crab_apple",
      "trigger_patterns": [
        {
          "terms": [
            "גועל",
            "מהרגל"
          ],
          "weight": 2
        },
        {
          "terms": [
            "גועל",
            "עצמי"
          ],
          "weight": 2
        }
      ],
      "condition_he": "גועל עצמי מהרגל שמוסתר",
      "rationale_he": "מכסה את רובד הגועל שמתחת לחיוך.",
      "source": "common_practice"
    },
    {
      "primary": "agrimony",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        },
        {
          "terms": [
            "טראומה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הלם מוסתר מאחורי העליצות",
      "rationale_he": "בשכול, כשהאבל מוסתר מאחורי חיוך.",
      "source": "author"
    },
    {
      "primary": "aspen",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד",
            "חושך"
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
      "condition_he": "פחדי לילה עם רכיב מוכר ורכיב עמום",
      "rationale_he": "מרכז באך: פחד מהחושך עם רכיב 'משהו' יחד.",
      "source": "bach_centre"
    },
    {
      "primary": "aspen",
      "candidate": "rock_rose",
      "trigger_patterns": [
        {
          "terms": [
            "פאניקה"
          ],
          "weight": 3
        },
        {
          "terms": [
            "בהלה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הפחד מגיע לפאניקה",
      "rationale_he": "כשהעוצמה מסלימה מעבר לחרדה עמומה.",
      "source": "common_practice"
    },
    {
      "primary": "aspen",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "הרהור לילי נלווה",
      "rationale_he": "פחד עמום לרוב מתלווה למחשבות חוזרות.",
      "source": "common_practice"
    },
    {
      "primary": "aspen",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        },
        {
          "terms": [
            "מאז",
            "שזה",
            "קרה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הלם ישן ברקע",
      "rationale_he": "פחד עמום עשוי לנבוע מטראומה ישנה שלא עובדה.",
      "source": "common_practice"
    },
    {
      "primary": "beech",
      "candidate": "impatiens",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "סבלנות"
          ],
          "weight": 2
        },
        {
          "terms": [
            "ממהר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "עצבנות עם חיפזון",
      "rationale_he": "הביקורתיות מלווה בחוסר סבלנות.",
      "source": "common_practice"
    },
    {
      "primary": "beech",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "שנאה"
          ],
          "weight": 3
        },
        {
          "terms": [
            "עוין"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הביקורת הופכת לעוינות ממשית",
      "rationale_he": "כשהביקורת חוצה לעוינות פעילה.",
      "source": "common_practice"
    },
    {
      "primary": "beech",
      "candidate": "vine",
      "trigger_patterns": [
        {
          "terms": [
            "שתלטן"
          ],
          "weight": 3
        },
        {
          "terms": [
            "דורש",
            "ציות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "שתלטנות נלווית לביקורתיות",
      "rationale_he": "ביקורתיות שמלווה גם בדרישה לציית.",
      "source": "common_practice"
    },
    {
      "primary": "beech",
      "candidate": "rock_water",
      "trigger_patterns": [
        {
          "terms": [
            "פרפקציוניסט"
          ],
          "weight": 3
        },
        {
          "terms": [
            "נוקשות",
            "עצמית"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הנוקשות פונה גם כלפי עצמו/ה",
      "rationale_he": "ביקורתיות שאינה מכוונת רק החוצה.",
      "source": "common_practice"
    },
    {
      "primary": "centaury",
      "candidate": "vine",
      "trigger_patterns": [
        {
          "terms": [
            "שתלטן"
          ],
          "weight": 3
        },
        {
          "terms": [
            "דורש",
            "ציות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "נוכחות אדם דומיננטי או שתלטן בסביבה",
      "rationale_he": "מרכז באך: ויין וסנטאורי הפכים שלעיתים נדרשים יחד.",
      "source": "bach_centre"
    },
    {
      "primary": "centaury",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        },
        {
          "terms": [
            "צריך",
            "הגנה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "צורך בהגנה מהשפעה חיצונית",
      "rationale_he": "מגן על הגבול העצמי בזמן שינוי.",
      "source": "inference"
    },
    {
      "primary": "centaury",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        },
        {
          "terms": [
            "מרגיש",
            "אשם"
          ],
          "weight": 3
        }
      ],
      "condition_he": "אשמה כשמנסה לסרב",
      "rationale_he": "הקושי לסרב מלווה לעיתים באשמה.",
      "source": "common_practice"
    },
    {
      "primary": "centaury",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "ביטחון",
            "עצמי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חוסר ביטחון עצמי מניע את הציות",
      "rationale_he": "כשהכניעות נובעת מספק עצמי.",
      "source": "common_practice"
    },
    {
      "primary": "centaury",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        },
        {
          "terms": [
            "אין",
            "כוח"
          ],
          "weight": 1
        }
      ],
      "condition_he": "תשישות מעודף נתינה",
      "rationale_he": "השירות המתמיד מתיש.",
      "source": "common_practice"
    },
    {
      "primary": "cerato",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "ביטחון",
            "עצמי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חוסר ביטחון גם ביכולת עצמה",
      "rationale_he": "לצד חוסר האמון בשיקול הדעת.",
      "source": "common_practice"
    },
    {
      "primary": "cerato",
      "candidate": "wild_oat",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "כיוון"
          ],
          "weight": 3
        }
      ],
      "condition_he": "משבר כיוון כללי בחיים",
      "rationale_he": "כשחוסר הביטחון מתרחב לכיוון החיים כולו.",
      "source": "common_practice"
    },
    {
      "primary": "cerato",
      "candidate": "scleranthus",
      "trigger_patterns": [
        {
          "terms": [
            "מתלבט"
          ],
          "weight": 2
        },
        {
          "terms": [
            "בין",
            "שתי",
            "אפשרויות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "התלבטות מעורבת בין שתי אפשרויות",
      "rationale_he": "כשיש גם התלבטות פנימית וגם צורך באישור.",
      "source": "common_practice"
    },
    {
      "primary": "cerato",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "דעות",
            "אחרים"
          ]
        },
        {
          "terms": [
            "מושפע"
          ],
          "weight": 2
        }
      ],
      "condition_he": "צורך בהגנה מדעות אחרים",
      "rationale_he": "מגן על שיקול הדעת מהשפעת דעות זרות.",
      "source": "common_practice"
    },
    {
      "primary": "cherry_plum",
      "candidate": "rock_rose",
      "trigger_patterns": [
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
        }
      ],
      "condition_he": "התקף פאניקה עם פחד מאיבוד שליטה",
      "rationale_he": "שתיהן ברכיבי תמצית החירום.",
      "source": "bach_centre"
    },
    {
      "primary": "cherry_plum",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "כעס",
            "בלתי",
            "נשלט"
          ],
          "weight": 3
        }
      ],
      "condition_he": "זעם בלתי נשלט נלווה",
      "rationale_he": "כשהפחד מאובדן שליטה מלווה בכעס.",
      "source": "common_practice"
    },
    {
      "primary": "cherry_plum",
      "candidate": "crab_apple",
      "trigger_patterns": [
        {
          "terms": [
            "גועל"
          ],
          "weight": 2
        }
      ],
      "condition_he": "גועל מהדחפים עצמם",
      "rationale_he": "תחושת טומאה שמתלווה לדחפים המפחידים.",
      "source": "common_practice"
    },
    {
      "primary": "cherry_plum",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות",
            "מפחיד"
          ],
          "weight": 2
        }
      ],
      "condition_he": "מחשבות חודרניות נלוות",
      "rationale_he": "לצד הפחד מהדחף עצמו.",
      "source": "common_practice"
    },
    {
      "primary": "chestnut_bud",
      "candidate": "clematis",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "מרוכז"
          ],
          "weight": 2
        }
      ],
      "condition_he": "חוסר ריכוז שמוביל לחזרה על טעויות",
      "rationale_he": "הפיזור מונע למידה מהניסיון.",
      "source": "common_practice"
    },
    {
      "primary": "chestnut_bud",
      "candidate": "impatiens",
      "trigger_patterns": [
        {
          "terms": [
            "ממהר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "טעויות מחיפזון",
      "rationale_he": "כשהחזרה על הטעות נובעת מלחץ קצב.",
      "source": "common_practice"
    },
    {
      "primary": "chestnut_bud",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "שבירת",
            "הרגל"
          ],
          "weight": 2
        }
      ],
      "condition_he": "רצון לשבור מעגל ישן",
      "rationale_he": "תומכת בשבירת הדפוס החוזר.",
      "source": "common_practice"
    },
    {
      "primary": "chicory",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "קנאה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "קנאה רכושנית",
      "rationale_he": "כשהצורך בתמורה הופך לקנאה.",
      "source": "common_practice"
    },
    {
      "primary": "chicory",
      "candidate": "willow",
      "trigger_patterns": [
        {
          "terms": [
            "מרירות"
          ],
          "weight": 3
        },
        {
          "terms": [
            "למה",
            "דווקא",
            "לי"
          ],
          "weight": 2
        }
      ],
      "condition_he": "רחמים עצמיים מרירים",
      "rationale_he": "כשהפגיעה הופכת למרירות כלפי החיים.",
      "source": "common_practice"
    },
    {
      "primary": "chicory",
      "candidate": "heather",
      "trigger_patterns": [
        {
          "terms": [
            "תשומת",
            "לב"
          ],
          "weight": 2
        }
      ],
      "condition_he": "צורך בתשומת לב",
      "rationale_he": "שני המצבים חולקים צורך בקשב מהסביבה.",
      "source": "common_practice"
    },
    {
      "primary": "chicory",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "הילדים",
            "עוזבים"
          ]
        },
        {
          "terms": [
            "קן",
            "ריק"
          ]
        }
      ],
      "condition_he": "הילדים עוזבים את הבית",
      "rationale_he": "תומכת בהסתגלות לשינוי בתפקיד ההורי.",
      "source": "inference"
    },
    {
      "primary": "clematis",
      "candidate": "chestnut_bud",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "לומד",
            "מהניסיון"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חוסר למידה וקשב",
      "rationale_he": "חלימה בהקיץ שמונעת הפקת לקחים.",
      "source": "common_practice"
    },
    {
      "primary": "clematis",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "בית",
            "ספר",
            "חדש"
          ]
        },
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "ילד/ה בתחילת בית ספר או מעבר",
      "rationale_he": "משלימות בתמיכה בילד בתחילת דרך חדשה.",
      "source": "common_practice"
    },
    {
      "primary": "clematis",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "ניתוק אחרי הלם",
      "rationale_he": "העילפון/הניתוק עלול לנבוע מהלם.",
      "source": "common_practice"
    },
    {
      "primary": "clematis",
      "candidate": "rock_rose",
      "trigger_patterns": [
        {
          "terms": [
            "עילפון"
          ]
        },
        {
          "terms": [
            "פאניקה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "עילפון במצב משבר",
      "rationale_he": "באך עצמו ממליץ על קלמטיס לצד רוק רוז ב'שינה עמוקה' במצב חירום.",
      "source": "bach_centre"
    },
    {
      "primary": "clematis",
      "candidate": "impatiens",
      "trigger_patterns": [
        {
          "terms": [
            "ממהר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "שני קצוות שמופיעים יחד",
      "rationale_he": "הפכים שלעיתים נדרשים יחד, כמו בתמצית החירום עצמה.",
      "source": "author"
    },
    {
      "primary": "crab_apple",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "גיל",
            "המעבר"
          ],
          "weight": 2
        },
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "שינויי גוף ומעברים הורמונליים",
      "rationale_he": "תומכת בהסתגלות לשינוי הגופני.",
      "source": "common_practice"
    },
    {
      "primary": "crab_apple",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אשמה נלווית לתחושת הלכלוך",
      "rationale_he": "גועל עצמי מתלווה לעיתים לאשמה.",
      "source": "common_practice"
    },
    {
      "primary": "crab_apple",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        },
        {
          "terms": [
            "טראומה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "תחושת \"זיהום\" טראומטי",
      "rationale_he": "תחושת הלכלוך עשויה לנבוע מאירוע טראומטי.",
      "source": "common_practice"
    },
    {
      "primary": "crab_apple",
      "candidate": "rock_water",
      "trigger_patterns": [
        {
          "terms": [
            "פרפקציוניסט"
          ],
          "weight": 2
        }
      ],
      "condition_he": "גועל פרפקציוניסטי מהגוף או מהתזונה",
      "rationale_he": "כשהגועל מלווה במשמעת עצמית קיצונית.",
      "source": "common_practice"
    },
    {
      "primary": "elm",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        },
        {
          "terms": [
            "אין",
            "כוח"
          ],
          "weight": 1
        }
      ],
      "condition_he": "עומס עם תשישות אמיתית - לבחור אחת לפי תזמון העייפות",
      "rationale_he": "אחרי מאמץ ממושך, לא רק עומס רגעי.",
      "source": "common_practice"
    },
    {
      "primary": "elm",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "רשימות משימות שרצות בלילה",
      "rationale_he": "העומס ממשיך כמחשבות טורדניות בלילה.",
      "source": "common_practice"
    },
    {
      "primary": "elm",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "ביטחון",
            "עצמי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "לקראת מבחן עם חוסר ביטחון",
      "rationale_he": "שילוב מבחנים של ברנרד.",
      "source": "author"
    },
    {
      "primary": "elm",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "תפקיד",
            "חדש"
          ]
        }
      ],
      "condition_he": "תפקיד חדש שדורש הסתגלות",
      "rationale_he": "העומס מגיע עם שינוי תפקיד.",
      "source": "inference"
    },
    {
      "primary": "gentian",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "ביטחון",
            "עצמי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "נסיגה שמזינה חוסר ביטחון",
      "rationale_he": "שילוב מבחנים של ברנרד.",
      "source": "author"
    },
    {
      "primary": "gentian",
      "candidate": "willow",
      "trigger_patterns": [
        {
          "terms": [
            "מרירות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "טינה על הנסיגה",
      "rationale_he": "הכישלון הנקודתי הופך למרירות.",
      "source": "common_practice"
    },
    {
      "primary": "gentian",
      "candidate": "gorse",
      "trigger_patterns": [
        {
          "terms": [
            "אין",
            "תקווה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "התקווה כמעט אבדה - לבחור אחת מהשתיים לפי העוצמה",
      "rationale_he": "ייתכן שהמצב הסלים לחוסר תקווה עמוק יותר.",
      "source": "common_practice"
    },
    {
      "primary": "gentian",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "פוטרתי"
          ]
        },
        {
          "terms": [
            "איבד",
            "עבודה"
          ]
        }
      ],
      "condition_he": "אובדן עבודה",
      "rationale_he": "רשימת מרכז באך לאובדן עבודה: מימולוס, ג'נציאנה, גורס, וולנאט.",
      "source": "bach_centre"
    },
    {
      "primary": "gorse",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "מחלה ממושכת עם תשישות",
      "rationale_he": "חוסר התקווה מלווה בהתרוקנות פיזית.",
      "source": "common_practice"
    },
    {
      "primary": "gorse",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "אבחנה",
            "קשה"
          ]
        },
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אחרי אבחנה רפואית קשה",
      "rationale_he": "האבחנה עצמה עלולה להיות הלם.",
      "source": "common_practice"
    },
    {
      "primary": "gorse",
      "candidate": "willow",
      "trigger_patterns": [
        {
          "terms": [
            "מרירות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מרירות על המחלה",
      "rationale_he": "חוסר התקווה מלווה בתחושת עוול.",
      "source": "common_practice"
    },
    {
      "primary": "gorse",
      "candidate": "wild_rose",
      "trigger_patterns": [
        {
          "terms": [
            "אדיש"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אדישות נלווית",
      "rationale_he": "חוסר התקווה מוביל לפעמים להשלמה אדישה.",
      "source": "common_practice"
    },
    {
      "primary": "heather",
      "candidate": "chicory",
      "trigger_patterns": [
        {
          "terms": [
            "תשומת",
            "לב"
          ],
          "weight": 2
        }
      ],
      "condition_he": "חיפוש תשומת לב רכושני",
      "rationale_he": "הצורך בקשב הופך לתביעה ממוקדת.",
      "source": "common_practice"
    },
    {
      "primary": "heather",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "מפחד",
            "להיות",
            "לבד"
          ],
          "weight": 2
        }
      ],
      "condition_he": "פחד מוחשי מלהיות לבד",
      "rationale_he": "הקושי להיות לבד נובע לעיתים גם מפחד.",
      "source": "common_practice"
    },
    {
      "primary": "heather",
      "candidate": "willow",
      "trigger_patterns": [
        {
          "terms": [
            "מרירות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "רחמים עצמיים נלווים",
      "rationale_he": "הסיפורים חוזרים לעיתים סביב תחושת קיפוח.",
      "source": "common_practice"
    },
    {
      "primary": "holly",
      "candidate": "willow",
      "trigger_patterns": [
        {
          "terms": [
            "מרירות"
          ],
          "weight": 3
        },
        {
          "terms": [
            "כעס",
            "על",
            "האקס"
          ]
        }
      ],
      "condition_he": "גירושין: כעס על האקס לצד מרירות על הגורל",
      "rationale_he": "הכעס והמרירות מופיעים יחד בפרידה.",
      "source": "inference"
    },
    {
      "primary": "holly",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "בגידה"
          ]
        },
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הלם מבגידה מתחת לכעס",
      "rationale_he": "הולי היא התגובה הפעילה לטראומה, סטאר אוף בת'להם הסבילה.",
      "source": "common_practice"
    },
    {
      "primary": "holly",
      "candidate": "chicory",
      "trigger_patterns": [
        {
          "terms": [
            "קנאה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "קנאה רכושנית",
      "rationale_he": "הקנאה עשויה לנבוע מצורך רכושני.",
      "source": "common_practice"
    },
    {
      "primary": "holly",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "תינוק",
            "חדש"
          ]
        },
        {
          "terms": [
            "אח",
            "קטן"
          ]
        }
      ],
      "condition_he": "קנאת אחים כשנולד תינוק",
      "rationale_he": "תומכת בהסתגלות לשינוי המשפחתי.",
      "source": "common_practice"
    },
    {
      "primary": "holly",
      "candidate": "cherry_plum",
      "trigger_patterns": [
        {
          "terms": [
            "איבד",
            "שליטה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "אובדן שליטה בזמן הכעס",
      "rationale_he": "כשהכעס מגיע לכדי איבוד שליטה.",
      "source": "common_practice"
    },
    {
      "primary": "honeysuckle",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "עליתי"
          ]
        },
        {
          "terms": [
            "עלייה"
          ]
        },
        {
          "terms": [
            "הגירה"
          ]
        },
        {
          "terms": [
            "מעבר",
            "דירה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הגירה, עלייה או מעבר דירה",
      "rationale_he": "שילוב מרכזי בהקשר הישראלי - געגוע לצד הסתגלות לשינוי.",
      "source": "common_practice"
    },
    {
      "primary": "honeysuckle",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        },
        {
          "terms": [
            "אבל"
          ]
        }
      ],
      "condition_he": "אבל עם היאחזות באדם שאבד",
      "rationale_he": "הגעגוע נטוע באובדן שלא עובד.",
      "source": "author"
    },
    {
      "primary": "honeysuckle",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "חרטה שהפכה לאשמה",
      "rationale_he": "הגעגוע לעבר מתערבב באשמה.",
      "source": "common_practice"
    },
    {
      "primary": "honeysuckle",
      "candidate": "wild_rose",
      "trigger_patterns": [
        {
          "terms": [
            "אדיש"
          ],
          "weight": 2
        }
      ],
      "condition_he": "חוסר עניין בהווה",
      "rationale_he": "הריחוק מההווה מתבטא גם כאדישות.",
      "source": "common_practice"
    },
    {
      "primary": "hornbeam",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "יש גם התרוקנות אמיתית - לא להציע בלי ראיה לשני מצבים נפרדים",
      "rationale_he": "לוודא שזו לא אותה עייפות תחת שני שמות.",
      "source": "common_practice"
    },
    {
      "primary": "hornbeam",
      "candidate": "wild_oat",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "כיוון"
          ],
          "weight": 3
        }
      ],
      "condition_he": "שעמום משגרה שמצביע על מסלול לא נכון",
      "rationale_he": "העייפות עשויה לרמז על חוסר משמעות בדרך.",
      "source": "common_practice"
    },
    {
      "primary": "hornbeam",
      "candidate": "gentian",
      "trigger_patterns": [
        {
          "terms": [
            "מדוכא"
          ]
        },
        {
          "terms": [
            "מורל",
            "נמוך"
          ]
        }
      ],
      "condition_he": "מורל נמוך נלווה",
      "rationale_he": "העייפות המנטלית מלווה בירידת מורל.",
      "source": "common_practice"
    },
    {
      "primary": "impatiens",
      "candidate": "vervain",
      "trigger_patterns": [
        {
          "terms": [
            "התלהבות",
            "יתר"
          ],
          "weight": 3
        }
      ],
      "condition_he": "אנשים דחופים, יזמים ופעילים",
      "rationale_he": "הקצב הנמרץ משותף לשתי התמציות.",
      "source": "inference"
    },
    {
      "primary": "impatiens",
      "candidate": "beech",
      "trigger_patterns": [
        {
          "terms": [
            "ביקורתי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "עצבנות כלפי אחרים",
      "rationale_he": "חוסר הסבלנות הופך לביקורתיות.",
      "source": "common_practice"
    },
    {
      "primary": "impatiens",
      "candidate": "chestnut_bud",
      "trigger_patterns": [
        {
          "terms": [
            "חוזר",
            "על",
            "אותה",
            "טעות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "טעויות מחיפזון",
      "rationale_he": "הקצב המהיר מוביל לטעויות חוזרות.",
      "source": "common_practice"
    },
    {
      "primary": "impatiens",
      "candidate": "elm",
      "trigger_patterns": [
        {
          "terms": [
            "דדליין"
          ]
        },
        {
          "terms": [
            "עומס"
          ],
          "weight": 1
        }
      ],
      "condition_he": "לחץ של דדליין",
      "rationale_he": "חוסר הסבלנות מתעצם תחת לחץ זמן.",
      "source": "common_practice"
    },
    {
      "primary": "impatiens",
      "candidate": "clematis",
      "trigger_patterns": [
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
        }
      ],
      "condition_he": "הפכים שמתקיימים יחד, כמו בתמצית החירום",
      "rationale_he": "קצב מהיר וניתוק - זוג הפכים מתועד.",
      "source": "bach_centre"
    },
    {
      "primary": "larch",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד",
            "מבחן"
          ],
          "weight": 3
        },
        {
          "terms": [
            "חרדת",
            "ביצוע"
          ]
        }
      ],
      "condition_he": "חרדת ביצוע ומבחנים",
      "rationale_he": "פחד מהמצב לצד ספק ביכולת.",
      "source": "common_practice"
    },
    {
      "primary": "larch",
      "candidate": "gentian",
      "trigger_patterns": [
        {
          "terms": [
            "מתייאש"
          ],
          "weight": 1
        }
      ],
      "condition_he": "מבחנים - יחד עם אלם",
      "rationale_he": "תערובת מבחנים של ברנרד: ג'נציאנה, אלם, קלמטיס, לארץ'.",
      "source": "author"
    },
    {
      "primary": "larch",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "מאשים",
            "את",
            "עצמ"
          ],
          "weight": 3
        }
      ],
      "condition_he": "נכשל ומאשים את עצמו",
      "rationale_he": "חוסר הביטחון מתלווה לאשמה אחרי כישלון.",
      "source": "common_practice"
    },
    {
      "primary": "larch",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "פרק",
            "חדש"
          ]
        }
      ],
      "condition_he": "פתיחת פרק חדש",
      "rationale_he": "תומכת בביטחון בתחילת דרך חדשה.",
      "source": "inference"
    },
    {
      "primary": "mimulus",
      "candidate": "aspen",
      "trigger_patterns": [
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
        }
      ],
      "condition_he": "פחדים עם שם ובלי שם",
      "rationale_he": "מרכז באך: כששני הרכיבים קיימים יחד.",
      "source": "bach_centre"
    },
    {
      "primary": "mimulus",
      "candidate": "larch",
      "trigger_patterns": [
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
        }
      ],
      "condition_he": "פחד מהמבחן לצד ספק ביכולת",
      "rationale_he": "פחד מהמצב יחד עם ציפייה לכישלון.",
      "source": "common_practice"
    },
    {
      "primary": "mimulus",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "בית",
            "ספר",
            "חדש"
          ]
        },
        {
          "terms": [
            "עלייה"
          ]
        }
      ],
      "condition_he": "פחד מהחדש (בית ספר חדש, עלייה)",
      "rationale_he": "תומכת בהסתגלות למצב החדש שממנו נובע הפחד.",
      "source": "common_practice"
    },
    {
      "primary": "mimulus",
      "candidate": "rock_rose",
      "trigger_patterns": [
        {
          "terms": [
            "פאניקה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הסלמה לפאניקה",
      "rationale_he": "הפחד הממוקד מסלים לעיתים לפאניקה.",
      "source": "common_practice"
    },
    {
      "primary": "mimulus",
      "candidate": "red_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "דואג",
            "לילד"
          ],
          "weight": 3
        }
      ],
      "condition_he": "אבל מקדים: חרדה לחולה ופחד מההתמודדות",
      "rationale_he": "פחד עצמי לצד דאגה ליקיר חולה.",
      "source": "author"
    },
    {
      "primary": "mustard",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הענן מגיע עם תשישות",
      "rationale_he": "העצבות הפתאומית מלווה בהתרוקנות.",
      "source": "common_practice"
    },
    {
      "primary": "mustard",
      "candidate": "scleranthus",
      "trigger_patterns": [
        {
          "terms": [
            "תנודות",
            "מצב",
            "רוח"
          ],
          "weight": 2
        }
      ],
      "condition_he": "תנודות מעלה-מטה",
      "rationale_he": "הענן שבא והולך דומה לתנודתיות.",
      "source": "common_practice"
    },
    {
      "primary": "mustard",
      "candidate": "honeysuckle",
      "trigger_patterns": [
        {
          "terms": [
            "געגוע"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הענן קשור לאובדנים מהעבר",
      "rationale_he": "העצבות הפתאומית עשויה לנבוע מגעגוע.",
      "source": "common_practice"
    },
    {
      "primary": "oak",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        },
        {
          "terms": [
            "התרוקן"
          ]
        }
      ],
      "condition_he": "הסטואי שהתרוקן סוף סוף",
      "rationale_he": "לאחר התמדה ממושכת מגיע שלב ההתרוקנות.",
      "source": "common_practice"
    },
    {
      "primary": "oak",
      "candidate": "elm",
      "trigger_patterns": [
        {
          "terms": [
            "מוצף"
          ],
          "weight": 1
        }
      ],
      "condition_he": "שיאי הצפה",
      "rationale_he": "ההתמדה הכרונית כוללת גם רגעי הצפה חריפים.",
      "source": "common_practice"
    },
    {
      "primary": "oak",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אשמה על מנוחה",
      "rationale_he": "הקושי לנוח מלווה באשמה.",
      "source": "common_practice"
    },
    {
      "primary": "oak",
      "candidate": "rock_water",
      "trigger_patterns": [
        {
          "terms": [
            "נוקשות",
            "עצמית"
          ],
          "weight": 3
        }
      ],
      "condition_he": "דרישות עצמיות נוקשות",
      "rationale_he": "ההתמדה נשענת לעיתים על משמעת עצמית קשוחה.",
      "source": "common_practice"
    },
    {
      "primary": "olive",
      "candidate": "oak",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "מוותר"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הגיע לכאן מעודף מאמץ מתמשך",
      "rationale_he": "התשישות מגיעה אחרי דפוס של המשך בכוח.",
      "source": "common_practice"
    },
    {
      "primary": "olive",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "חוסר שינה בגלל מחשבות",
      "rationale_he": "רשימת מרכז באך לנדודי שינה: וויט צ'סנאט למחשבות, אוליב לתשישות.",
      "source": "bach_centre"
    },
    {
      "primary": "olive",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "תינוק",
            "חדש"
          ]
        },
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "מעבר, למשל תינוק חדש",
      "rationale_he": "התשישות מגיעה עם שינוי גדול בחיים.",
      "source": "common_practice"
    },
    {
      "primary": "olive",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        },
        {
          "terms": [
            "טראומה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "תשישות שבאה אחרי טראומה",
      "rationale_he": "ההתרוקנות עשויה להיות תוצאה של הלם.",
      "source": "common_practice"
    },
    {
      "primary": "olive",
      "candidate": "gorse",
      "trigger_patterns": [
        {
          "terms": [
            "מחלה",
            "ממושכת"
          ]
        }
      ],
      "condition_he": "מחלה ממושכת",
      "rationale_he": "תשישות שמלווה גם באובדן תקווה.",
      "source": "common_practice"
    },
    {
      "primary": "pine",
      "candidate": "centaury",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "יודע",
            "לסרב"
          ],
          "weight": 3
        }
      ],
      "condition_he": "אשמה שמקשה לסרב",
      "rationale_he": "האשמה מחזקת את הקושי לומר לא.",
      "source": "common_practice"
    },
    {
      "primary": "pine",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "מספיק",
            "טוב"
          ],
          "weight": 3
        }
      ],
      "condition_he": "ערך עצמי נמוך נלווה",
      "rationale_he": "האשמה מזינה תחושת חוסר ערך.",
      "source": "common_practice"
    },
    {
      "primary": "pine",
      "candidate": "crab_apple",
      "trigger_patterns": [
        {
          "terms": [
            "מלוכלכ"
          ]
        },
        {
          "terms": [
            "גועל",
            "עצמי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מתחרט/ת ומרגיש/ה \"מלוכלך\" אחרי מעשה",
      "rationale_he": "האשמה הופכת לתחושת טומאה עצמית.",
      "source": "common_practice"
    },
    {
      "primary": "pine",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אבל עם אשמה",
      "rationale_he": "האשמה מתלווה לעיתים לאובדן.",
      "source": "author"
    },
    {
      "primary": "red_chestnut",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "הרהור לילי על יקירים",
      "rationale_he": "הדאגה הופכת למחשבות חוזרות בלילה.",
      "source": "common_practice"
    },
    {
      "primary": "red_chestnut",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד"
          ],
          "weight": 1
        }
      ],
      "condition_he": "יש גם פחדים לעצמו/ה",
      "rationale_he": "לצד הדאגה ליקירים יש גם פחד אישי.",
      "source": "common_practice"
    },
    {
      "primary": "red_chestnut",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "הילד",
            "עוזב"
          ]
        },
        {
          "terms": [
            "התגייס"
          ]
        }
      ],
      "condition_he": "הילד/ה עוזב/ת את הבית",
      "rationale_he": "תומכת בהסתגלות לשלב חדש בהורות.",
      "source": "common_practice"
    },
    {
      "primary": "rock_rose",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הלם אחרי האירוע",
      "rationale_he": "שתיהן ברכיבי תמצית החירום.",
      "source": "bach_centre"
    },
    {
      "primary": "rock_rose",
      "candidate": "cherry_plum",
      "trigger_patterns": [
        {
          "terms": [
            "איבד",
            "שליטה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "\"אני מאבד/ת את זה\"",
      "rationale_he": "הפאניקה מלווה בפחד מאיבוד שליטה.",
      "source": "common_practice"
    },
    {
      "primary": "rock_rose",
      "candidate": "clematis",
      "trigger_patterns": [
        {
          "terms": [
            "עילפון"
          ]
        }
      ],
      "condition_he": "עילפון או ניתוק במשבר",
      "rationale_he": "באך עצמו, ב-Twelve Healers.",
      "source": "bach_centre"
    },
    {
      "primary": "rock_rose",
      "candidate": "agrimony",
      "trigger_patterns": [
        {
          "terms": [
            "עינוי"
          ]
        }
      ],
      "condition_he": "תחושת \"עינוי\" נלווית",
      "rationale_he": "באך עצמו, ב-Twelve Healers.",
      "source": "bach_centre"
    },
    {
      "primary": "rock_rose",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד"
          ],
          "weight": 1
        }
      ],
      "condition_he": "הפחד הספציפי שנשאר אחרי הפאניקה",
      "rationale_he": "אחרי שהבהלה חולפת, נשאר פחד ממוקד.",
      "source": "common_practice"
    },
    {
      "primary": "rock_water",
      "candidate": "crab_apple",
      "trigger_patterns": [
        {
          "terms": [
            "גועל"
          ],
          "weight": 2
        }
      ],
      "condition_he": "נושאי טוהר סביב אוכל וגוף",
      "rationale_he": "הנוקשות מתמקדת בטוהר גופני.",
      "source": "common_practice"
    },
    {
      "primary": "rock_water",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "האשמה העצמית אחרי \"מעידה\"",
      "rationale_he": "המשמעת הקשוחה מלווה באשמה כשנשברת.",
      "source": "common_practice"
    },
    {
      "primary": "rock_water",
      "candidate": "oak",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "מוותר"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מאמץ יתר",
      "rationale_he": "הנוקשות מתבטאת גם כהתמדה קיצונית.",
      "source": "common_practice"
    },
    {
      "primary": "rock_water",
      "candidate": "beech",
      "trigger_patterns": [
        {
          "terms": [
            "ביקורתי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הנוקשות הופכת לחוסר סובלנות כלפי אחרים",
      "rationale_he": "המשמעת העצמית מוקרנת גם החוצה.",
      "source": "common_practice"
    },
    {
      "primary": "scleranthus",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "גיל",
            "המעבר"
          ],
          "weight": 2
        }
      ],
      "condition_he": "מעברים הורמונליים וגיל המעבר",
      "rationale_he": "יחד עם קראב אפל ואוליב.",
      "source": "common_practice"
    },
    {
      "primary": "scleranthus",
      "candidate": "wild_oat",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "כיוון"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חוסר כיוון לצד התלבטות בין שני מסלולים",
      "rationale_he": "ההתלבטות הנקודתית מתרחבת לכיוון הכללי.",
      "source": "common_practice"
    },
    {
      "primary": "scleranthus",
      "candidate": "cerato",
      "trigger_patterns": [
        {
          "terms": [
            "מתייעץ"
          ],
          "weight": 2
        }
      ],
      "condition_he": "התלבטות מעורבת עם צורך להתייעץ",
      "rationale_he": "כשההתנדנדות הפנימית מלווה גם בפנייה לעצה.",
      "source": "common_practice"
    },
    {
      "primary": "star_of_bethlehem",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "מעבר"
          ],
          "weight": 1
        }
      ],
      "condition_he": "הסתגלות למציאות חדשה",
      "rationale_he": "תומכת בקליטת המציאות שאחרי ההלם.",
      "source": "common_practice"
    },
    {
      "primary": "star_of_bethlehem",
      "candidate": "honeysuckle",
      "trigger_patterns": [
        {
          "terms": [
            "געגוע"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אבל שהופך לחיים בעבר",
      "rationale_he": "ההלם מתפתח להיאחזות בעבר.",
      "source": "common_practice"
    },
    {
      "primary": "star_of_bethlehem",
      "candidate": "sweet_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "הגעתי",
            "לקצה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "ייסורים אחרי אובדן",
      "rationale_he": "ההלם עלול להעמיק לייסורים בקצה הסבל.",
      "source": "common_practice"
    },
    {
      "primary": "star_of_bethlehem",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "כעס"
          ],
          "weight": 2
        }
      ],
      "condition_he": "טראומה שהפכה לכעס",
      "rationale_he": "התגובה הסבילה עשויה להתפתח לתגובה פעילה של כעס.",
      "source": "common_practice"
    },
    {
      "primary": "star_of_bethlehem",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "אשמה"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אשמה בשכול",
      "rationale_he": "האבל מתלווה לעיתים באשמת הניצול.",
      "source": "author"
    },
    {
      "primary": "sweet_chestnut",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הלם מתחת לייאוש",
      "rationale_he": "קצה גבול הסבל עשוי לנבוע גם מהלם.",
      "source": "common_practice"
    },
    {
      "primary": "sweet_chestnut",
      "candidate": "cherry_plum",
      "trigger_patterns": [
        {
          "terms": [
            "איבד",
            "שליטה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "פחד \"להישבר\" - גם דגל בטיחות",
      "rationale_he": "הקצה הנפשי מלווה לעיתים בפחד מאיבוד שליטה - לוודא הפניה מקצועית.",
      "source": "common_practice"
    },
    {
      "primary": "sweet_chestnut",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אחרי מאבק ארוך",
      "rationale_he": "הייסורים מגיעים בשילוב עם התרוקנות.",
      "source": "common_practice"
    },
    {
      "primary": "vervain",
      "candidate": "impatiens",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "סבלנות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מתח וחיפזון",
      "rationale_he": "הלהט מתלווה לקצב מהיר.",
      "source": "common_practice"
    },
    {
      "primary": "vervain",
      "candidate": "white_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "מחשבות"
          ],
          "weight": 1
        }
      ],
      "condition_he": "מוח שרץ בלילה",
      "rationale_he": "הלהט הרעיוני ממשיך גם בלילה.",
      "source": "common_practice"
    },
    {
      "primary": "vervain",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אחרי שחיקה",
      "rationale_he": "הלהט הבלתי פוסק מתיש בסוף.",
      "source": "common_practice"
    },
    {
      "primary": "vervain",
      "candidate": "wild_rose",
      "trigger_patterns": [
        {
          "terms": [
            "אדיש"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הפכים שלעיתים נדרשים יחד",
      "rationale_he": "מרכז באך מציין זאת במפורש.",
      "source": "bach_centre"
    },
    {
      "primary": "vine",
      "candidate": "beech",
      "trigger_patterns": [
        {
          "terms": [
            "ביקורתי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מנהל/ת שתלטן/ית וביקורתי/ת",
      "rationale_he": "השליטה מלווה בביקורתיות.",
      "source": "common_practice"
    },
    {
      "primary": "vine",
      "candidate": "impatiens",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "סבלנות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חיפזון עצבני",
      "rationale_he": "השתלטנות מתלווה לקוצר רוח.",
      "source": "common_practice"
    },
    {
      "primary": "vine",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "כעס"
          ],
          "weight": 2
        }
      ],
      "condition_he": "כעס נלווה",
      "rationale_he": "כשהשתלטנות מתפתחת לכעס גלוי.",
      "source": "common_practice"
    },
    {
      "primary": "vine",
      "candidate": "centaury",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "יודע",
            "לסרב"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הפכים שנדרשים יחד",
      "rationale_he": "מרכז באך מציין זאת במפורש.",
      "source": "bach_centre"
    },
    {
      "primary": "walnut",
      "candidate": "honeysuckle",
      "trigger_patterns": [
        {
          "terms": [
            "געגוע"
          ],
          "weight": 2
        }
      ],
      "condition_he": "געגוע במעבר",
      "rationale_he": "השינוי מלווה בגעגוע למה שהיה.",
      "source": "common_practice"
    },
    {
      "primary": "walnut",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד"
          ],
          "weight": 1
        }
      ],
      "condition_he": "פחד מהחדש",
      "rationale_he": "השינוי מעורר גם פחד ממוקד.",
      "source": "common_practice"
    },
    {
      "primary": "walnut",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "השינוי היה הלם",
      "rationale_he": "כשהמעבר עצמו הגיע כהלם.",
      "source": "common_practice"
    },
    {
      "primary": "walnut",
      "candidate": "centaury",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "יודע",
            "לסרב"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מעורב אדם דומיננטי",
      "rationale_he": "ההשפעה החיצונית מנוצלת בגלל קושי לסרב.",
      "source": "common_practice"
    },
    {
      "primary": "walnut",
      "candidate": "wild_oat",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "כיוון"
          ],
          "weight": 3
        }
      ],
      "condition_he": "מעבר קריירה",
      "rationale_he": "השינוי מלווה בחוסר כיוון כללי.",
      "source": "common_practice"
    },
    {
      "primary": "walnut",
      "candidate": "crab_apple",
      "trigger_patterns": [
        {
          "terms": [
            "גיל",
            "המעבר"
          ],
          "weight": 2
        }
      ],
      "condition_he": "מעבר גופני (למשל גיל המעבר)",
      "rationale_he": "השינוי הפיזי מלווה בתחושת אי-נוחות מהגוף.",
      "source": "common_practice"
    },
    {
      "primary": "water_violet",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "אבל שנישא לבד",
      "rationale_he": "ההתבודדות עלולה להיות דרך להתמודד עם אובדן.",
      "source": "common_practice"
    },
    {
      "primary": "water_violet",
      "candidate": "beech",
      "trigger_patterns": [
        {
          "terms": [
            "ביקורתי"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הריחוק הופך לביקורת",
      "rationale_he": "העמדה המסויגת מתלווה לעיתים לביקורתיות.",
      "source": "common_practice"
    },
    {
      "primary": "water_violet",
      "candidate": "rock_water",
      "trigger_patterns": [
        {
          "terms": [
            "נוקשות",
            "עצמית"
          ],
          "weight": 3
        }
      ],
      "condition_he": "משמעת עצמית קשוחה",
      "rationale_he": "העצמאות הגאה מלווה בקפדנות עצמית.",
      "source": "common_practice"
    },
    {
      "primary": "white_chestnut",
      "candidate": "red_chestnut",
      "trigger_patterns": [
        {
          "terms": [
            "דואג",
            "לילד"
          ],
          "weight": 3
        }
      ],
      "condition_he": "תוכן המחשבות: דאגה ליקירים",
      "rationale_he": "\"תרופת תוכן\" ללולאה - נושא הדאגה.",
      "source": "common_practice"
    },
    {
      "primary": "white_chestnut",
      "candidate": "pine",
      "trigger_patterns": [
        {
          "terms": [
            "מאשים",
            "את",
            "עצמ"
          ],
          "weight": 3
        }
      ],
      "condition_he": "תוכן המחשבות: אשמה עצמית",
      "rationale_he": "\"תרופת תוכן\" ללולאה - נושא האשמה.",
      "source": "common_practice"
    },
    {
      "primary": "white_chestnut",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "כעס"
          ],
          "weight": 2
        }
      ],
      "condition_he": "תוכן המחשבות: כעס",
      "rationale_he": "\"תרופת תוכן\" ללולאה - נושא הכעס.",
      "source": "common_practice"
    },
    {
      "primary": "white_chestnut",
      "candidate": "mimulus",
      "trigger_patterns": [
        {
          "terms": [
            "פחד"
          ],
          "weight": 1
        }
      ],
      "condition_he": "תוכן המחשבות: פחד מוכר",
      "rationale_he": "\"תרופת תוכן\" ללולאה - נושא הפחד.",
      "source": "common_practice"
    },
    {
      "primary": "white_chestnut",
      "candidate": "elm",
      "trigger_patterns": [
        {
          "terms": [
            "עומס"
          ],
          "weight": 1
        }
      ],
      "condition_he": "עומס נלווה",
      "rationale_he": "הלולאה המחשבתית מלווה בתחושת עומס.",
      "source": "common_practice"
    },
    {
      "primary": "wild_oat",
      "candidate": "walnut",
      "trigger_patterns": [
        {
          "terms": [
            "מעבר",
            "קריירה"
          ]
        }
      ],
      "condition_he": "מעבר קריירה",
      "rationale_he": "תומכת בהסתגלות לשינוי הכיווני.",
      "source": "common_practice"
    },
    {
      "primary": "wild_oat",
      "candidate": "cerato",
      "trigger_patterns": [
        {
          "terms": [
            "מתייעץ"
          ],
          "weight": 2
        }
      ],
      "condition_he": "מבקש/ת עצות רבות",
      "rationale_he": "חוסר הכיוון מלווה בפנייה מתמדת לעצות.",
      "source": "common_practice"
    },
    {
      "primary": "wild_oat",
      "candidate": "larch",
      "trigger_patterns": [
        {
          "terms": [
            "פחד",
            "להיכשל"
          ],
          "weight": 3
        }
      ],
      "condition_he": "פחד מכישלון חוסם מחויבות",
      "rationale_he": "חוסר הביטחון מונע הכרעה לכיוון.",
      "source": "common_practice"
    },
    {
      "primary": "wild_oat",
      "candidate": "chestnut_bud",
      "trigger_patterns": [
        {
          "terms": [
            "חוזר",
            "על",
            "אותה",
            "טעות"
          ],
          "weight": 3
        }
      ],
      "condition_he": "חוזר על אותן בחירות שגויות",
      "rationale_he": "חוסר הלמידה מנציח את חוסר הכיוון.",
      "source": "common_practice"
    },
    {
      "primary": "wild_rose",
      "candidate": "gorse",
      "trigger_patterns": [
        {
          "terms": [
            "אין",
            "תקווה"
          ],
          "weight": 3
        }
      ],
      "condition_he": "יש גם חוסר תקווה ממשי",
      "rationale_he": "האדישות עלולה להסתיר חוסר תקווה עמוק יותר.",
      "source": "common_practice"
    },
    {
      "primary": "wild_rose",
      "candidate": "olive",
      "trigger_patterns": [
        {
          "terms": [
            "תשישות"
          ],
          "weight": 2
        }
      ],
      "condition_he": "התרוקנות נלווית",
      "rationale_he": "ההשלמה הפסיבית מלווה בתשישות.",
      "source": "common_practice"
    },
    {
      "primary": "wild_rose",
      "candidate": "clematis",
      "trigger_patterns": [
        {
          "terms": [
            "בעננים"
          ],
          "weight": 2
        }
      ],
      "condition_he": "ריחוף וניתוק נלווים",
      "rationale_he": "האדישות מלווה בבריחה למחשבות.",
      "source": "common_practice"
    },
    {
      "primary": "wild_rose",
      "candidate": "vervain",
      "trigger_patterns": [
        {
          "terms": [
            "התלהבות",
            "יתר"
          ],
          "weight": 3
        }
      ],
      "condition_he": "הפכים שלעיתים נדרשים יחד",
      "rationale_he": "מרכז באך מציין זאת במפורש.",
      "source": "bach_centre"
    },
    {
      "primary": "willow",
      "candidate": "holly",
      "trigger_patterns": [
        {
          "terms": [
            "כעס"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הטינה הופכת לכעס או קנאה",
      "rationale_he": "המרירות עלולה להתלקח לכעס פעיל.",
      "source": "common_practice"
    },
    {
      "primary": "willow",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "הלם"
          ],
          "weight": 2
        }
      ],
      "condition_he": "הצרה הייתה הלם",
      "rationale_he": "המרירות נטועה באירוע הלם.",
      "source": "common_practice"
    },
    {
      "primary": "willow",
      "candidate": "gentian",
      "trigger_patterns": [
        {
          "terms": [
            "מדוכא"
          ]
        }
      ],
      "condition_he": "דכדוך נלווה",
      "rationale_he": "המרירות מתלווה לירידת מורל.",
      "source": "common_practice"
    },
    {
      "primary": "willow",
      "candidate": "honeysuckle",
      "trigger_patterns": [
        {
          "terms": [
            "הימים",
            "הטובים"
          ]
        },
        {
          "terms": [
            "געגוע"
          ],
          "weight": 2
        }
      ],
      "condition_he": "\"הימים הטובים\" שאבדו",
      "rationale_he": "המרירות מתלווה לגעגוע לעבר טוב יותר.",
      "source": "common_practice"
    },
    {
      "primary": "rescue_remedy",
      "candidate": "star_of_bethlehem",
      "trigger_patterns": [
        {
          "terms": [
            "מאז",
            "שזה",
            "קרה"
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
        }
      ],
      "condition_he": "ההלם נשאר הרגש המרכזי אחרי המשבר החולף",
      "rationale_he": "רסקיו לרגע החריף; סטאר אוף בת'להם כשההלם נמשך.",
      "source": "bach_centre"
    }
  ],
  "safety_flags": [
    {
      "id": "suicidal_ideation",
      "trigger_patterns": [
        {
          "terms": [
            "לא",
            "רוצה",
            "לחיות"
          ],
          "weight": 3
        },
        {
          "terms": [
            "פגיעה",
            "עצמית"
          ],
          "weight": 3
        },
        {
          "terms": [
            "רוצה",
            "למות"
          ],
          "weight": 3
        },
        {
          "terms": [
            "הגעתי",
            "לקצה"
          ],
          "weight": 2
        },
        {
          "terms": [
            "לשים",
            "קץ"
          ],
          "weight": 3
        },
        {
          "terms": [
            "להתאבד"
          ],
          "weight": 3
        }
      ],
      "remedies": [
        "sweet_chestnut",
        "cherry_plum",
        "gorse",
        "clematis"
      ],
      "message_he": "מחשבות על פגיעה עצמית או באחר, או \"הגעתי לקצה\" - הפניה מיידית לעזרה: ער\"ן 1201, נט\"ל, מד\"א 101 בחירום. התמציות אינן טיפול במצב אובדני.",
      "level": "red"
    },
    {
      "id": "medical_emergency",
      "trigger_patterns": [
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
            "התקף",
            "לב"
          ],
          "weight": 3
        },
        {
          "terms": [
            "לא",
            "נושם"
          ],
          "weight": 3
        },
        {
          "terms": [
            "מדמם"
          ],
          "weight": 3
        }
      ],
      "remedies": [
        "rock_rose",
        "rescue_remedy"
      ],
      "message_he": "אירוע חירום רפואי אפשרי - יש לפנות לטיפול רפואי/מד\"א 101. התמצית לכל היותר תוספת, לא תחליף.",
      "level": "red"
    },
    {
      "id": "prolonged_hopelessness",
      "trigger_patterns": [
        {
          "terms": [
            "חוסר",
            "תקווה"
          ],
          "weight": 2
        },
        {
          "terms": [
            "דיכאון"
          ],
          "weight": 1
        },
        {
          "terms": [
            "אדיש"
          ],
          "weight": 1
        }
      ],
      "remedies": [
        "gorse",
        "wild_rose",
        "mustard",
        "sweet_chestnut"
      ],
      "message_he": "חוסר תקווה ממושך, אדישות או דכדוך ללא סיבה לאורך זמן (בייחוד אצל בני נוער) - מומלצת הערכה מקצועית לדיכאון.",
      "level": "amber"
    },
    {
      "id": "ocd_like",
      "trigger_patterns": [
        {
          "terms": [
            "שטיפה",
            "חוזרת"
          ],
          "weight": 2
        },
        {
          "terms": [
            "בדיקה",
            "חוזרת"
          ],
          "weight": 2
        },
        {
          "terms": [
            "פחד",
            "מזיהום"
          ],
          "weight": 3
        },
        {
          "terms": [
            "חייב",
            "לבדוק",
            "שוב"
          ],
          "weight": 2
        }
      ],
      "remedies": [
        "crab_apple"
      ],
      "message_he": "שטיפה/בדיקה חוזרות או פחד מזיהום - מומלצת הערכה מקצועית (OCD).",
      "level": "amber"
    },
    {
      "id": "eating_disorder",
      "trigger_patterns": [
        {
          "terms": [
            "מגביל",
            "אכילה"
          ],
          "weight": 2
        },
        {
          "terms": [
            "גועל",
            "מהגוף"
          ],
          "weight": 2
        },
        {
          "terms": [
            "לא",
            "אוכל",
            "כלום"
          ],
          "weight": 2
        }
      ],
      "remedies": [
        "rock_water",
        "crab_apple"
      ],
      "message_he": "הגבלת אכילה, משמעת תזונתית קיצונית או גועל מהגוף (בייחוד אצל מתבגרים) - מומלץ סינון להפרעת אכילה.",
      "level": "amber"
    },
    {
      "id": "substance_use",
      "trigger_patterns": [
        {
          "terms": [
            "שותה",
            "כדי",
            "להירגע"
          ],
          "weight": 2
        },
        {
          "terms": [
            "אלכוהול"
          ],
          "weight": 1
        },
        {
          "terms": [
            "סמים"
          ],
          "weight": 2
        }
      ],
      "remedies": [
        "agrimony",
        "cherry_plum"
      ],
      "message_he": "שימוש באלכוהול, סמים או אוכל \"כדי להירגע\" - מומלצת הפניה מקצועית, ולשים לב שהתמציות עצמן מכילות אלכוהול.",
      "level": "amber"
    },
    {
      "id": "adhd_like",
      "trigger_patterns": [
        {
          "terms": [
            "קשיי",
            "קשב"
          ],
          "weight": 2
        },
        {
          "terms": [
            "היפראקטיבי"
          ],
          "weight": 2
        }
      ],
      "remedies": [
        "clematis",
        "impatiens",
        "vervain",
        "chestnut_bud"
      ],
      "message_he": "קשיי קשב או היפראקטיביות - אין להציג את התמציות כטיפול ב-ADHD; מומלצת הערכה מקצועית.",
      "level": "amber"
    },
    {
      "id": "persistent_fatigue",
      "trigger_patterns": [
        {
          "terms": [
            "עייפות",
            "מתמשכת"
          ],
          "weight": 2
        }
      ],
      "remedies": [
        "olive",
        "hornbeam"
      ],
      "message_he": "עייפות מתמשכת - מומלצת בדיקה רפואית (למשל שלילת אנמיה).",
      "level": "amber"
    },
    {
      "id": "special_populations_alcohol",
      "trigger_patterns": [
        {
          "terms": [
            "בהריון"
          ],
          "weight": 2
        },
        {
          "terms": [
            "מחלים",
            "מאלכוהוליזם"
          ],
          "weight": 3
        },
        {
          "terms": [
            "אנטבוס"
          ],
          "weight": 3
        }
      ],
      "remedies": [],
      "message_he": "הריון, החלמה מאלכוהוליזם או נטילת אנטבוס - יש להתייעץ עם רופא/ה לגבי תכולת האלכוהול בתמציות, ולשקול דילול.",
      "level": "amber"
    }
  ]
};
  var PROFILES = KNOWLEDGE.profiles;
  var SOURCE_LABELS = KNOWLEDGE.source_labels;
  var CLUSTERS = KNOWLEDGE.clusters;
  var CLUSTER_EXCEPTIONS = KNOWLEDGE.cluster_exceptions;
  var OPPOSITE_PAIRS = KNOWLEDGE.opposite_pairs;
  var OPPOSITE_NOTE_HE = KNOWLEDGE.opposite_note_he;
  var COMPLEMENTS = KNOWLEDGE.complements;
  var SAFETY_FLAGS = KNOWLEDGE.safety_flags;
  var EVIDENCE_NOTE_HE = KNOWLEDGE.evidence_note_he;

  // ==========================================================================
  // E. שאלון מובנה - 7 קבוצות באך, ואז שאלת-משנה אחת פר קבוצה שנבחרה
  // ==========================================================================

  var SUGGEST_MIN_SCORE = 2;
  var SOFT_BLEND_SIZE_NOTE_THRESHOLD = 7;
  var COMPLEMENTS_MIN_BLEND = 1;
  var COMPLEMENTS_MAX_BLEND = 4;
  var COMPLEMENTS_MAX_TOTAL = 6;
  var COMPLEMENTS_MAX_OPTIONS = 5;

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
      return {
        id: k,
        label: REMEDY_LABELS[k],
        suggested: (descScores[k] || 0) >= SUGGEST_MIN_SCORE,
        // השאלה המבדלת מהפרופיל המקצועי, כרמז שעוזר למטפל/ת להבחין מול
        // תמציות קרובות (למשל מימולוס מול אספן).
        hint: PROFILES[k].discriminating_question,
      };
    });
    options.push({ id: "none", label: NONE_OPTION_LABEL, suggested: false });
    var groupName = group.label.split(" - ")[0];
    var text = "\u05D1\u05EA\u05D7\u05D5\u05DD \u05E9\u05DC " + groupName + ": \u05DE\u05D4 \u05DE\u05EA\u05D5\u05DA \u05D4\u05D1\u05D0\u05D9\u05DD \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DE\u05D8\u05D5\u05E4\u05DC/\u05EA?";
    return { question_id: _groupQuestionId(group.id), text: text, multi: true, options: options };
  }

  // ==========================================================================
  // שאלת התמציות המשלימות - נשאלת פעם אחת אחרי שכל שאלות הקבוצות נענו, אם יש
  // 1-4 תרופות בהרכב ועדיין יש "חדר". מיישמת את כללי דוח bach_knowledge.
  // ==========================================================================

  var COMPLEMENTS_QUESTION_ID = "complements";
  var COMPLEMENTS_QUESTION_TEXT = "תמציות משלימות לשקול (לא חובה)";

  var RESCUE_COMPONENTS_LIST = [
  "cherry_plum",
  "clematis",
  "impatiens",
  "rock_rose",
  "star_of_bethlehem"
];
  var PROTECTIVE_ONLY_WITH_TRIGGER_LIST = [
  "crab_apple",
  "star_of_bethlehem",
  "walnut"
];
  var SOURCE_RANK = {
  "bach_centre": 0,
  "author": 1,
  "common_practice": 2,
  "inference": 3
};

  var RESCUE_COMPONENTS = {};
  RESCUE_COMPONENTS_LIST.forEach(function (k) { RESCUE_COMPONENTS[k] = true; });
  var PROTECTIVE_ONLY_WITH_TRIGGER = {};
  PROTECTIVE_ONLY_WITH_TRIGGER_LIST.forEach(function (k) { PROTECTIVE_ONLY_WITH_TRIGGER[k] = true; });

  // בודק אם אחד מדפוסי הטריגר תואם (לא-שלילי) באחד מרצפי הטוקנים. מחזיר
  // {triggered, maxWeight} - המשקל המקסימלי שנמצא, לשימוש בדירוג "עוצמת הטריגר".
  function _complementTriggered(triggerPatterns, tokenLists) {
    var triggered = false;
    var maxWeight = 0;
    tokenLists.forEach(function (tokens) {
      triggerPatterns.forEach(function (pattern) {
        var terms = pattern.terms;
        var weight = pattern.weight !== undefined ? pattern.weight : 2;
        _findPatternMatches(tokens, terms).forEach(function (range) {
          if (!_isNegated(tokens, range[0], terms)) {
            triggered = true;
            if (weight > maxWeight) maxWeight = weight;
          }
        });
      });
    });
    return { triggered: triggered, maxWeight: maxWeight };
  }

  function _complementSortKey(entry) {
    // כלל "טריגר קודם", ואז מקור, ואז עוצמת טריגר, ואז סדר דטרמיניסטי.
    return [
      entry.triggered ? 0 : 1,
      SOURCE_RANK[entry.source],
      -entry.weight,
      ALL_KEYS.indexOf(entry.candidate),
    ];
  }

  function _sortKeyLess(a, b) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return true;
      if (a[i] > b[i]) return false;
    }
    return false;
  }

  function _pairMatches(pair, x, y) {
    return (pair[0] === x && pair[1] === y) || (pair[0] === y && pair[1] === x);
  }

  // מחזיר מועמדות משלימות מדורגות, פונקציה טהורה ודטרמיניסטית של ההרכב והטקסט.
  function _rankComplements(blendKeys, textSnippets) {
    if (!blendKeys.length) return [];

    var tokenLists = textSnippets.filter(function (s) { return s; }).map(tokenize);
    var blendSet = {};
    blendKeys.forEach(function (k) { blendSet[k] = true; });

    var blendClusters = {};
    Object.keys(CLUSTERS).forEach(function (cname) {
      if (CLUSTERS[cname].some(function (m) { return blendSet[m]; })) blendClusters[cname] = true;
    });

    var bestByCandidate = {};
    COMPLEMENTS.forEach(function (row) {
      var primary = row.primary, candidate = row.candidate;
      if (!blendSet[primary] || blendSet[candidate]) return;

      var tw = _complementTriggered(row.trigger_patterns, tokenLists);
      var triggered = tw.triggered, weight = tw.maxWeight;

      if (PROTECTIVE_ONLY_WITH_TRIGGER[candidate] && !triggered) return;

      var candidateClusters = Object.keys(CLUSTERS).filter(function (cname) { return CLUSTERS[cname].indexOf(candidate) !== -1; });
      if (candidateClusters.some(function (cname) { return blendClusters[cname]; })) {
        var pairDocumented = CLUSTER_EXCEPTIONS.some(function (pair) { return _pairMatches(pair, primary, candidate); });
        if (!pairDocumented) return;
      }

      if (blendSet.rescue_remedy && RESCUE_COMPONENTS[candidate] && !triggered) return;

      if (!triggered && row.source === "inference") return;

      var entry = {
        candidate: candidate, primary: primary, triggered: triggered, weight: weight,
        source: row.source, condition_he: row.condition_he, rationale_he: row.rationale_he,
      };
      var existing = bestByCandidate[candidate];
      if (!existing || _sortKeyLess(_complementSortKey(entry), _complementSortKey(existing))) {
        bestByCandidate[candidate] = entry;
      }
    });

    var ranked = ALL_KEYS.filter(function (k) { return bestByCandidate.hasOwnProperty(k); }).map(function (k) { return bestByCandidate[k]; });
    // ה-filter לפי ALL_KEYS לעיל הוא רק כדי לקבל איטרציה דטרמיניסטית על
    // המפתחות (סדר Object.keys של מחרוזות לא-מספריות ב-JS שומר על סדר
    // הכנסה בכל מקרה, אבל אנחנו ממיינים בפירוש מיד אחר כך, כך שהסדר הראשוני
    // לא משפיע על התוצאה הסופית).
    ranked.sort(function (a, b) {
      var ka = _complementSortKey(a), kb = _complementSortKey(b);
      for (var i = 0; i < ka.length; i++) { if (ka[i] !== kb[i]) return ka[i] - kb[i]; }
      return 0;
    });
    return ranked;
  }

  function _buildComplementsQuestion(rankedCandidates) {
    var options = rankedCandidates.map(function (entry) {
      var candidate = entry.candidate, primary = entry.primary;
      var candName = BY_KEY[candidate].name_he;
      var primaryName = BY_KEY[primary].name_he;
      var label = candName + ": " + entry.condition_he + ". \u05DE\u05E9\u05DC\u05D9\u05DE\u05D4 \u05D0\u05EA " + primaryName + ".";
      var sourceLabel = SOURCE_LABELS[entry.source];
      var hint = entry.rationale_he + " [" + sourceLabel + "]";
      for (var i = 0; i < OPPOSITE_PAIRS.length; i++) {
        if (_pairMatches(OPPOSITE_PAIRS[i], primary, candidate)) {
          hint += " " + OPPOSITE_NOTE_HE;
          break;
        }
      }
      return { id: candidate, label: label, suggested: entry.triggered, hint: hint };
    });
    options.push({ id: "none", label: NONE_OPTION_LABEL, suggested: false });
    return { question_id: COMPLEMENTS_QUESTION_ID, text: COMPLEMENTS_QUESTION_TEXT, multi: true, options: options };
  }

  function _resolveComplements(blendKeys, complementsSelection, textSnippets) {
    if (!complementsSelection || !complementsSelection.length) return [];
    var ranked = _rankComplements(blendKeys, textSnippets);
    var byId = {};
    ranked.forEach(function (e) { byId[e.candidate] = e; });
    return complementsSelection.filter(function (cid) { return byId.hasOwnProperty(cid); }).map(function (cid) { return byId[cid]; });
  }

  // ==========================================================================
  // דגלי בטיחות - מוערכים על התיאור הראשוני + כל הטקסט החופשי שנאסף
  // ==========================================================================

  function _evaluateSafetyFlags(textSnippets) {
    var tokenLists = textSnippets.filter(function (s) { return s; }).map(tokenize);
    var triggered = [];
    SAFETY_FLAGS.forEach(function (flag) {
      var hit = false;
      for (var i = 0; i < tokenLists.length && !hit; i++) {
        var tokens = tokenLists[i];
        for (var j = 0; j < flag.trigger_patterns.length && !hit; j++) {
          var pattern = flag.trigger_patterns[j];
          var terms = pattern.terms;
          var matches = _findPatternMatches(tokens, terms);
          for (var m = 0; m < matches.length; m++) {
            if (!_isNegated(tokens, matches[m][0], terms)) { hit = true; break; }
          }
        }
      }
      if (hit) triggered.push(flag);
    });
    return triggered;
  }

  function _safetyBannerLines(flags) {
    var reds = flags.filter(function (f) { return f.level === "red"; });
    var ambers = flags.filter(function (f) { return f.level === "amber"; });
    var lines = reds.map(function (f) { return "\u26A0\uFE0F " + f.message_he; });
    lines = lines.concat(ambers.map(function (f) { return "\u2139\uFE0F " + f.message_he; }));
    return lines;
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
    var complementsSelection = null;
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
          } else if (qid === COMPLEMENTS_QUESTION_ID) {
            complementsSelection = parsed.ids;
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

    return { groupSelection: groupSelection, groupAnswers: groupAnswers, complementsSelection: complementsSelection, freeText: freeText };
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

  function _formatComplementReason(complementEntry) {
    var candidate = complementEntry.candidate, primary = complementEntry.primary;
    var flower = BY_KEY[candidate];
    var primaryName = BY_KEY[primary].name_he;
    var sourceLabel = SOURCE_LABELS[complementEntry.source];
    return flower.keynote + " \u05E0\u05D5\u05E1\u05E4\u05D4 \u05DB\u05DE\u05E9\u05DC\u05D9\u05DE\u05D4 \u05DC" + primaryName + " (" + complementEntry.condition_he + "). " +
      complementEntry.rationale_he + " [" + sourceLabel + "]";
  }

  function _buildGeneralNotesStructured(chosen, evidence, addedByChallenge, safetyFlags) {
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
      paragraph += " \u05D4\u05D4\u05E8\u05DB\u05D1 \u05DB\u05D5\u05DC\u05DC " + chosen.length + " \u05EA\u05DE\u05E6\u05D9\u05D5\u05EA - \u05DC\u05E4\u05D9 \u05DE\u05E8\u05DB\u05D6 \u05D1\u05D0\u05DA, \u05D9\u05D5\u05EA\u05E8 \u05DE-7 \u05EA\u05DE\u05E6\u05D9\u05D5\u05EA \u05DE\u05D7\u05DC\u05D9\u05E9 \u05D0\u05EA \u05D4\u05E4\u05D5\u05E7\u05D5\u05E1. \u05DB\u05D3\u05D0\u05D9 \u05DC\u05E9\u05E7\u05D5\u05DC \u05DC\u05D4\u05D5\u05E6\u05D9\u05D0 \u05EA\u05DE\u05E6\u05D9\u05D5\u05EA \u05DC\u05E8\u05D2\u05E9\u05D5\u05EA \u05DE\u05D4\u05E2\u05D1\u05E8 \u05D0\u05D5 \u05E4\u05D7\u05D5\u05EA \u05DE\u05D3\u05D5\u05D9\u05E7\u05D5\u05EA.";
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

    paragraph = paragraph.trim();

    // דגלי בטיחות מוצגים תמיד בראש ההערות, לפני כל שאר התוכן, ואינם ניתנים
    // להסתרה.
    var bannerLines = _safetyBannerLines(safetyFlags);
    if (bannerLines.length) {
      paragraph = bannerLines.join("\n") + (paragraph ? "\n" + paragraph : "");
    }

    return paragraph.trim();
  }

  function _finalizeStructured(initialDescription, orderedSelectedGroups, groupAnswers, freeText, addedByChallenge, complements) {
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

    complements = complements || [];
    var complementKeys = complements.map(function (c) { return c.candidate; });
    complementKeys.forEach(function (k) {
      if (chosen.indexOf(k) === -1) chosen.push(k);
    });

    var safetyFlags = _evaluateSafetyFlags([initialDescription].concat(freeText));

    if (!chosen.length) {
      var notes = NO_PATTERN_MESSAGE;
      var bannerLines0 = _safetyBannerLines(safetyFlags);
      if (bannerLines0.length) {
        notes = bannerLines0.join("\n") + "\n" + notes;
      }
      return {
        type: "proposal",
        remedies: [],
        general_notes: notes,
        usage_instructions: _usageInstructionsText(),
      };
    }

    var evidence = _newEvidenceStore();
    _scoreText(tokenize(initialDescription), evidence, "description");
    freeText.forEach(function (snippet) { _scoreText(tokenize(snippet), evidence, "answer"); });

    var addedSet = {};
    addedByChallenge.forEach(function (k) { addedSet[k] = true; });
    var complementSet = {};
    complementKeys.forEach(function (k) { complementSet[k] = true; });

    var complementByKey = {};
    complements.forEach(function (c) { complementByKey[c.candidate] = c; });

    var remedies = chosen.map(function (key) {
      var flower = BY_KEY[key];
      var reason;
      if (complementByKey.hasOwnProperty(key)) {
        reason = _formatComplementReason(complementByKey[key]);
      } else {
        var checked = !addedSet[key] && !complementSet[key];
        reason = _formatStructuredReason(key, checked, evidence[key]);
      }
      return { key: key, name_he: flower.name_he, name_en: flower.name_en, reason: reason };
    });

    var generalNotes = _buildGeneralNotesStructured(chosen, evidence, addedByChallenge, safetyFlags);

    return {
      type: "proposal",
      remedies: remedies,
      general_notes: generalNotes,
      usage_instructions: _usageInstructionsText(),
    };
  }

  function _usageInstructionsText() {
    return "הכינו בקבוקון (30 מ״ל) עם מים מינרליים: 2 טיפות מכל תמצית שנבחרה, ו-4 טיפות אם נכללת תמצית החירום (רסקיו). יש ליטול 4 טיפות מהתערובת לפחות 4 פעמים ביום. מומלץ להעריך מחדש את ההרכב לאחר כ-2-4 שבועות, ולהפסיק כשהמצב חלף.";
  }

  function _challengeAdd(initialDescription, transcript, proposalIndex) {
    var prefix = transcript.slice(0, proposalIndex);
    var replay = _replayStructured(prefix);
    var groupSelection = replay.groupSelection, groupAnswers = replay.groupAnswers;
    var complementsSelection = replay.complementsSelection, freeText = replay.freeText;
    var descScores = _descriptionScores(initialDescription, freeText);

    var ordered, originalChosen, originalComplements;
    if (groupSelection === null) {
      originalChosen = ALL_KEYS.filter(function (k) { return (descScores[k] || 0) >= SUGGEST_MIN_SCORE; });
      groupAnswers = { "__legacy__": originalChosen };
      ordered = ["__legacy__"];
      originalComplements = [];
    } else {
      ordered = _orderedSelectedGroups(groupSelection, descScores);
      originalChosen = [];
      ordered.forEach(function (gid) {
        (groupAnswers[gid] || []).forEach(function (k) {
          if (originalChosen.indexOf(k) === -1) originalChosen.push(k);
        });
      });
      var textSnippets = [initialDescription].concat(freeText);
      originalComplements = _resolveComplements(originalChosen, complementsSelection, textSnippets);
      originalComplements.forEach(function (c) {
        if (originalChosen.indexOf(c.candidate) === -1) originalChosen.push(c.candidate);
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

    return _finalizeStructured(initialDescription, ordered, groupAnswers, freeText, added, originalComplements);
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
    var groupSelection = replay.groupSelection, groupAnswers = replay.groupAnswers;
    var complementsSelection = replay.complementsSelection, freeText = replay.freeText;

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

    // כל שאלות הקבוצות נענו - ההרכב הנוכחי (לפני משלימות) ידוע עכשיו.
    var blendSoFar = [];
    ordered.forEach(function (gid) {
      (groupAnswers[gid] || []).forEach(function (k) {
        if (blendSoFar.indexOf(k) === -1) blendSoFar.push(k);
      });
    });

    if (complementsSelection !== null) {
      // שאלת המשלימות כבר נענתה - מסיימים ומוסיפים את מה שסומן.
      var textSnippets2 = [initialDescription].concat(freeText);
      var complements = _resolveComplements(blendSoFar, complementsSelection, textSnippets2);
      return _finalizeStructured(initialDescription, ordered, groupAnswers, freeText, null, complements);
    }

    // שואלים על משלימות רק כשבהרכב 1-4 תרופות, ורק אם עדיין יש "חדר" עד
    // לתקרה של 6.
    var room = COMPLEMENTS_MAX_TOTAL - blendSoFar.length;
    if (blendSoFar.length >= COMPLEMENTS_MIN_BLEND && blendSoFar.length <= COMPLEMENTS_MAX_BLEND && room >= 1) {
      var textSnippets3 = [initialDescription].concat(freeText);
      var ranked = _rankComplements(blendSoFar, textSnippets3);
      if (ranked.length) {
        var shown = ranked.slice(0, Math.min(COMPLEMENTS_MAX_OPTIONS, room));
        if (shown.length) {
          var cq = _buildComplementsQuestion(shown);
          return { type: "question", question_id: cq.question_id, text: cq.text, multi: cq.multi, options: cq.options };
        }
      }
    }

    // אין מועמדות משלימות (או שאין חדר) - מסיימים ישר בלי לשאול.
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
    COMPLEMENTS_QUESTION_ID: COMPLEMENTS_QUESTION_ID,
    COMPLEMENTS_QUESTION_TEXT: COMPLEMENTS_QUESTION_TEXT,
    CHALLENGE_PREFIX: CHALLENGE_PREFIX,
    SUGGEST_MIN_SCORE: SUGGEST_MIN_SCORE,
    SOFT_BLEND_SIZE_NOTE_THRESHOLD: SOFT_BLEND_SIZE_NOTE_THRESHOLD,
    COMPLEMENTS_MIN_BLEND: COMPLEMENTS_MIN_BLEND,
    COMPLEMENTS_MAX_BLEND: COMPLEMENTS_MAX_BLEND,
    COMPLEMENTS_MAX_TOTAL: COMPLEMENTS_MAX_TOTAL,
    COMPLEMENTS_MAX_OPTIONS: COMPLEMENTS_MAX_OPTIONS,
    NO_PATTERN_MESSAGE: NO_PATTERN_MESSAGE,
    QUESTION_MARKERS: QUESTION_MARKERS,
    KNOWLEDGE: KNOWLEDGE,
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
    _buildComplementsQuestion: _buildComplementsQuestion,
    _orderedSelectedGroups: _orderedSelectedGroups,
    _groupQuestionId: _groupQuestionId,
    _rankComplements: _rankComplements,
    _resolveComplements: _resolveComplements,
    _evaluateSafetyFlags: _evaluateSafetyFlags,
    _safetyBannerLines: _safetyBannerLines,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.engine = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
