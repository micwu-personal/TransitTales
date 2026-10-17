import { type Piece, type PieceType, type Point, type Puzzle, type Request } from './model';

type Copy = Puzzle['name'];
const at = (x:number,y:number,z:number):Point => ({x,y,z});
const p = (type:PieceType,a:Point,b:Point):Omit<Piece,'id'> => ({type,a,b});
const b = (x:number,y:number,z:number,bx:number,by:number,bz:number) => p('bridge',at(x,y,z),at(bx,by,bz));
const s = (x:number,y:number,z:number,bx:number,by:number,bz:number) => p('short',at(x,y,z),at(bx,by,bz));
const l = (x:number,y:number,z:number,bx:number,by:number,bz:number) => p('long',at(x,y,z),at(bx,by,bz));
const e = (x:number,y:number,z:number,by:number) => p('elevator',at(x,y,z),at(x,by,z));
const r = (id:string,start:Point,goal:Point,destination:Request['destination']='cafe',extras:Partial<Request>={}):Request => ({id,start,goal,destination,...extras});

// A low front terrace, open middle courtyard and tall rear gallery form a stepped U.
// The empty middle bay is a real void, not another flat copy of the original mall.
export const SKY_LANDINGS:Point[]=[];
for(let z=0;z<=2;z++)for(let x=0;x<=6;x++) {
  if(z===1&&x===3)continue;
  const roof=z===0?(x===0||x===6?4:x===1||x===5?3:2):z===1?(x===0||x===6?4:3):(x>=1&&x<=5?4:3);
  for(let y=0;y<=roof;y++)SKY_LANDINGS.push(at(x,y,z));
}
function round(id:string,name:Copy,hint:Copy,solution:Puzzle['solution'],requests:Request[],extras:Partial<Puzzle>={}):Puzzle {
  const inventory:Record<PieceType,number>={short:0,long:0,bridge:0,elevator:0};
  solution.forEach(piece=>inventory[piece.type]++);
  // Spare parts permit experimentation, but do not supply an unlimited lift bypass.
  inventory.bridge++;inventory.short++;
  return structuredClone({id:`sky-${id}`,building:'sky-atrium',name,hint,solution,requests,inventory,landings:SKY_LANDINGS,obstacles:[],lowCeilings:[],...extras});
}

const strollerRoutes=[s(0,0,0,0,1,1),b(0,1,1,0,1,2),b(0,1,2,1,1,2),e(0,0,0,1),b(0,1,0,1,1,0),b(1,1,0,1,1,1),b(1,1,1,1,1,2)];
const courierRoutes=[e(6,0,0,1),s(6,0,0,5,1,0),b(5,1,0,5,1,1),s(5,1,1,5,0,2),b(5,0,2,6,0,2),l(6,0,2,6,1,0)];
const refugeRoutes=[s(2,2,2,3,3,2),s(3,3,2,4,2,2),b(2,2,2,2,2,1),e(2,2,1,1),l(2,1,1,4,2,1),b(4,2,1,4,2,2)];
const balloonRoutes=[l(1,0,0,1,1,2),b(1,0,0,2,0,0),l(2,0,0,2,1,2),b(2,1,2,1,1,2)];
const balloonRoof={x:.8,y:.1,z:.3,w:.4,h:.5,d:1.1};
const ensemble=[...strollerRoutes,...courierRoutes,...refugeRoutes,...balloonRoutes];
const ensembleRequests=[r('family',at(0,0,0),at(1,1,2),'books',{need:'stroller'}),r('parcel',at(6,0,0),at(6,1,0),'cafe',{need:'courier'}),r('quiet',at(2,2,2),at(4,2,2),'garden',{need:'acrophobia'}),r('floating',at(1,0,0),at(1,1,2),'books',{balloon:true}),r('walker',at(0,0,0),at(1,1,2))];

