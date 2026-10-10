import { type Piece, type PieceType, type Puzzle, type Request, type Point } from './model';
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
  }
};
const p=(type:PieceType,x:number,y:number,bx:number,by:number):Omit<Piece,'id'>=>({type,a:{x,y},b:{x:bx,y:by}});
const r=(id:string,x:number,y:number,bx:number,by:number,destination:Request['destination'],extras:Partial<Request>={}):Request=>({id,start:{x,y},goal:{x:bx,y:by},destination,...extras});
function puzzle(id:string,name:[string,string,string],hint:[string,string,string],solution:Puzzle['solution'],requests:Request[],extras:Partial<Puzzle>={}):Puzzle {
  const inventory:Record<PieceType,number>={short:0,long:0,bridge:0,elevator:0};for(const q of solution)inventory[q.type]++;
  const landings:Point[]=[];for(let y=0;y<=3;y++)for(let x=0;x<=6;x++)landings.push({x,y});
  const localized = mongolianPuzzles[id];
  return {id,name: [...name, ...localized.name],hint: [...hint, ...localized.hint],solution,requests,inventory,landings,obstacles:[],lowCeilings:[],...extras};
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
];
