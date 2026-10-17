import { type Piece, type PieceType, type Puzzle, type Request, type Point } from './model';
import { SKY_PUZZLES } from './sky-puzzles';
const mongolianPuzzles: Record<string, { name: [string, string]; hint: [string, string] }> = {
  "first-notes": {
    "name": [
      "Анхны аялгуу",
      "ᠠᠩᠬᠠᠨ ᠤ ᠠᠶᠠᠯᠭᠤᠤ"
    ],
    "hint": [
      "Богино урсдаг шат сонго. A1, дараа нь B2 дар. B2 → C3 холбоос нэм. Сум кафе руу чиглэнэ.",
      "ᠪᠣᠭᠣᠨᠢ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ ᠰᠣᠩᠭᠣ᠃ A1᠂ ᠳᠠᠷᠠᠭ᠎ᠠ ᠨᠢ B2 ᠳᠠᠷᠤ᠃ B2 → C3 ᠬᠣᠯᠪᠣᠭᠠᠰᠤ ᠨᠡᠮᠡ᠃ ᠰᠤᠮᠤ ᠺᠠᠹᠧ ᠵᠦᠭ ᠴᠢᠭᠯᠡᠨ᠎ᠡ᠃"
    ]
  },
  "long-lunch": {
    "name": [
      "Өдрийн хоолны урт зам",
      "ᠦᠳᠡ ᠶᠢᠨ ᠬᠣᠭᠣᠯᠠᠨ ᠤ ᠤᠷᠲᠤ ᠵᠠᠮ"
    ],
    "hint": [
      "Гүүрээр тавцанг сунга. Урт урсдаг шат хоёр багана дамнах боловч зөвхөн нэг давхар өгсөнө.",
      "ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠲᠠᠪᠴᠠᠩ ᠢ ᠰᠤᠩᠭᠠ᠃ ᠤᠷᠲᠤ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ ᠬᠣᠶᠠᠷ ᠪᠠᠭᠠᠨ᠎ᠠ ᠳᠠᠮᠨᠠᠬᠤ ᠪᠣᠯᠪᠠᠴᠤ ᠵᠥᠪᠬᠡᠨ ᠨᠢᠭᠡ ᠳᠠᠪᠬᠤᠷ ᠥᠭᠰᠥᠨ᠎ᠡ᠃"
    ]
  },
  "homeward": {
    "name": [
      "Харих замын аялгуу",
      "ᠬᠠᠷᠢᠬᠤ ᠵᠠᠮ ᠤᠨ ᠠᠶᠠᠯᠭᠤᠤ"
    ],
    "hint": [
      "Доош явах ч аялал шүү! Эхлээд өндөр тавцанг сонго эсвэл чиглэлийн сумыг эргүүл.",
      "ᠳᠣᠣᠰᠢ ᠶᠠᠪᠤᠬᠤ ᠴᠦ ᠠᠶᠠᠯᠠᠯ ᠱᠦᠦ！ ᠡᠬᠢᠯᠡᠭᠡᠳ ᠥᠨᠳᠥᠷ ᠲᠠᠪᠴᠠᠩ ᠢ ᠰᠣᠩᠭᠣ ᠡᠰᠡᠪᠡᠯ ᠴᠢᠭᠯᠡᠯ ᠦᠨ ᠰᠤᠮᠤ ᠶᠢ ᠡᠷᠭᠢᠭᠦᠯ᠃"
    ]
  },
  "duet": {
    "name": [
      "Бяцхан хослол",
      "ᠪᠢᠴᠢᠬᠠᠨ ᠬᠣᠣᠰᠯᠠᠯ"
    ],
    "hint": [
      "Эхний урсдаг шатыг хамт хэрэглээд B2 дээр замыг салга. Худалдан авагч бүр өөрийн очих газрыг дагана.",
      "ᠡᠬᠢᠨ ᠦ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ ᠶᠢ ᠬᠠᠮᠲᠤ ᠬᠡᠷᠡᠭᠯᠡᠭᠡᠳ B2 ᠳᠡᠭᠡᠷ᠎ᠡ ᠵᠠᠮ ᠢ ᠰᠠᠯᠭᠠ᠃ ᠬᠤᠳᠠᠯᠳᠤᠨ ᠠᠪᠤᠭᠴᠢ ᠪᠦᠷᠢ ᠥᠪᠡᠷ ᠦᠨ ᠣᠴᠢᠬᠤ ᠭᠠᠵᠠᠷ ᠢ ᠳᠠᠭᠠᠨ᠎ᠠ᠃"
    ]
  },
  "everyone": {
    "name": [
      "Бүгд урилгатай",
      "ᠪᠦᠭᠦᠳᠡ ᠤᠷᠢᠯᠭ᠎ᠠ ᠲᠠᠢ"
    ],
    "hint": [
      "Тэргэнцэртэй хүмүүс зөвхөн цахилгаан шат, гүүр хэрэглэнэ. Тасралтгүй, шатгүй зам барь.",
      "ᠲᠡᠷᠭᠡᠨᠴᠡᠷ ᠲᠡᠢ ᠬᠦᠮᠦᠰ ᠵᠥᠪᠬᠡᠨ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃ ᠲᠠᠰᠤᠷᠠᠯᠲᠠ ᠦᠭᠡᠢ᠂ ᠰᠢᠲᠤ ᠦᠭᠡᠢ ᠵᠠᠮ ᠪᠠᠷᠢ᠃"
    ]
  },
  "courtyard": {
    "name": [
      "Дотор цэцэрлэгийг тойрох нь",
      "ᠳᠣᠲᠣᠷ᠎ᠠ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠢ ᠲᠣᠭᠣᠷᠢᠬᠤ ᠨᠢ"
    ],
    "hint": [
      "Ургамалтай дотор цэцэрлэг битүү: хэсгүүд нэвтэрч болохгүй. Дээд тавцанг туршаарай.",
      "ᠤᠷᠭᠤᠮᠠᠯᠲᠠᠢ ᠳᠣᠲᠣᠷ᠎ᠠ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠪᠢᠲᠡᠭᠦᠦ᠄ ᠬᠡᠰᠡᠭ ᠦᠳ ᠨᠡᠪᠲᠡᠷᠡᠵᠦ ᠪᠣᠯᠬᠤᠭᠦᠢ᠃ ᠳᠡᠭᠡᠳᠦ ᠲᠠᠪᠴᠠᠩ ᠢ ᠲᠤᠷᠰᠢᠭᠠᠷᠠᠢ᠃"
    ]
  },
  "balloon": {
    "name": [
      "Бөмбөлөгт зай гаргая",
      "ᠪᠥᠮᠪᠥᠯᠥᠭ ᠲᠦ ᠵᠠᠢ ᠭᠠᠷᠭᠠᠶ᠎ᠠ"
    ],
    "hint": [
      "Судалтай саравч бөмбөлөгт хэт намхан. Хажуугийн цахилгаан шат дээр зай үлдээнэ.",
      "ᠰᠤᠳᠠᠯᠲᠠᠢ ᠰᠠᠷᠠᠪᠴᠢ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠲᠦ ᠬᠡᠲᠦ ᠨᠠᠮᠬᠠᠨ᠃ ᠬᠠᠵᠠᠭᠤ ᠶᠢᠨ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠳᠡᠭᠡᠷ᠎ᠡ ᠵᠠᠢ ᠦᠯᠡᠳᠡᠭᠡᠨ᠎ᠡ᠃"
    ]
  },
  "grand-finale": {
    "name": [
      "Цэцэрлэгийн төгсгөлийн найрал",
      "ᠴᠡᠴᠡᠷᠯᠢᠭ ᠦᠨ ᠲᠡᠭᠦᠰᠬᠡᠯ ᠦᠨ ᠨᠠᠢᠷᠠᠯ"
    ],
    "hint": [
      "Гурван очих газар, хүн бүхэнд нээлттэй нэг дэлгүүр. Гүүрийн дараа замыг салгаж, дээвэрт хүрэх цахилгаан шатны зам үлдээ.",
      "ᠭᠤᠷᠪᠠᠨ ᠣᠴᠢᠬᠤ ᠭᠠᠵᠠᠷ᠂ ᠬᠦᠮᠦᠨ ᠪᠦᠬᠦᠨ ᠳᠦ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠨᠢᠭᠡ ᠳᠡᠯᠭᠡᠭᠦᠷ᠃ ᠭᠦᠭᠦᠷᠭᠡ ᠶᠢᠨ ᠳᠠᠷᠠᠭ᠎ᠠ ᠵᠠᠮ ᠢ ᠰᠠᠯᠭᠠᠵᠤ᠂ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠳᠦ ᠬᠦᠷᠬᠦ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠶᠢᠨ ᠵᠠᠮ ᠦᠯᠡᠳᠡᠭᠡ᠃"
    ]
  },
  "rooftop-lanterns": {
    name: ["Дээврийн дэнлүүний тойруу зам", "ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠳᠡᠩᠯᠦᠦ ᠶᠢᠨ ᠲᠣᠭᠣᠷᠢᠭᠤ ᠵᠠᠮ"],
    hint: [
      "Дэнлүү дээвэр дээр хүлээж байна! A1 → C2 саравчтай замаар явган хүн явж болно, харин бөмбөлөг багтахгүй. Бөмбөлгийг B1, C1, E2-оор тойруулж, E3 дээр замуудыг нэгтгэн E4-т хүргэ.",
      "ᠳᠡᠩᠯᠦᠦ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠳᠡᠭᠡᠷ᠎ᠡ ᠬᠦᠯᠢᠶᠡᠵᠦ ᠪᠠᠢᠨ᠎ᠠ！ A1 → C2 ᠰᠠᠷᠠᠪᠴᠢᠲᠠᠢ ᠵᠠᠮ ᠢᠶᠠᠷ ᠶᠠᠪᠤᠭᠠᠨ ᠬᠦᠮᠦᠨ ᠶᠠᠪᠤᠵᠤ ᠪᠣᠯᠣᠨ᠎ᠠ᠂ ᠬᠠᠷᠢᠨ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠪᠠᠭᠲᠠᠬᠤᠭᠦᠢ᠃ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠢ B1᠂ C1᠂ E2 ᠪᠡᠷ ᠲᠣᠭᠣᠷᠢᠭᠤᠯᠵᠤ᠂ E3 ᠳᠡᠭᠡᠷ᠎ᠡ ᠵᠠᠮ ᠤᠳ ᠢ ᠨᠢᠭᠡᠳᠬᠡᠨ E4 ᠲᠦ ᠬᠦᠷᠭᠡ᠃"
    ]
  },
  "step-free-home": {
    name: ["Сарны гэрэлтэй харих зам", "ᠰᠠᠷᠠᠨ ᠤ ᠭᠡᠷᠡᠯᠲᠡᠢ ᠬᠠᠷᠢᠬᠤ ᠵᠠᠮ"],
    hint: [
      "Дээврийн аяллын дараа гэртээ харья. G4 → G3 цахилгаан шатыг доош чиглүүл. E3, E2, C2-оор дамжин B1-т хүрэх замыг зөвхөн цахилгаан шат, гүүрээр холбо. Урт урсдаг шат тэргэнцэрт тохирохгүй.",
      "ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠠᠶᠠᠯᠠᠯ ᠤᠨ ᠳᠠᠷᠠᠭ᠎ᠠ ᠭᠡᠷ ᠲᠡᠭᠡᠨ ᠬᠠᠷᠢᠶ᠎ᠠ᠃ G4 → G3 ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠶᠢ ᠳᠣᠣᠰᠢ ᠴᠢᠭᠯᠡᠭᠦᠯ᠃ E3᠂ E2᠂ C2 ᠪᠡᠷ ᠳᠠᠮᠵᠢᠨ B1 ᠳᠦ ᠬᠦᠷᠬᠦ ᠵᠠᠮ ᠢ ᠵᠥᠪᠬᠡᠨ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠬᠣᠯᠪᠣ᠃ ᠤᠷᠲᠤ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ ᠲᠡᠷᠭᠡᠨᠴᠡᠷ ᠲᠦ ᠲᠣᠬᠢᠷᠠᠬᠤᠭᠦᠢ᠃"
    ]
  },
  "atrium-chorus": {
    name: ["Төв танхимын найрал", "ᠲᠥᠪ ᠲᠠᠩᠬᠢᠮ ᠤᠨ ᠨᠠᠢᠷᠠᠯ"],
    hint: [
      "Хоёр үүд, гурван аялгуу! C2, E2-оос D2 руу гүүр тавьж замуудыг нэгтгэ. D2-оос C3 дахь кафе, E3 дахь номын дэлгүүр, D4 дахь цэцэрлэг рүү салга. Төвийн цахилгаан шатыг хүн бүрт нээлттэй үлдээ.",
      "ᠬᠣᠶᠠᠷ ᠡᠭᠦᠳᠡ᠂ ᠭᠤᠷᠪᠠᠨ ᠠᠶᠠᠯᠭᠤᠤ！ C2᠂ E2 ᠡᠴᠡ D2 ᠵᠦᠭ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢᠵᠤ ᠵᠠᠮ ᠤᠳ ᠢ ᠨᠢᠭᠡᠳᠬᠡ᠃ D2 ᠡᠴᠡ C3 ᠳᠠᠬᠢ ᠺᠠᠹᠧ᠂ E3 ᠳᠠᠬᠢ ᠨᠣᠮ ᠤᠨ ᠳᠡᠯᠭᠡᠭᠦᠷ᠂ D4 ᠳᠠᠬᠢ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠵᠦᠭ ᠰᠠᠯᠭᠠ᠃ ᠲᠥᠪ ᠦᠨ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠶᠢ ᠬᠦᠮᠦᠨ ᠪᠦᠬᠦᠨ ᠳᠦ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠦᠯᠡᠳᠡᠭᠡ᠃"
    ]
  },
  "ribbon-switchbacks": {
    name: ["Туузан замын вальс", "ᠲᠠᠤᠵᠠᠨ ᠵᠠᠮ ᠤᠨ ᠸᠠᠯᠢᠰ"],
    hint: [
      "Тууз шиг баруун, зүүн, дахин баруун тийш эргэ! B1 → D2 өгсөөд C2 руу гүүр тавь. C2 → A3 урт урсдаг шат зүүн тийш өгсөнө. B3 → C4-т богино шатыг хадгалаад D4-т хүргэ.",
      "ᠲᠠᠤᠵᠠ ᠰᠢᠭ ᠪᠠᠷᠠᠭᠤᠨ᠂ ᠵᠡᠭᠦᠨ᠂ ᠳᠠᠬᠢᠨ ᠪᠠᠷᠠᠭᠤᠨ ᠲᠡᠢᠰᠢ ᠡᠷᠭᠢ！ B1 → D2 ᠥᠭᠰᠥᠭᠡᠳ C2 ᠵᠦᠭ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢ᠃ C2 → A3 ᠤᠷᠲᠤ ᠤᠷᠤᠰᠳᠠᠭ ᠰᠢᠲᠤ ᠵᠡᠭᠦᠨ ᠲᠡᠢᠰᠢ ᠥᠭᠰᠥᠨ᠎ᠡ᠃ B3 → C4 ᠲᠦ ᠪᠣᠭᠣᠨᠢ ᠰᠢᠲᠤ ᠶᠢ ᠬᠠᠳᠠᠭᠠᠯᠠᠵᠤ D4 ᠲᠦ ᠬᠦᠷᠭᠡ᠃"
    ]
  },
  "garden-labyrinth": {
    name: ["Нууц цэцэрлэгийн жим", "ᠨᠢᠭᠤᠴᠠ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠦᠨ ᠵᠢᠮ"],
    hint: [
      "Гурван цэцгийн мандлын завсраар жим гарга. B2-оос B3 руу өгсөж, D3 хүртэл гүүрээр яв. D3 → D2 нэг давхар бууснаар дараагийн мандлыг тойрно. E2 → G3 → F4 дээврийн цэцэрлэгт хүргэнэ.",
      "ᠭᠤᠷᠪᠠᠨ ᠴᠡᠴᠡᠭ ᠦᠨ ᠮᠠᠨᠳᠠᠯ ᠤᠨ ᠵᠠᠪᠰᠠᠷ ᠢᠶᠠᠷ ᠵᠢᠮ ᠭᠠᠷᠭᠠ᠃ B2 ᠡᠴᠡ B3 ᠵᠦᠭ ᠥᠭᠰᠥᠵᠦ᠂ D3 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠶᠠᠪᠤ᠃ D3 → D2 ᠨᠢᠭᠡ ᠳᠠᠪᠬᠤᠷ ᠪᠠᠭᠤᠭᠠᠳ ᠳᠠᠷᠠᠭᠠᠬᠢ ᠮᠠᠨᠳᠠᠯ ᠢ ᠲᠣᠭᠣᠷᠢᠨ᠎ᠠ᠃ E2 → G3 → F4 ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠴᠡᠴᠡᠷᠯᠢᠭ ᠲᠦ ᠬᠦᠷᠭᠡᠨ᠎ᠡ᠃"
    ]
  },
  "sky-parade": {
    name: ["Бүгдийн тэнгэрийн баяр", "ᠪᠦᠭᠦᠳᠡ ᠶᠢᠨ ᠲᠡᠩᠭᠡᠷᠢ ᠶᠢᠨ ᠪᠠᠶᠠᠷ"],
    hint: [
      "Тэргэнцэртэй, бөмбөлөгтэй зочин хоёр нөхцөлийг зэрэг хангасан зам хэрэгтэй. C1 хүртэл цэцгийн мандлын доогуур яв. C2, D2, E2 дээрх гүүрүүд намхан саравчнаас хол байна. E3, F3, F4-өөр G4-т хүргэ: зөвхөн гүүр, цахилгаан шат хэрэглэ.",
      "ᠲᠡᠷᠭᠡᠨᠴᠡᠷᠲᠡᠢ᠂ ᠪᠥᠮᠪᠥᠯᠥᠭᠲᠡᠢ ᠵᠣᠴᠢᠨ ᠬᠣᠶᠠᠷ ᠨᠥᠬᠥᠴᠡᠯ ᠢ ᠵᠡᠷᠭᠡ ᠬᠠᠩᠭᠠᠭᠰᠠᠨ ᠵᠠᠮ ᠬᠡᠷᠡᠭᠲᠡᠢ᠃ C1 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠴᠡᠴᠡᠭ ᠦᠨ ᠮᠠᠨᠳᠠᠯ ᠤᠨ ᠳᠣᠣᠭᠤᠷ ᠶᠠᠪᠤ᠃ C2᠂ D2᠂ E2 ᠳᠡᠭᠡᠷᠡᠬᠢ ᠭᠦᠭᠦᠷᠭᠡ ᠨᠦᠭᠦᠳ ᠨᠠᠮᠬᠠᠨ ᠰᠠᠷᠠᠪᠴᠢ ᠡᠴᠡ ᠬᠣᠯᠠ ᠪᠠᠢᠨ᠎ᠠ᠃ E3᠂ F3᠂ F4 ᠪᠡᠷ G4 ᠲᠦ ᠬᠦᠷᠭᠡ᠄ ᠵᠥᠪᠬᠡᠨ ᠭᠦᠭᠦᠷᠭᠡ᠂ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠬᠡᠷᠡᠭᠯᠡ᠃"
    ]
  }
};
const p=(type:PieceType,x:number,y:number,bx:number,by:number):Omit<Piece,'id'>=>({type,a:{x,y},b:{x:bx,y:by}});
const r=(id:string,x:number,y:number,bx:number,by:number,destination:Request['destination'],extras:Partial<Request>={}):Request=>({id,start:{x,y},goal:{x:bx,y:by},destination,...extras});
function puzzle(id:string,name:[string,string,string] | Puzzle['name'],hint:[string,string,string] | Puzzle['hint'],solution:Puzzle['solution'],requests:Request[],extras:Partial<Puzzle>={}):Puzzle {
  const inventory:Record<PieceType,number>={short:0,long:0,bridge:0,elevator:0};for(const q of solution)inventory[q.type]++;
  const landings:Point[]=[];for(let y=0;y<=3;y++)for(let x=0;x<=6;x++)landings.push({x,y});
  const localized = mongolianPuzzles[id];
  if ((name.length === 3 || hint.length === 3) && !localized) throw new Error(`Missing Mongolian puzzle translations: ${id}`);
  return {id,name: name.length === 5 ? name : [...name, ...localized.name],hint: hint.length === 5 ? hint : [...hint, ...localized.hint],solution,requests,inventory,landings,obstacles:[],lowCeilings:[],...extras};
}
export const PUZZLES: Puzzle[]=[
  puzzle('first-notes',['First notes','第一串音符',"はじめの音符"],['Choose a short escalator. Tap A1, then B2. Add B2 → C3. The arrow points toward the café.','选短扶梯，点 A1 再点 B2，然后接上 B2 → C3。箭头要朝向咖啡馆。',"短いエスカレーターを選び、A1、B2の順に押そう。B2 → C3もつなごう。矢印はカフェへ向けます。"],[p('short',0,0,1,1),p('short',1,1,2,2)],[r('cafe',0,0,2,2,'cafe')]),
  puzzle('long-lunch',['The long lunch','午后长廊',"長いランチの道"],['A bridge makes a landing. The long escalator spans two columns but only one floor.','先用连桥延伸平台。长扶梯跨两列，但只上升一层。',"橋で踊り場を伸ばそう。長いエスカレーターは横2列に渡り、上下は1階だけです。"],[p('bridge',0,0,1,0),p('long',1,0,3,1),p('short',3,1,4,2)],[r('books',0,0,4,2,'books')]),
  puzzle('homeward',['Homeward melody','下楼小调',"帰り道のメロディー"],['Going down is a valid journey! Select the higher landing first, or reverse the travel arrow.','下楼也是一段好旅程！先选高处的平台，或反转行进方向。',"下りも大切な旅！高い踊り場を先に選ぶか、進行方向の矢印を反転しよう。"],[p('short',5,3,4,2),p('bridge',4,2,3,2),p('long',3,2,1,1)],[r('garden',5,3,1,1,'garden')]),
  puzzle('duet',['A little duet','双人合奏',"小さな二重奏"],['Share the first escalator, then branch at B2. Each shopper follows their own destination.','先共用第一段扶梯，再在 B2 分流。每位乘客会前往自己的目的地。',"最初のエスカレーターを共有して、B2で道を分けよう。お客さんはそれぞれの目的地を目指します。"],[p('short',0,0,1,1),p('short',1,1,2,2),p('long',1,1,3,2)],[r('cafe',0,0,2,2,'cafe'),r('books',0,0,3,2,'books')]),
  puzzle('everyone',['Everyone is invited','每个人都能到达',"みんなをご招待"],['Wheelchair riders use elevators and bridges only. Build a continuous step-free route.','轮椅乘客只走电梯和连桥。请搭建一条连续的无障碍路线。',"車いすのお客さんが使えるのはエレベーターと橋だけ。段差のない、連続したルートを作ろう。"],[p('elevator',0,0,0,1),p('bridge',0,1,1,1),p('elevator',1,1,1,2),p('short',1,1,2,2)],[r('books',0,0,1,2,'books',{wheelchair:true}),r('cafe',0,0,2,2,'cafe')]),
  puzzle('courtyard',['Around the courtyard','绕过小庭院',"中庭を回って"],['The planted courtyard is solid: pieces cannot pass through it. Try the upper landing.','绿植庭院占据空间，不能穿过它。试试从上方平台绕行。',"植物の中庭は通り抜けられません。上の踊り場を使って回り道をしてみよう。"],[p('short',0,0,1,1),p('short',1,1,2,2),p('bridge',2,2,3,2),p('long',3,2,5,3)],[r('garden',0,0,5,3,'garden')],{obstacles:[{x:1.5,y:0.2,w:2,h:1.1}],inventory:{short:2,long:1,bridge:2,elevator:0}}),
  puzzle('balloon',['Room for a balloon','给气球留点空间',"風船のための空間"],['The striped canopy is too low for a balloon. The elevator beside it leaves headroom.','条纹顶棚下的空间不够气球通过。旁边的电梯更宽敞。',"しま模様の屋根は風船には低すぎます。そばのエレベーターなら頭上の空間があります。"],[p('elevator',0,0,0,1),p('elevator',0,1,0,2),p('bridge',0,2,1,2),p('long',1,2,3,3)],[r('cafe',0,0,3,3,'cafe',{balloon:true})],{lowCeilings:[{x:0.3,y:0.1,w:2.1,h:1.6}],inventory:{short:2,long:1,bridge:1,elevator:2}}),
  puzzle('grand-finale',['The garden finale','花园大合奏',"庭園のフィナーレ"],['Three destinations, one welcoming mall. Branch after the bridge; leave a lift route to the roof.','三个目的地，一座友好商场。连桥之后分流，并用电梯连通屋顶。',"3つの目的地、みんなを迎える1つの商場。橋の先で道を分け、屋上へエレベーターの道を残そう。"],[p('elevator',0,0,0,1),p('bridge',0,1,1,1),p('elevator',1,1,1,2),p('elevator',1,2,1,3),p('short',1,1,2,2),p('long',2,2,4,3),p('bridge',1,3,2,3)],[r('garden',0,0,2,3,'garden',{wheelchair:true}),r('cafe',0,0,2,2,'cafe'),r('books',0,0,4,3,'books')],{inventory:{short:2,long:1,bridge:3,elevator:3}}),
    puzzle('rooftop-lanterns',
      ['The rooftop lantern detour', '屋顶灯笼绕行记', '屋上ランタンの回り道'],
      [
        'The lanterns are waiting upstairs! A1 → C2 fits walkers under the canopy, but not balloons. Take balloons via B1, C1 and E2, then reunite at E3 for the lift to E4.',
        '灯笼在屋顶等着大家！A1 → C2 的顶棚下能走人，却容不下气球。带气球的乘客绕过 B1、C1、E2，在 E3 汇合，再乘电梯到 E4。',
        '屋上のランタンが待っているよ！屋根の下の A1 → C2 は歩く人なら通れるけれど、風船には低すぎます。風船は B1、C1、E2 を回り、E3 で合流して E4 へ。'
      ],
      [p('long',0,0,2,1), p('long',2,1,4,2), p('elevator',4,2,4,3),
        p('bridge',0,0,1,0), p('bridge',1,0,2,0), p('long',2,0,4,1), p('elevator',4,1,4,2)],
      [r('lantern-walker',0,0,4,3,'garden'), r('lantern-balloon',0,0,4,3,'garden',{balloon:true})],
      {lowCeilings:[{x:0.4,y:0.1,w:1.2,h:0.7}], inventory:{short:1,long:3,bridge:3,elevator:2}}),
    puzzle('step-free-home',
      ['The moonlit ride home', '月光下的无障碍归途', '月あかりの帰り道'],
      [
        'Time to head home after the rooftop visit. Point the G4 → G3 lift downward. Continue via E3, E2 and C2 to B1 using only lifts and bridges. The spare long escalator cannot carry a wheelchair.',
        '逛完屋顶，该回家啦。让 G4 → G3 的电梯向下运行，再经 E3、E2、C2 到 B1，全程用电梯和连桥。多出来的长扶梯不能载轮椅。',
        '屋上を楽しんだら帰ろう。G4 → G3 のエレベーターは下向きに。E3、E2、C2 を通って B1 まで、エレベーターと橋だけでつなごう。余った長いエスカレーターは車いすには使えません。'
      ],
      [p('elevator',6,3,6,2), p('bridge',6,2,5,2), p('bridge',5,2,4,2), p('elevator',4,2,4,1),
        p('bridge',4,1,3,1), p('bridge',3,1,2,1), p('elevator',2,1,2,0), p('bridge',2,0,1,0)],
      [r('homeward-chair',6,3,1,0,'books',{wheelchair:true})],
      {inventory:{short:1,long:1,bridge:6,elevator:3}}),
    puzzle('atrium-chorus',
      ['The atrium chorus', '中庭小合唱', '吹き抜けのコーラス'],
      [
        'Two entrances, three tunes! Point bridges from C2 and E2 into D2 to share the middle. Split toward the café at C3, books at E3 and garden at D4. Keep the central lifts step-free.',
        '两个入口，三段小乐曲！从 C2、E2 向 D2 搭连桥，在中央汇合，再分流到 C3 的咖啡馆、E3 的书店和 D4 的花园。中央的电梯要保持无障碍。',
        '入口は2つ、メロディーは3つ！C2 と E2 から D2 へ橋を向けて合流しよう。C3 のカフェ、E3 の本屋、D4 の庭園へ道を分けます。中央のエレベーターは段差のない道に。'
      ],
      [p('long',0,0,2,1), p('bridge',2,1,3,1), p('long',6,0,4,1), p('bridge',4,1,3,1),
        p('short',3,1,2,2), p('short',3,1,4,2), p('elevator',3,1,3,2), p('elevator',3,2,3,3)],
      [r('west-cafe',0,0,2,2,'cafe'), r('east-books',6,0,4,2,'books'), r('west-garden',0,0,3,3,'garden'),
        r('east-cafe',6,0,2,2,'cafe'), r('central-chair',3,1,3,3,'garden',{wheelchair:true})],
      {inventory:{short:3,long:2,bridge:3,elevator:2}}),
    puzzle('ribbon-switchbacks',
      ['The ribbon-route waltz', '丝带折返圆舞曲', 'リボンの折り返しワルツ'],
      [
        'Right, left, then right again, like a ribbon! Climb B1 → D2, bridge back to C2, then send the long escalator leftward up to A3. Save the short piece for B3 → C4, and bridge to D4.',
        '像丝带一样，向右、向左，再向右！从 B1 升到 D2，搭桥退回 C2，再用长扶梯向左上到 A3。把短扶梯留给 B3 → C4，最后搭桥到 D4。',
        'リボンのように右、左、また右へ！B1 → D2 と上り、橋で C2 に戻って、長いエスカレーターで左上の A3 へ。短いパーツは B3 → C4 に残し、D4 へ橋をかけよう。'
      ],
      [p('long',1,0,3,1), p('bridge',3,1,2,1), p('long',2,1,0,2),
        p('bridge',0,2,1,2), p('short',1,2,2,3), p('bridge',2,3,3,3)],
      [r('ribbon-reader',1,0,3,3,'books')],
      {landings:[{x:1,y:0},{x:3,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:3},{x:3,y:3}],
        obstacles:[{x:1.35,y:1.4,w:1,h:0.35},{x:1.4,y:0.45,w:0.2,h:0.2}],
        inventory:{short:1,long:2,bridge:3,elevator:1}}),
    puzzle('garden-labyrinth',
      ['The secret garden trail', '秘密花园迷宫', 'ひみつの庭園の小道'],
      [
        'Thread a trail between three solid flowerbeds. From B2 lift to B3, then bridge across to D3. A one-floor dip D3 → D2 slips around the next bed. E2 → G3 → F4 leads back up to the roof garden.',
        '在三片实体花坛之间找条小路。从 B2 乘电梯到 B3，搭桥到 D3，再沿 D3 → D2 下降一层，绕过下一片花坛。E2 → G3 → F4 会带你回到屋顶花园。',
        '通り抜けられない3つの花壇の間に小道を作ろう。B2 から B3 へ上り、橋で D3 へ。D3 → D2 と1階下りると次の花壇を回れます。E2 → G3 → F4 で屋上庭園へ上ろう。'
      ],
      [p('short',0,0,1,1), p('elevator',1,1,1,2), p('bridge',1,2,2,2), p('bridge',2,2,3,2),
        p('elevator',3,2,3,1), p('bridge',3,1,4,1), p('long',4,1,6,2), p('short',6,2,5,3)],
      [r('garden-explorer',0,0,5,3,'garden')],
      {obstacles:[{x:1.3,y:0.25,w:1.35,h:1.35},{x:3.35,y:1.45,w:1.45,h:1.65},{x:2.8,y:0.15,w:2.6,h:0.55}],
        inventory:{short:3,long:1,bridge:4,elevator:2}}),
    puzzle('sky-parade',
      ['The everyone-in-the-sky parade', '每个人的云端巡游', 'みんなの空のパレード'],
      [
        'Our wheelchair guest is holding a balloon: the same route must satisfy both needs! Go under the flowerbed to C1. Bridges at C2, D2 and E2 stay below the low canopy. Climb via E3, F3 and F4 to G4 using only lifts and bridges.',
        '轮椅乘客还带着气球，同一条路要同时满足两种需求！从花坛下方绕到 C1，沿 C2、D2、E2 的连桥避开低顶棚，再经 E3、F3、F4 到 G4；全程用电梯和连桥。',
        '車いすのお客さんは風船も持っているよ。同じ道で両方の条件を守ろう！花壇の下を通って C1 へ。C2、D2、E2 の橋は低い屋根を避けられます。E3、F3、F4 を通り、橋とエレベーターだけで G4 へ。'
      ],
      [p('bridge',0,0,1,0), p('bridge',1,0,2,0), p('elevator',2,0,2,1),
        p('bridge',2,1,3,1), p('bridge',3,1,4,1), p('elevator',4,1,4,2),
        p('bridge',4,2,5,2), p('elevator',5,2,5,3), p('bridge',5,3,6,3), p('short',3,1,4,2)],
      [r('parade-chair-balloon',0,0,6,3,'garden',{wheelchair:true,balloon:true}),
        r('parade-reader',0,0,4,2,'books',{wheelchair:true}), r('parade-cafe',0,0,5,2,'cafe')],
      {obstacles:[{x:0.35,y:0.3,w:1.2,h:1.5},{x:5.3,y:0.25,w:1.1,h:1.35}],
        lowCeilings:[{x:2.6,y:1.15,w:0.8,h:0.65}], inventory:{short:1,long:1,bridge:7,elevator:3}}),
    puzzle('one-way-gallery',
      ['The one-way gallery', '单向画廊的回环', '一方通行のギャラリー', 'Нэг чигийн галерей', 'ᠨᠢᠭᠡ ᠴᠢᠭ ᠦᠨ ᠭᠠᠯᠧᠷᠧᠢ'],
      [
        'Make a clockwise loop: A2 → A3 → B3 → C3 → C2 → B2 → A2. Bridges and lifts are one-way too. Six pieces let both ends exchange visitors without overlapping a return lane.',
        '搭一个顺时针回环：A2 → A3 → B3 → C3 → C2 → B2 → A2。连桥和电梯也是单向的。用六个零件，让两端的访客互相到达，不重叠铺回程。',
        'A2 → A3 → B3 → C3 → C2 → B2 → A2 と時計回りにつなごう。橋とエレベーターも一方通行。6つのパーツで、重なる帰り道なしに両端を行き来できます。',
        'A2 → A3 → B3 → C3 → C2 → B2 → A2 тойрог барь. Гүүр, цахилгаан шат ч нэг чигтэй. Зургаан хэсгээр хоёр талын зочдыг хүргэ.',
        'A2 → A3 → B3 → C3 → C2 → B2 → A2 ᠲᠣᠭᠣᠷᠢᠭ ᠪᠠᠷᠢ᠃ ᠭᠦᠭᠦᠷᠭᠡ᠂ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠴᠦ ᠨᠢᠭᠡ ᠴᠢᠭᠲᠡᠢ᠃ ᠵᠢᠷᠭᠤᠭᠠᠨ ᠬᠡᠰᠡᠭ ᠢᠶᠡᠷ ᠵᠣᠴᠢᠳ ᠢ ᠬᠦᠷᠭᠡ᠃'
      ],
      [p('elevator',0,1,0,2), p('bridge',0,2,1,2), p('bridge',1,2,2,2),
        p('elevator',2,2,2,1), p('bridge',2,1,1,1), p('bridge',1,1,0,1)],
      [r('gallery-out',0,1,2,2,'books',{wheelchair:true}), r('gallery-back',2,2,0,1,'cafe',{wheelchair:true}),
        r('gallery-middle',1,2,1,1,'garden',{balloon:true})],
      {landings:[{x:0,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:2,y:1},{x:1,y:1}]}),
    puzzle('borrowed-floor',
      ['Up to come down', '先上楼，再回到原层', '上ってから、もとの階へ', 'Өгсөөд буцах зам', 'ᠥᠭᠰᠥᠭᠡᠳ ᠪᠤᠴᠠᠬᠤ ᠵᠠᠮ'],
      [
        'Both stops are on floor 1, but the garden blocks the middle. Lift A1 → A2, climb to B3, bridge to E3, then take the long descent to G2 and the lift to G1. Keep both lifts for the ends.',
        '两站都在一层，但中央被庭院挡住了。先乘 A1 → A2 的电梯，再升到 B3，搭桥到 E3，然后用长扶梯下到 G2，乘电梯回 G1。两部电梯要留给两端。',
        '出発も到着も1階。でも中央には庭園が。A1 → A2 をエレベーターで上り、B3 へ。橋で E3 へ渡り、長い下りで G2、エレベーターで G1 へ。両端にエレベーターを残そう。',
        'Хоёр зогсоол нэг давхарт ч цэцэрлэг зам хаана. A1 → A2 өгсөөд B3-т хүр. E3 хүртэл гүүр тавиад урт шатаар G2, цахилгаан шатаар G1-т буу.',
        'ᠴᠡᠴᠡᠷᠯᠢᠭ ᠵᠠᠮ ᠢ ᠬᠠᠭᠠᠨ᠎ᠠ᠃ A1 → A2 ᠥᠭᠰᠥᠭᠡᠳ B3 ᠲᠦ ᠬᠦᠷ᠃ E3 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢᠭᠠᠳ G2᠂ G1 ᠳᠦ ᠪᠠᠭᠤ᠃'
      ],
      [p('elevator',0,0,0,1), p('short',0,1,1,2), p('bridge',1,2,2,2), p('bridge',2,2,3,2),
        p('bridge',3,2,4,2), p('long',4,2,6,1), p('elevator',6,1,6,0)],
      [r('ground-floor-reader',0,0,6,0,'books',{balloon:true})],
      {landings:[{x:0,y:0},{x:0,y:1},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:6,y:1},{x:6,y:0},
          {x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0},{x:5,y:0}],
        obstacles:[{x:2.3,y:-0.1,w:1.4,h:1.65}]}),
    puzzle('ten-piece-town',
      ['The ten-piece town', '十件零件的小天地', '10パーツの小さな町', 'Арван хэсгийн хотхон', 'ᠠᠷᠪᠠᠨ ᠬᠡᠰᠡᠭ ᠦᠨ ᠬᠣᠲᠠᠬᠠᠨ'],
      [
        'Bring A1 to D1 with three bridges, and G1 to E2 with the long escalator. Meet at D2, share D2 → D3, then branch to C3, E3 and D4. All ten pieces have a job; the west entrance must stay step-free.',
        '从 A1 用三段连桥到 D1，从 G1 用长扶梯到 E2。在 D2 汇合，共用 D2 → D3，再分流到 C3、E3、D4。十件零件各有用处，西侧入口必须全程无障碍。',
        'A1 から橋3つで D1、G1 から長いエスカレーターで E2 へ。D2 で合流して D2 → D3 を共有し、C3、E3、D4 へ分かれよう。10パーツ全部が大切。西の入口は段差なしに。',
        'A1-ээс гурван гүүрээр D1-т, G1-ээс урт шатаар E2-т хүр. D2 дээр нийлж D3 хүртэл хамт яв. C3, E3, D4 рүү салга. Баруун талын үүд шатгүй байна.',
        'A1 ᠡᠴᠡ ᠭᠤᠷᠪᠠᠨ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ D1 ᠳᠦ᠂ G1 ᠡᠴᠡ E2 ᠲᠦ ᠬᠦᠷ᠃ D2 ᠳᠡᠭᠡᠷ᠎ᠡ ᠨᠢᠭᠡᠳᠴᠦ D3 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠬᠠᠮᠲᠤ ᠶᠠᠪᠤ᠃ C3᠂ E3᠂ D4 ᠵᠦᠭ ᠰᠠᠯᠭᠠ᠃'
      ],
      [p('bridge',0,0,1,0), p('bridge',1,0,2,0), p('bridge',2,0,3,0), p('elevator',3,0,3,1),
        p('long',6,0,4,1), p('bridge',4,1,3,1), p('elevator',3,1,3,2),
        p('bridge',3,2,2,2), p('bridge',3,2,4,2), p('elevator',3,2,3,3)],
      [r('town-west-garden',0,0,3,3,'garden',{wheelchair:true}), r('town-west-cafe',0,0,2,2,'cafe',{wheelchair:true}),
        r('town-east-books',6,0,4,2,'books'), r('town-east-cafe',6,0,2,2,'cafe'),
        r('town-center-garden',3,0,3,3,'garden',{balloon:true}), r('town-center-books',3,0,4,2,'books',{balloon:true})]),
    puzzle('three-kinds-of-sky',
      ['Three kinds of sky', '三条通往天空的路', '空への3つの道', 'Тэнгэрт хүрэх гурван зам', 'ᠲᠡᠩᠭᠡᠷᠢ ᠳᠦ ᠬᠦᠷᠬᠦ ᠭᠤᠷᠪᠠᠨ ᠵᠠᠮ'],
      [
        'Split at D1. The walker takes D2 → E3 → D4 under the low roof. Send the balloon right via F2 and F3 to E4. The wheelchair with a balloon bridges left to C1, then uses three open lifts to C4.',
        '在 D1 分路。普通乘客经过低顶棚，沿 D2 → E3 → D4 前进。气球乘客向右，经 F2、F3 到 E4。带气球的轮椅乘客先向左搭桥到 C1，再坐三段开阔电梯到 C4。',
        'D1 で分かれよう。歩く人は低い屋根の下から D2 → E3 → D4。風船は右へ F2、F3、E4。風船を持つ車いすの人は左の C1 へ橋を渡り、屋根のないエレベーター3つで C4 へ。',
        'D1 дээр замыг салга. Явган хүн D2 → E3 → D4 замаар явна. Бөмбөлөг F2, F3-аар E4-т хүрнэ. Тэргэнцэртэй, бөмбөлөгтэй хүн C1-ээс гурван цахилгаан шатаар C4-т хүрнэ.',
        'D1 ᠳᠡᠭᠡᠷ᠎ᠡ ᠵᠠᠮ ᠢ ᠰᠠᠯᠭᠠ᠃ ᠶᠠᠪᠤᠭᠠᠨ ᠬᠦᠮᠦᠨ D2 → E3 → D4 ᠵᠠᠮ ᠢᠶᠠᠷ ᠶᠠᠪᠤᠨ᠎ᠠ᠃ ᠪᠥᠮᠪᠥᠯᠥᠭ F2᠂ F3 ᠪᠡᠷ E4 ᠲᠦ ᠬᠦᠷᠨ᠎ᠡ᠃ ᠲᠡᠷᠭᠡᠨᠴᠡᠷ C1 ᠡᠴᠡ C4 ᠲᠦ ᠬᠦᠷᠨ᠎ᠡ᠃'
      ],
      [p('elevator',3,0,3,1), p('short',3,1,4,2), p('short',4,2,3,3),
        p('bridge',3,0,2,0), p('elevator',2,0,2,1), p('elevator',2,1,2,2), p('elevator',2,2,2,3),
        p('long',3,0,5,1), p('elevator',5,1,5,2), p('short',5,2,4,3)],
      [r('sky-reader',3,0,3,3,'books'), r('sky-balloon-cafe',3,0,4,3,'cafe',{balloon:true}),
        r('sky-chair-garden',3,0,2,3,'garden',{wheelchair:true,balloon:true})],
      {lowCeilings:[{x:2.85,y:0.15,w:0.3,h:0.65}]}),
    puzzle('roof-reunion',
      ['The rooftop reunion', '屋顶散场的汇合', '屋上からの待ち合わせ', 'Дээврийн уулзалт', 'ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠠᠭᠤᠯᠵᠠᠯᠲᠠ'],
      [
        'Bring the west roof down to A3 and bridge to D3; bring the east roof down through E3. D4 also joins D3. Share the downward lift D3 → D2, then fan out to C1, D1 and E1. Keep the C1 and D1 exits step-free.',
        '西侧屋顶先下降到 A3，再搭桥到 D3；东侧屋顶经 E3 下来。D4 也汇入 D3。共用向下的 D3 → D2 电梯，再分流到 C1、D1、E1。C1、D1 的出口要保持无障碍。',
        '西の屋上から A3 へ下り、橋で D3 へ。東の屋上は E3 経由。D4 も D3 に合流します。下向きの D3 → D2 を共有し、C1、D1、E1 へ分かれよう。C1 と D1 は段差のない出口に。',
        'Баруун дээврээс A3-аар D3-т, зүүнээс E3-аар D3-т хүр. D4 ч D3-т нийлнэ. D3 → D2 цахилгаан шатаар хамт буугаад C1, D1, E1 рүү салга.',
        'ᠪᠠᠷᠠᠭᠤᠨ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠡᠴᠡ A3 ᠪᠡᠷ D3 ᠲᠦ᠂ ᠵᠡᠭᠦᠨ ᠡᠴᠡ E3 ᠪᠡᠷ D3 ᠲᠦ ᠬᠦᠷ᠃ D4 ᠴᠦ D3 ᠲᠦ ᠨᠢᠭᠡᠳᠦᠨ᠎ᠡ᠃ D3 → D2 ᠬᠠᠮᠲᠤ ᠪᠠᠭᠤᠭᠠᠳ C1᠂ D1᠂ E1 ᠵᠦᠭ ᠰᠠᠯᠭᠠ᠃'
      ],
      [p('elevator',0,3,0,2), p('bridge',0,2,1,2), p('bridge',1,2,2,2), p('bridge',2,2,3,2),
        p('long',6,3,4,2), p('bridge',4,2,3,2), p('elevator',3,3,3,2), p('elevator',3,2,3,1),
        p('bridge',3,1,2,1), p('elevator',2,1,2,0), p('elevator',3,1,3,0), p('short',3,1,4,0)],
      [r('reunion-west-books',0,3,2,0,'books',{wheelchair:true}), r('reunion-west-garden',0,3,3,0,'garden',{wheelchair:true}),
        r('reunion-east-cafe',6,3,4,0,'cafe',{balloon:true}), r('reunion-east-books',6,3,2,0,'books'),
        r('reunion-center',3,3,3,0,'garden',{wheelchair:true,balloon:true})]),
    puzzle('low-roof-lullaby',
      ['The low-roof lullaby', '低顶棚下的摇篮曲', '低い屋根の子守歌', 'Намхан дээврийн бүүвэйн дуу', 'ᠨᠠᠮᠬᠠᠨ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠪᠦᠪᠡᠢᠨ ᠳᠠᠭᠤᠤ'],
      [
        'Lift A1 → A2 above the first garden, then bridge to C2. The walker can take C2 → E3 under the canopy. The wheelchair balloon must dip C2 → C1, bridge to E1, and climb to E3. Rejoin there; finish via G3 and G4.',
        '乘 A1 → A2 的电梯绕过第一片庭院，搭桥到 C2。普通乘客能沿 C2 → E3 穿过顶棚。带气球的轮椅乘客要下降 C2 → C1，搭桥到 E1，再升到 E3。这里汇合，最后经 G3 到 G4。',
        'A1 → A2 を上って最初の庭園を越え、橋で C2 へ。歩く人は屋根の下の C2 → E3 を使えます。風船の車いすは C2 → C1 へ下り、橋で E1、エレベーターで E3。そこで合流し、G3、G4 へ。',
        'A1 → A2 өгсөөд C2 хүртэл гүүр тавь. Явган хүн C2 → E3 замаар явна. Бөмбөлөгтэй тэргэнцэр C2 → C1 бууж E1-ээр E3-т өгсөнө. G3, G4-өөр аяллыг дуусга.',
        'A1 → A2 ᠥᠭᠰᠥᠭᠡᠳ C2 ᠬᠦᠷᠲᠡᠯ᠎ᠡ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢ᠃ ᠶᠠᠪᠤᠭᠠᠨ ᠬᠦᠮᠦᠨ C2 → E3 ᠵᠠᠮ ᠢᠶᠠᠷ ᠶᠠᠪᠤᠨ᠎ᠠ᠃ ᠲᠡᠷᠭᠡᠨᠴᠡᠷ C2 → C1 ᠪᠠᠭᠤᠵᠤ E1 ᠪᠡᠷ E3 ᠲᠦ ᠥᠭᠰᠥᠨ᠎ᠡ᠃ G3᠂ G4 ᠪᠡᠷ ᠳᠠᠭᠤᠰᠬᠠ᠃'
      ],
      [p('elevator',0,0,0,1), p('bridge',0,1,1,1), p('bridge',1,1,2,1), p('elevator',2,1,2,0),
        p('bridge',2,0,3,0), p('bridge',3,0,4,0), p('elevator',4,0,4,1), p('elevator',4,1,4,2),
        p('bridge',4,2,5,2), p('bridge',5,2,6,2), p('elevator',6,2,6,3), p('long',2,1,4,2)],
      [r('lullaby-accessible',0,0,6,3,'garden',{wheelchair:true,balloon:true}), r('lullaby-walker',0,0,6,2,'cafe')],
      {obstacles:[{x:0.4,y:-0.1,w:1.2,h:0.9},{x:4.4,y:-0.1,w:1.2,h:1.8}],
        lowCeilings:[{x:2.35,y:0.7,w:1.3,h:1.6}]}),
    ...SKY_PUZZLES,
  ];