export const SKY_PUZZLES:Puzzle[]=[
  round('depth-debut',
    ['A bridge into depth','走向纵深的第一座桥','奥行きへの最初の橋','Гүн рүү анхны гүүр','ᠭᠦᠨ ᠵᠦᠭ ᠠᠩᠬᠠᠨ ᠤ ᠭᠦᠭᠦᠷᠭᠡ'],
    ['Coordinates are (column, floor, depth), starting at zero. Choose bridges: (0,0,0) → (0,0,1) → (0,0,2). Stay on the same floor and move toward the rear gallery.','坐标是（列、楼层、进深），从零开始。选连桥：(0,0,0) → (0,0,1) → (0,0,2)。保持同层，向后廊前进。','座標は（列、階、奥行き）で0から始まります。橋で (0,0,0) → (0,0,1) → (0,0,2)。同じ階のまま奥へ。','Координат нь (багана, давхар, гүн), тэгээс эхэлнэ. Гүүрээр (0,0,0) → (0,0,1) → (0,0,2) холбо. Нэг давхарт арын танхим руу яв.','ᠭᠦᠭᠦᠷᠭᠡ ᠰᠣᠩᠭᠣ᠃ (0,0,0) → (0,0,1) → (0,0,2) ᠬᠣᠯᠪᠣ᠃ ᠨᠢᠭᠡ ᠳᠠᠪᠬᠤᠷ ᠲᠤ ᠠᠷᠤ ᠵᠦᠭ ᠶᠠᠪᠤ᠃'],
    [b(0,0,0,0,0,1),b(0,0,1,0,0,2)],[r('first-depth',at(0,0,0),at(0,0,2))]),
  round('rear-rising',
    ['Rising toward the rear','向后上升的小调','奥へ上るメロディー','Арын өгсөх аялгуу','ᠠᠷᠤ ᠵᠦᠭ ᠥᠭᠰᠥᠬᠦ ᠠᠶᠠᠯᠭᠤᠤ'],
    ['Short escalators can climb in depth too. Climb (1,0,0) → (1,1,1) → (1,2,2), then bridge right.','短扶梯也能沿进深上升：(1,0,0) → (1,1,1) → (1,2,2)，再向右搭桥。','短いエスカレーターは奥へも上れます。(1,0,0) → (1,1,1) → (1,2,2)、最後は右へ橋を。','Богино шат гүн рүү өгсөнө: (1,0,0) → (1,1,1) → (1,2,2). Дараа нь баруун гүүр.','ᠪᠣᠭᠣᠨᠢ ᠰᠢᠲᠤ ᠪᠠᠷ (1,0,0) → (1,1,1) → (1,2,2) ᠥᠭᠰᠥ᠃ ᠪᠠᠷᠠᠭᠤᠨ ᠵᠦᠭ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢ᠃'],
    [s(1,0,0,1,1,1),s(1,1,1,1,2,2),b(1,2,2,2,2,2)],[r('rear-books',at(1,0,0),at(2,2,2),'books')]),
  round('deep-span',
    ['The deep span','纵深长跨越','奥への長い一歩','Гүний урт алхам','ᠭᠦᠨ ᠦ ᠤᠷᠲᠤ ᠠᠯᠬᠤᠮ'],
    ['A long escalator spans two depth bays but climbs one floor. Use (5,0,0) → (5,1,2), then turn left and up.','长扶梯跨两格进深，只升一层。用 (5,0,0) → (5,1,2)，再向左上升。','長いエスカレーターは奥行き2つ、上りは1階。(5,0,0) → (5,1,2) の後、左上へ。','Урт шат хоёр гүн дамнаж нэг давхар өгсөнө. (5,0,0) → (5,1,2), дараа зүүн өгс.','ᠤᠷᠲᠤ ᠰᠢᠲᠤ (5,0,0) → (5,1,2) ᠥᠭᠰᠥᠨ᠎ᠡ᠃ ᠳᠠᠷᠠᠭ᠎ᠠ ᠵᠡᠭᠦᠨ ᠵᠦᠭ ᠥᠭᠰᠥ᠃'],
    [l(5,0,0,5,1,2),s(5,1,2,4,2,2)],[r('span-garden',at(5,0,0),at(4,2,2),'garden')]),
  round('corner-waltz',
    ['The corner waltz','转角华尔兹','角を曲がるワルツ','Булангийн вальс','ᠪᠤᠯᠤᠩ ᠤᠨ ᠸᠠᠯᠢᠰ'],
    ['Turn at landings, never diagonally through two horizontal axes. Climb right, bridge back, climb right again, then bridge to the rear.','在平台转弯，不能同时沿横向和进深斜走。向右上升、向后搭桥、再次右上，最后到后廊。','曲がるのは踊り場で。横と奥を同時に斜めには進めません。右上、奥へ橋、右上、最後に奥へ。','Тавцан дээр эргэ. Баруун өгсөөд арын гүүр, дахин баруун өгсөөд арын танхимд хүр.','ᠲᠠᠪᠴᠠᠩ ᠳᠡᠭᠡᠷ᠎ᠡ ᠡᠷᠭᠢ᠃ ᠪᠠᠷᠠᠭᠤᠨ ᠥᠭᠰᠥᠭᠡᠳ ᠠᠷᠤ ᠵᠦᠭ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢ᠃'],
    [s(0,0,0,1,1,0),b(1,1,0,1,1,1),s(1,1,1,2,2,1),b(2,2,1,2,2,2)],[r('corner',at(0,0,0),at(2,2,2))]),
  round('stroller-lane',
    ['The stroller lane','婴儿车的平稳小路','ベビーカーの道','Хүүхдийн тэрэгний зам','ᠬᠡᠦᠬᠡᠳ ᠦᠨ ᠲᠡᠷᠭᠡᠨ ᠦ ᠵᠠᠮ'],
    ['Walkers climb straight toward the rear. The stroller uses the front lift, bridges right, then crosses both depth bays to the same bookshop.','普通乘客沿进深直接上升。婴儿车乘前侧电梯、向右搭桥，再跨两格进深到同一书店。','歩く人は奥へ上る近道。ベビーカーは手前のエレベーター、右への橋、奥への橋2つで同じ本屋へ。','Явган хүн арын шатаар явна. Хүүхдийн тэрэг урд цахилгаан шат, баруун гүүр, хоёр арын гүүрээр номын дэлгүүрт хүрнэ.','ᠶᠠᠪᠤᠭᠠᠨ ᠬᠦᠮᠦᠨ ᠠᠷᠤ ᠰᠢᠲᠤ ᠪᠠᠷ ᠶᠠᠪᠤᠨ᠎ᠠ᠃ ᠬᠡᠦᠬᠡᠳ ᠦᠨ ᠲᠡᠷᠭᠡ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃'],
    strollerRoutes,[r('walking-parent',at(0,0,0),at(1,1,2),'books'),r('stroller-parent',at(0,0,0),at(1,1,2),'books',{need:'stroller'})]),
  round('courier-loop',
    ['The courier loop','快递员的环形路线','配達員の回り道','Хүргэгчийн тойрог','ᠬᠦᠷᠭᠡᠭᠴᠢ ᠶᠢᠨ ᠲᠣᠭᠣᠷᠢᠭ'],
    ['The lift is a one-piece shortcut, but couriers cannot use lifts. Take the left escalator, rear bridge and descending depth escalator; return by the long depth escalator.','电梯只需一段，但快递员不能乘电梯。左上、向后搭桥、沿进深下降，再用长扶梯返回前侧。','エレベーターは1本の近道ですが配達員は使えません。左上、奥への橋、奥へ下り、長いエスカレーターで手前へ。','Хүргэгч цахилгаан шат хэрэглэдэггүй. Зүүн өгсөөд арын гүүр, доош шат, урт шатаар урд буц.','ᠬᠦᠷᠭᠡᠭᠴᠢ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠬᠡᠷᠡᠭᠯᠡᠬᠦᠭᠦᠢ᠃ ᠵᠡᠭᠦᠨ ᠥᠭᠰᠥᠭᠡᠳ ᠠᠷᠤ ᠵᠦᠭ ᠶᠠᠪᠤ᠃ ᠤᠷᠲᠤ ᠰᠢᠲᠤ ᠪᠠᠷ ᠪᠤᠴᠠ᠃'],
    courierRoutes,[r('courier',at(6,0,0),at(6,1,0),'cafe',{need:'courier'}),r('lift-shopper',at(6,0,0),at(6,1,0))]),
  round('planter-bypass',
    ['Behind the planter','从花池后面绕行','植え込みの奥へ','Цэцгийн мандлын ард','ᠴᠡᠴᠡᠭ ᠦᠨ ᠮᠠᠨᠳᠠᠯ ᠤᠨ ᠠᠷᠤ'],
    ['The planter blocks only the front bay. Bridge to depth 1, cross behind it, and return to depth 0 at column 2.','花池只挡前排。到进深 1，绕过花池，再在第 2 列回到进深 0。','植え込みは手前だけをふさぎます。奥行き1へ橋を渡り、裏を通って列2で手前へ戻ろう。','Мандал зөвхөн урд гүнд байна. Гүн 1-ээр тойроод багана 2 дээр урд буц.','ᠴᠡᠴᠡᠭ ᠦᠨ ᠮᠠᠨᠳᠠᠯ ᠵᠥᠪᠬᠡᠨ ᠡᠮᠦᠨ᠎ᠡ ᠪᠠᠢᠨ᠎ᠠ᠃ ᠠᠷᠤ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠲᠣᠭᠣᠷᠢ᠃'],
    [b(0,0,0,0,0,1),b(0,0,1,1,0,1),b(1,0,1,2,0,1),b(2,0,1,2,0,0)],[r('planter',at(0,0,0),at(2,0,0))],{obstacles:[{x:.5,y:-.2,z:-.2,w:1,h:.4,d:.4}]}),
  round('balloon-bay',
    ['The open balloon bay','气球的开阔后廊','風船の広い通り道','Бөмбөлгийн нээлттэй зам','ᠪᠥᠮᠪᠥᠯᠥᠭ ᠦᠨ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠵᠠᠮ'],
    ['The low canopy covers column 1 between the front and rear. Balloons bridge right to column 2, climb in depth, then bridge left to reunite.','低棚罩住第 1 列的进深通道。气球先向右到第 2 列、沿进深上升，再向左汇合。','低い屋根は列1の奥への道にあります。風船は列2へ橋、奥へ上り、左へ橋で合流。','Намхан дээвэр багана 1-д байна. Бөмбөлөг багана 2-оор өгсөөд зүүн гүүрээр нийлнэ.','ᠨᠠᠮᠬᠠᠨ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠢ ᠬᠠᠠᠨ᠎ᠠ᠃ ᠪᠠᠷᠠᠭᠤᠨ ᠥᠭᠰᠥᠭᠡᠳ ᠵᠡᠭᠦᠨ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠨᠢᠭᠡᠳ᠃'],
    balloonRoutes,[r('bay-walker',at(1,0,0),at(1,1,2)),r('bay-balloon',at(1,0,0),at(1,1,2),'cafe',{balloon:true})],{lowCeilings:[balloonRoof]}),
  round('layered-duet',
    ['A duet in separate layers','不同进深的双重奏','別の奥行きの二重奏','Тусдаа гүний хослол','ᠲᠤᠰᠠᠳᠠ ᠭᠦᠨ ᠦ ᠬᠣᠣᠰᠯᠠᠯ'],
    ['Crossed silhouettes are not collisions when their depth differs. Build the front ascent and rear descent, then extend the front route back with two bridges.','投影交叉不代表碰撞：不同进深可以相交。前排上升、后排下降，再用两座桥把前排路线延伸到后排。','見た目が交差しても奥行きが違えば衝突しません。手前を上り、奥を下り、手前の終点から橋2つで奥へ。','Өөр гүнд харагдах огтлолцол мөргөлдөөн биш. Урд өгсөж ард буугаад хоёр гүүрээр холбо.','ᠥᠭᠡᠷ ᠭᠦᠨ ᠳᠦ ᠵᠠᠮ ᠮᠥᠷᠭᠥᠯᠳᠥᠬᠦᠭᠦᠢ᠃ ᠡᠮᠦᠨ᠎ᠡ ᠥᠭᠰᠥᠵᠦ ᠠᠷᠤ ᠪᠠᠭᠤ᠃ ᠬᠣᠶᠠᠷ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠣᠯᠪᠣ᠃'],
    [l(0,0,0,2,1,0),l(0,1,2,2,0,2),b(2,1,0,2,1,1),b(2,1,1,2,1,2)],[r('front-duet',at(0,0,0),at(2,1,2),'books'),r('rear-duet',at(0,1,2),at(2,0,2))]),
  round('home-through-depth',
    ['Home through the atrium','穿过中庭回家','吹き抜けを抜けて帰ろう','Төв танхимаар харих','ᠲᠥᠪ ᠲᠠᠩᠬᠢᠮ ᠢᠶᠠᠷ ᠬᠠᠷᠢᠬᠤ'],
    ['Point both depth escalators toward the front and down: (5,3,2) → (5,2,1) → (5,1,0). Finish left and down.','两段进深扶梯都向前下行：(5,3,2) → (5,2,1) → (5,1,0)，最后向左下降。','奥行きのエスカレーター2本は手前へ下り。(5,3,2) → (5,2,1) → (5,1,0)、最後は左下へ。','Хоёр гүний шатыг урд доош чиглүүл: (5,3,2) → (5,2,1) → (5,1,0). Зүүн буу.','ᠬᠣᠶᠠᠷ ᠰᠢᠲᠤ ᠶᠢ ᠡᠮᠦᠨ᠎ᠡ ᠳᠣᠣᠰᠢ ᠴᠢᠭᠯᠡᠭᠦᠯ᠃ (5,3,2) → (5,2,1) → (5,1,0)᠃ ᠵᠡᠭᠦᠨ ᠪᠠᠭᠤ᠃'],
    [s(5,3,2,5,2,1),s(5,2,1,5,1,0),s(5,1,0,4,0,0)],[r('depth-home',at(5,3,2),at(4,0,0),'books')]),
  round('quiet-refuge',
    ['A quiet low-level refuge','安心的低层绕行','安心できる低い道','Нам давхрын тайван зам','ᠨᠠᠮ ᠳᠠᠪᠬᠤᠷ ᠤᠨ ᠲᠠᠢᠪᠤᠩ ᠵᠠᠮ'],
    ['The roof shortcut touches floor 3. A guest afraid of heights stays below 3: bridge forward, descend, span the courtyard and bridge back.','屋顶捷径接触第 3 层。恐高乘客要低于 3：向前搭桥、下降、跨过中庭，再回后廊。','屋上の近道は階3に触れます。高い所が苦手な人は3未満で。手前へ橋、下り、吹き抜けを渡って奥へ。','Өндрөөс айдаг хүн давхар 3-т хүрэхгүй. Урд гүүр, доош шат, төвийг дамнаад ард буц.','ᠥᠨᠳᠥᠷ ᠡᠴᠡ ᠠᠶᠤᠭᠴᠢ ᠨᠠᠮ ᠵᠠᠮ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃ ᠡᠮᠦᠨ᠎ᠡ ᠭᠦᠭᠦᠷᠭᠡ᠂ ᠳᠣᠣᠰᠢ ᠰᠢᠲᠤ᠂ ᠠᠷᠤ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠣᠯᠪᠣ᠃'],
    refugeRoutes,[r('roof-walker',at(2,2,2),at(4,2,2),'garden'),r('quiet-guest',at(2,2,2),at(4,2,2),'garden',{need:'acrophobia'})]),
  round('rear-chorus',
    ['The rear-gallery chorus','后廊大合唱','奥の回廊のコーラス','Арын танхимын найрал','ᠠᠷᠤ ᠲᠠᠩᠬᠢᠮ ᠤᠨ ᠨᠠᠢᠷᠠᠯ'],
    ['Merge the two rear entrances at (3,1,2), share the lift, then branch left, right and forward. The stroller joins at the shared lift.','两个后侧入口在 (3,1,2) 汇合，共用电梯，再向左、右、前分流。婴儿车从共用电梯处加入。','奥の入口2つを (3,1,2) で合流。エレベーターを共有し、左、右、手前へ。ベビーカーは共有地点から。','Хоёр арын үүд (3,1,2)-т нийлнэ. Цахилгаан шатаа хуваалцаад зүүн, баруун, урд салга.','ᠬᠣᠶᠠᠷ ᠠᠷᠤ ᠡᠭᠦᠳᠡ (3,1,2) ᠳᠡᠭᠡᠷ᠎ᠡ ᠨᠢᠭᠡᠳᠦᠨ᠎ᠡ᠃ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠶᠢ ᠬᠠᠮᠲᠤ ᠬᠡᠷᠡᠭᠯᠡᠭᠡᠳ ᠵᠠᠮ ᠢ ᠰᠠᠯᠭᠠ᠃'],
    [l(0,0,2,2,1,2),b(2,1,2,3,1,2),l(6,0,2,4,1,2),b(4,1,2,3,1,2),e(3,1,2,2),s(3,2,2,2,3,2),s(3,2,2,4,3,2),l(3,2,2,3,1,0)],
    [r('west-song',at(0,0,2),at(2,3,2)),r('east-song',at(6,0,2),at(4,3,2),'books'),r('front-song',at(0,0,2),at(3,1,0),'garden'),r('shared-stroller',at(3,1,2),at(3,2,2),'garden',{need:'stroller'})]),
  round('stepped-summit',
    ['The stepped summit','阶梯轮廓的顶点','段々の屋上へ','Шаталсан оргил','ᠰᠢᠲᠤᠯᠠᠭᠰᠠᠨ ᠣᠷᠭᠢᠯ'],
    ['Follow the building silhouette: front lift, long depth ascent, long rear ascent, then a lift to floor 4 and a roof bridge.','沿建筑轮廓前进：前侧电梯、纵深长扶梯、后廊长扶梯，再坐电梯到第 4 层，搭桥到屋顶。','建物の段差に沿って。手前のエレベーター、奥への長い上り、奥で横へ上り、階4へエレベーターと橋。','Урд цахилгаан шат, арын урт шат, зүүнээс баруун урт шат, давхар 4-т цахилгаан шат ба гүүр.','ᠡᠮᠦᠨ᠎ᠡ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠠᠷᠤ ᠤᠷᠲᠤ ᠰᠢᠲᠤ ᠪᠠᠷ ᠥᠭᠰᠥ᠃ 4 ᠳᠠᠪᠬᠤᠷ ᠲᠤ ᠭᠦᠭᠦᠷᠭᠡ ᠲᠠᠪᠢ᠃'],
    [e(0,0,0,1),l(0,1,0,0,2,2),l(0,2,2,2,3,2),e(2,3,2,4),b(2,4,2,3,4,2)],[r('summit',at(0,0,0),at(3,4,2),'garden')]),
  round('family-canopy',
    ['Family under the canopy','低棚下的家庭旅程','屋根の下の家族旅行','Дээврийн доорх гэр бүл','ᠳᠡᠭᠡᠪᠦᠷᠢ ᠶᠢᠨ ᠳᠣᠣᠷᠠᠬᠢ ᠭᠡᠷ ᠪᠦᠯᠢ'],
    ['Three paths meet at the rear shop: depth stairs for walkers, the front lift stack for a stroller with a balloon, and the open column-1 ascent for balloons.','三条路线在后侧商店汇合：普通乘客走进深扶梯；带气球婴儿车走前侧连续电梯；气球走第 1 列开阔扶梯。','奥の店で3つの道が合流。歩く人は奥への階段、風船のベビーカーは手前の連続エレベーター、風船は列1の上り。','Явган хүн гүний шат, бөмбөлөгтэй тэрэг урд цахилгаан шат, бөмбөлөг багана 1-ийн нээлттэй шатаар явна.','ᠶᠠᠪᠤᠭᠠᠨ ᠬᠦᠮᠦᠨ ᠰᠢᠲᠤ᠂ ᠲᠡᠷᠭᠡ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠵᠠᠮ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃'],
    [s(0,0,0,0,1,1),s(0,1,1,0,2,2),b(0,2,2,1,2,2),e(0,0,0,1),e(0,1,0,2),b(0,2,0,0,2,1),b(0,2,1,0,2,2),b(0,0,0,1,0,0),l(1,0,0,1,1,2),e(1,1,2,2)],
    [r('family-walker',at(0,0,0),at(1,2,2),'books'),r('family-stroller',at(0,0,0),at(1,2,2),'books',{need:'stroller',balloon:true}),r('family-balloon',at(0,0,0),at(1,2,2),'books',{balloon:true})],{lowCeilings:[{x:-.2,y:.2,z:.3,w:.4,h:.5,d:.6}]}),
  round('parcel-and-pram',
    ['Parcel and pram','包裹与婴儿车','荷物とベビーカー','Илгээмж ба хүүхдийн тэрэг','ᠢᠯᠡᠭᠡᠮᠵᠢ ᠪᠠ ᠬᠡᠦᠬᠡᠳ ᠦᠨ ᠲᠡᠷᠭᠡ'],
    ['The courier uses the long frontward escalator and left ascent. The stroller lifts at the rear, crosses both depth bridges, bridges left and lifts again.','快递员用向前的长扶梯，再左上。婴儿车在后側乘电梯、跨两格进深、向左搭桥，再乘电梯。','配達員は手前へ長いエスカレーターと左上。ベビーカーは奥で上り、手前へ橋2つ、左へ橋、再びエレベーター。','Хүргэгч урт шатаар урд өгсөнө. Тэрэг арын цахилгаан шат, хоёр гүний гүүр, зүүн гүүр ба цахилгаан шат хэрэглэнэ.','ᠬᠦᠷᠭᠡᠭᠴᠢ ᠤᠷᠲᠤ ᠰᠢᠲᠤ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃ ᠲᠡᠷᠭᠡ ᠠᠷᠤ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ᠂ ᠬᠣᠶᠠᠷ ᠭᠦᠭᠦᠷᠭᠡ ᠬᠡᠷᠡᠭᠯᠡᠨ᠎ᠡ᠃'],
    [l(6,0,2,6,1,0),s(6,1,0,5,2,0),e(6,0,2,1),b(6,1,2,6,1,1),b(6,1,1,6,1,0),b(6,1,0,5,1,0),e(5,1,0,2)],
    [r('parcel-front',at(6,0,2),at(5,2,0),'books',{need:'courier'}),r('pram-front',at(6,0,2),at(5,2,0),'books',{need:'stroller'})]),
  round('low-courtyard',
    ['Low across the courtyard','低层穿越中庭','低い中庭の横断','Нам төвийн гарц','ᠨᠠᠮ ᠲᠥᠪ ᠦᠨ ᠭᠠᠷᠴᠠ'],
    ['The rear roof route rises to floor 3. Keep the nervous guest on the middle-depth switchback: (2,1,0) → (2,2,1) → (4,1,1) → (4,2,2).','后侧屋顶路线会上第 3 层。恐高乘客沿中排折返：(2,1,0) → (2,2,1) → (4,1,1) → (4,2,2)。','奥の屋上は階3。高い所が苦手な人は中央の折り返し、(2,1,0) → (2,2,1) → (4,1,1) → (4,2,2)。','Айдаг зочин дунд гүнээр явна: (2,1,0) → (2,2,1) → (4,1,1) → (4,2,2).','ᠠᠶᠤᠭᠴᠢ ᠵᠣᠴᠢᠨ ᠨᠠᠮ ᠵᠠᠮ ᠢᠶᠠᠷ (2,1,0) → (2,2,1) → (4,1,1) → (4,2,2) ᠶᠠᠪᠤᠨ᠎ᠠ᠃'],
    [l(2,1,0,2,2,2),s(2,2,2,3,3,2),s(3,3,2,4,2,2),s(2,1,0,2,2,1),l(2,2,1,4,1,1),s(4,1,1,4,2,2)],
    [r('courtyard-walker',at(2,1,0),at(4,2,2)),r('courtyard-quiet',at(2,1,0),at(4,2,2),'cafe',{need:'acrophobia'})]),
  round('sculpture-slalom',
    ['The sculpture slalom','雕塑之间的立体折返','彫刻の立体スラローム','Баримлын сүлжсэн зам','ᠪᠠᠷᠢᠮᠠᠯ ᠤᠨ ᠰᠦᠯᠵᠢᠭᠰᠡᠨ ᠵᠠᠮ'],
    ['Thread behind the front sculpture, climb across the rear, dip into the middle wings and climb back. Save the final lift for the right tower.','绕到前侧雕塑后面，在后廊横向上升，下降到中排侧翼，再回后廊。把最后一段电梯留给右塔。','手前の彫刻の奥へ。奥で横に上り、中央の翼へ下り、また奥へ上る。最後のエレベーターは右の塔へ。','Урд баримлын ард өгсөөд дунд жигүүрт бууж дахин ард өгс. Сүүлийн цахилгаан шат баруун цамхагт.','ᠡᠮᠦᠨ᠎ᠡ ᠪᠠᠷᠢᠮᠠᠯ ᠤᠨ ᠠᠷᠤ ᠥᠭᠰᠥ᠃ ᠳᠤᠮᠳᠠ ᠪᠠᠭᠤᠭᠠᠳ ᠳᠠᠬᠢᠨ ᠠᠷᠤ ᠥᠭᠰᠥ᠃ ᠪᠠᠷᠠᠭᠤᠨ ᠴᠠᠮᠬᠠᠭ ᠲᠤ ᠬᠦᠷ᠃'],
    [l(0,0,0,0,1,2),l(0,1,2,2,2,2),s(2,2,2,2,1,1),l(2,1,1,4,2,1),s(4,2,1,4,3,2),l(4,3,2,6,2,2),e(6,2,2,3)],
    [r('slalom',at(0,0,0),at(6,3,2),'garden')],{obstacles:[{x:.5,y:-.2,z:-.2,w:1,h:1.2,d:.4},{x:2.7,y:.2,z:1.7,w:.6,h:1.3,d:.6}],lowCeilings:[{x:4.7,y:.1,z:.2,w:.6,h:1.5,d:.6}]}),
  round('roof-homecoming',
    ['The roof homecoming','屋顶散场向前汇合','屋上から手前へ合流','Дээврээс гэртээ','ᠳᠡᠭᠡᠪᠦᠷᠢ ᠡᠴᠡ ᠭᠡᠷ ᠲᠡᠭᠡᠨ'],
    ['Bring both rear roofs down to (3,2,2), share the down lift and long depth descent, then split toward the two front exits.','两侧后廊屋顶先下到 (3,2,2)，共用向下电梯和纵深长扶梯，再分流到前侧两个出口。','奥の屋上2つから (3,2,2) へ。下りエレベーターと手前への長い下りを共有し、入口2つへ分かれよう。','Хоёр дээврээс (3,2,2)-т буу. Доош цахилгаан шат, урт гүний шатаа хуваалцаад урд салга.','ᠬᠣᠶᠠᠷ ᠳᠡᠭᠡᠪᠦᠷᠢ ᠡᠴᠡ (3,2,2) ᠪᠠᠭᠤ᠃ ᠳᠣᠣᠰᠢ ᠰᠢᠲᠤ ᠶᠢ ᠬᠠᠮᠲᠤ ᠬᠡᠷᠡᠭᠯᠡᠭᠡᠳ ᠡᠮᠦᠨ᠎ᠡ ᠰᠠᠯᠭᠠ᠃'],
    [e(2,4,2,3),s(2,3,2,3,2,2),e(4,4,2,3),s(4,3,2,3,2,2),e(3,2,2,1),l(3,1,2,3,0,0),b(3,0,0,2,0,0),b(3,0,0,4,0,0)],
    [r('roof-left',at(2,4,2),at(2,0,0),'books'),r('roof-right',at(4,4,2),at(4,0,0)),r('roof-balloon',at(4,4,2),at(2,0,0),'books',{balloon:true})]),
  round('five-part-harmony',
    ['Five-part harmony','五种乘客的立体合奏','五つの旅のハーモニー','Таван хоолойн зохицол','ᠲᠠᠪᠤᠨ ᠬᠣᠭᠣᠯᠠᠢ ᠶᠢᠨ ᠵᠣᠬᠢᠴᠠᠯ'],
    ['Reuse the family lane on the left and courier loop on the right. Keep the quiet route below floor 3 at the rear; balloons bypass the column-1 canopy.','左侧用家庭路线，右侧用快递环线。后侧恐高路线保持低于第 3 层；气球绕过第 1 列低棚。','左は家族の道、右は配達員の回り道。奥の安心ルートは階3未満、風船は列1の屋根を避けます。','Зүүнд гэр бүлийн зам, баруунд хүргэгчийн тойрог. Арын тайван зам давхар 3-аас доор; бөмбөлөг дээврийг тойрно.','ᠵᠡᠭᠦᠨ ᠭᠡᠷ ᠪᠦᠯᠢ ᠶᠢᠨ ᠵᠠᠮ᠂ ᠪᠠᠷᠠᠭᠤᠨ ᠬᠦᠷᠭᠡᠭᠴᠢ ᠶᠢᠨ ᠲᠣᠭᠣᠷᠢᠭ᠃ ᠠᠷᠤ ᠨᠠᠮ ᠵᠠᠮ᠂ ᠪᠥᠮᠪᠥᠯᠥᠭ ᠦᠨ ᠨᠡᠭᠡᠭᠡᠯᠲᠡᠢ ᠵᠠᠮ ᠬᠣᠯᠪᠣ᠃'],
    ensemble,ensembleRequests,{lowCeilings:[balloonRoof],obstacles:[{x:2.8,y:-.2,z:.7,w:.4,h:1,d:.6}]}),
  round('atrium-festival',
    ['The sky-atrium festival','立体中庭的终章庆典','立体吹き抜けのフィナーレ','Тэнгэрийн танхимын баяр','ᠲᠡᠩᠭᠡᠷᠢ ᠶᠢᠨ ᠲᠠᠩᠬᠢᠮ ᠤᠨ ᠪᠠᠶᠠᠷ'],
    ['Complete all five routes, then share the front left lift and extend its tower to floor 4. Bridge in depth to the accessible roof party; no guest loses their safe detour.','完成五条路线后，共用左前电梯，把塔楼延伸到第 4 层，再沿进深搭桥到无障碍屋顶派对。保留每位乘客的安全绕行。','5つの道を完成させ、左手前のエレベーターを階4まで伸ばそう。奥への橋で誰でも行ける屋上へ。安全な回り道も残して。','Таван замаа дуусгаад зүүн урд цахилгаан шатыг давхар 4-т сунга. Гүний гүүрээр дээврийн баярт хүр. Аюулгүй замуудаа хадгал.','ᠲᠠᠪᠤᠨ ᠵᠠᠮ ᠢ ᠳᠤᠭᠤᠰᠬᠠ᠃ ᠵᠡᠭᠦᠨ ᠡᠮᠦᠨ᠎ᠡ ᠴᠠᠬᠢᠯᠭᠠᠨ ᠰᠢᠲᠤ ᠶᠢ 4 ᠳᠠᠪᠬᠤᠷ ᠲᠤ ᠰᠤᠩᠭᠠ᠃ ᠠᠷᠤ ᠭᠦᠭᠦᠷᠭᠡ ᠪᠡᠷ ᠪᠠᠶᠠᠷ ᠲᠤ ᠬᠦᠷ᠃'],
    [...ensemble,e(0,1,0,2),e(0,2,0,3),e(0,3,0,4),b(0,4,0,0,4,1)],
    [...ensembleRequests,r('roof-chair',at(0,0,0),at(0,4,1),'garden',{wheelchair:true,balloon:true})],{lowCeilings:[balloonRoof],obstacles:[{x:2.8,y:-.2,z:.7,w:.4,h:1,d:.6},{x:4.6,y:.2,z:1.6,w:.3,h:.5,d:.3}]}),
];
