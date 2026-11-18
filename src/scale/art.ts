const tau = Math.PI * 2;
const n = (value: number) => +value.toFixed(2);
const many = (count: number, paint: (index: number) => string) => Array.from({ length: count }, (_, i) => paint(i)).join('');
const path = (d: string, fill: string, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
const pen = (d: string, color: string, width = 1, opacity = 1) => path(d, 'none', `stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"`);
const oval = (x: number, y: number, rx: number, ry: number, fill: string, attrs = '') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${attrs}/>`;
const dot = (x: number, y: number, r: number, fill: string, opacity = 1) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" opacity="${n(opacity)}"/>`;
const rect = (x: number, y: number, w: number, h: number, fill: string, r = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const group = (transform: string, content: string) => `<g transform="${transform}">${content}</g>`;
const trace = (count: number, coordinate: (i: number) => string, close = false) => `M${Array.from({ length: count }, (_, i) => coordinate(i)).join('L')}${close ? 'Z' : ''}`;
type Stop = readonly [offset: number, color: string, opacity?: number];

function studio(id: string) {
  let state = 2166136261;
  for (const letter of id) state = Math.imul(state ^ letter.charCodeAt(0), 16777619);
  const definitions: string[] = [];
  const key = (name: string) => `scale-art-${id}-${name}`;
  const url = (name: string) => `url(#${key(name)})`;
  const stops = (values: readonly Stop[]) => values.map(([at, color, alpha = 1]) => `<stop offset="${at}%" stop-color="${color}" stop-opacity="${alpha}"/>`).join('');
  const radial = (name: string, values: readonly Stop[], cx = '38%', cy = '30%', r = '72%') => {
    definitions.push(`<radialGradient id="${key(name)}" cx="${cx}" cy="${cy}" r="${r}">${stops(values)}</radialGradient>`);
    return url(name);
  };
  const linear = (name: string, values: readonly Stop[], x = '0%', y = '100%') => {
    definitions.push(`<linearGradient id="${key(name)}" x2="${x}" y2="${y}">${stops(values)}</linearGradient>`);
    return url(name);
  };
  const clip = (name: string, shape: string, content: string) => {
    definitions.push(`<clipPath id="${key(name)}">${shape}</clipPath>`);
    return `<g clip-path="${url(name)}">${content}</g>`;
  };
  const haze = (name: string, x: number, y: number, rx: number, ry: number, color: string, alpha: number) => oval(x, y, rx, ry, radial(name, [[0, color, alpha], [50, color, alpha * .45], [100, color, 0]], '50%', '50%', '50%'));
  const background = (core: string, edges: string, arc = '#151d34') => rect(0, 0, 1000, 700, radial('backdrop', [[0, core], [61, arc], [100, edges]], '52%', '48%', '73%'));
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const dust = (count: number, palette: string[], strength = 1) => many(count, () => {
    const x = random() * 1000, y = random() * 700, r = .26 + random() ** 3 * 2;
    return dot(x, y, r, pick(palette), (.12 + random() * .56) * strength);
  });
  const seal = (content: string) => `<defs>${definitions.join('')}</defs>${content}`;
  return { radial, linear, clip, haze, background, random, pick, dust, seal };
}

type Studio = ReturnType<typeof studio>;

function pine(x: number, y: number, height: number, fill: string, glint: string) {
  return group(`translate(${n(x)} ${n(y)}) scale(${n(height / 100)})`,
    path('M-2 4L-2 -56H2L3 4Z', fill) + path('M0 -100C-4 -84 -10 -76 -14 -73L-8 -74Q-12 -63 -21 -58L-13 -59Q-18 -46 -26 -41L-18 -43Q-23 -28 -33 -25Q-15 -25 -2 -33Q16 -22 33 -28Q22 -33 17 -45L25 -42Q14 -51 10 -62L19 -58Q9 -70 7 -77L13 -74Q5 -87 0 -100Z', fill) + pen('M0 -96Q-2 -68 -1 -35M-1 -51Q-9 -45 -18 -43M0 -65Q7 -58 15 -58', glint, .8, .56));
}

function catFigure(coat: string) {
  return `<g>
    ${pen('M619 436C672 448 707 413 688 373C678 350 651 364 662 380', '#573934', 33)}
    ${pen('M620 431C666 442 695 411 681 376C675 360 660 367 665 377', coat, 22)}
    ${pen('M670 432l-12 -14m28 -8l-16 -4m15 -19l-16 4', '#985245', 8, .75)}
    ${path('M443 416C466 391 487 365 534 362C567 358 612 367 640 396C667 425 651 458 616 468L433 471Q408 463 424 445Z', coat)}
    ${path('M527 419C545 391 591 387 621 407C646 425 632 451 603 456H558C542 456 539 449 544 442L581 432C558 433 537 430 527 419Z', '#a45943', 'opacity=".72"')}
    ${pen('M588 372q-18 8 -27 28m54 -19q-17 7 -23 20m41 -10q-12 4 -15 16', '#8f4b3a', 8, .8)}
    ${path('M444 420Q484 405 499 445L517 451Q531 465 510 470L426 470Q410 461 421 447Z', '#f5cf99')}
    ${path('M378 359L359 273Q359 267 367 271L424 304Q447 299 478 308L524 271Q532 269 531 278L521 359Q523 412 484 433Q444 454 401 433Q369 419 366 390Q366 372 378 359Z', coat)}
    ${path('M381 336L371 286L411 312Z M488 314L519 285L510 342Z', '#985245')}
    ${path('M381 327L375 293L403 314Z M495 314L515 296L509 331Z', '#e5a191')}
    ${path('M401 406C398 386 420 380 443 399C468 379 491 388 488 408Q479 439 444 440Q412 436 401 406Z', '#ffe0af')}
    ${pen('M420 310q10 12 12 25m14 -29l-1 34m21 -32q-9 11 -10 25m-80 23l18 10m-24 4l17 6m124 -19l-18 8m23 6l-18 5', '#99523f', 6, .85)}
    ${pen('M390 373q12 10 24 0m55 0q12 10 24 0', '#4a3333', 3.5)}
    ${path('M435 402Q442 398 451 402Q453 405 444 410Q435 408 435 402Z', '#8b4547')}
    ${pen('M444 408q-3 13 -13 8m13 -8q4 12 13 7M416 402q-24 -9 -50 -2m48 8q-22 0 -42 10m101 -16q26 -10 51 -5m-49 12q22 0 43 7', '#5b4140', 1.45, .82)}
    ${pen('M440 462l-2 6m14 -8l-1 8m51 -7l-1 7', '#a76551', 1.6, .75)}
  </g>`;
}

function house(s: Studio) {
  const { radial, linear, haze, random, pick, dust, clip } = s;
  const roof = 'M319 315L469 178L598 201L708 320L615 349L469 218L357 337Z';
  const siding = 'M342 328L469 213L600 327V477L341 443Z';
  const window = (x: number, y: number, w: number, h: number) => group(`translate(${x} ${y})`, rect(-6, -6, w + 12, h + 12, '#664044', 5) + rect(-2, -2, w + 4, h + 5, '#9d6153', 3) + rect(0, 0, w, h, '#ffce6a', 3) + path(`M3 3H${w - 5}L4 ${h - 7}Z`, '#fff3a8', 'opacity=".56"') + pen(`M${w / 2} 1v${h - 2}M1 ${h / 2}h${w - 2}`, '#a85b44', 2.7) + rect(-6, h, w + 12, 4, '#e7985f', 2));
  const sky = linear('pine-sky', [[0, '#0b2034'], [50, '#285365'], [77, '#617b7a'], [100, '#a59078']]);
  const wall = linear('plaster', [[0, '#f2be85'], [67, '#bf7e63'], [100, '#844d50']], '36%');
  const roofPaint = linear('roof', [[0, '#aa6862'], [32, '#764c5b'], [100, '#3e354b']], '31%');
  const ground = radial('meadow', [[0, '#687859'], [53, '#335b51'], [100, '#19353d']], '48%', '27%');
  const light = radial('room-light', [[0, '#ffd07b'], [60, '#db8d56'], [100, '#945453']], '57%', '35%');
  return rect(0, 0, 1000, 700, sky)
    + haze('dusk', 560, 302, 550, 267, '#f4c6a1', .43)
    + many(54, () => dot(random() * 1000, 13 + random() * 233, .28 + random() * 1.25, '#f8e2bb', .15 + random() * .5))
    + dot(668, 167, 28, '#ffe4ac', .93) + oval(658, 162, 10, 2.1, '#e4bd98', 'opacity=".46"')
    + path('M0 374L95 293L177 335L272 260L353 324L403 302L473 340L585 279L651 320L756 245L845 302L894 278L1000 327V700H0Z', '#42646a')
    + path('M0 397L138 335L226 372L335 323L422 365L553 332L645 377L772 317L890 357L1000 309V700H0Z', '#315859')
    + many(60, (i) => pine(i * 18 - 22 + random() * 13, 414 + random() * 51, 53 + random() * 74, pick(['#264b4d', '#2a5153', '#315758']), '#69847a'))
    + path('M0 455C167 415 237 458 367 439C533 423 631 414 799 446Q899 475 1000 425V700H0Z', ground)
    + path('M0 501Q196 451 334 477Q217 487 133 532Q42 537 0 560Z M1000 490Q810 465 684 491Q906 499 1000 558Z', '#77a088', 'opacity=".18"')
    + oval(535, 487, 222, 39, '#142f34', 'opacity=".65"')
    + path('M460 677C458 603 584 565 587 506Q590 480 570 465L606 462Q630 499 613 533C587 579 558 622 592 700H461Z', '#a78d70', 'opacity=".8"')
    + many(115, () => {
      const x = random() * 1000, y = 448 + random() * 245;
      if (x > 480 && x < 620) return '';
      return pen(`M${n(x)} ${n(y)}l${n(-4 - random() * 8)} ${n(-2 - random() * 8)}m${n(4 + random() * 6)} 3l7 -5`, pick(['#88a178', '#b2a976', '#506e5d', '#d8bb86']), .7 + random(), .36 + random() * .31);
    })
    + path('M595 317L695 294V438L597 477Z', '#9f6659')
    + clip('side-wall', path('M595 317L695 294V438L597 477Z', '#fff'), many(12, (i) => pen(`M595 ${330 + i * 14}l100 -26`, '#713e4d', 1.25, .47)))
    + path(siding, wall)
    + clip('plaster-cut', path(siding, '#fff'), many(12, (i) => pen(`M337 ${323 + i * 13}l275 35`, '#743e4d', 1, .35)))
    + path('M362 331L562 355V450L362 425Z', '#603e45')
    + path('M369 330L551 351V434L369 414Z', light)
    + path('M369 414L551 434L561 446L373 425Z', '#e6a264')
    + pen('M368 329l190 24v94l-190 -23z', '#f0b476', 5)
    + path('M380 351L418 354V390L380 385Z', '#80515a')
    + path('M384 353L414 356V385L384 381Z', '#44746c')
    + path('M386 374l13 -10 12 14z', '#a1b49a') + dot(404, 361, 3, '#ffc985')
    + path('M376 401l50 6v12l-50 -6z', '#905358') + pen('M378 399l48 6', '#f5b971', 3)
    + path('M467 347L463 377L491 380L485 349Z', '#ffde88') + pen('M478 344v-7m-2 42v30', '#824e46', 2)
    + path('M499 383l32 4v39l-32 -4z', '#438579') + path('M492 397l47 5v17l-47 -5z', '#588e80')
    + pen('M498 415v9m36 -4v8', '#764748', 3)
    + oval(453, 425, 32, 8, '#a35055', 'transform="rotate(6 453 425)"')
    + group('translate(358 323) scale(.219)', catFigure('#eeb174'))
    + window(463, 264, 35, 39) + group('matrix(.9 -.23 0 1 635 341)', window(0, 0, 38, 46))
    + path('M637 249v-47l29 -9l18 9v86z', '#9a615d') + path('M666 193l18 9v75l-18 -13z', '#664854')
    + pen('M635 203l31 -10 20 9m-48 13l28 -9 16 7', '#d19377', 4)
    + pen('M652 189c-33 -20 30 -26 13 -45s-61 -17 -37 -37', '#d7c1b1', 6, .2)
    + path(roof, roofPaint)
    + clip('roof-cut', path(roof, '#fff'), many(12, (i) => {
      const d = 14 * i;
      return pen(`M${302 + d * .65} ${315 - d * .66}L${469 + d * .06} ${177 + d * .26}L${601 + d * .08} ${199 + d * .29}l117 136`, '#e1a58d', 1.2, .35);
    }) + many(57, () => {
      const x = 334 + random() * 370, y = 183 + random() * 150;
      return pen(`M${n(x)} ${n(y)}l${n(2 + random() * 16)} 2`, '#2e2d41', 1.3, .35);
    }))
    + pen('M318 315L469 178L615 341L709 317M353 335L469 217L599 352', '#d88c73', 5)
    + pen('M339 444l262 35l100 -38M395 467l198 29l42 -15', '#dc9d79', 6)
    + many(14, (i) => {
      const x = 304 + i * 33, y = 483 + random() * 35;
      return oval(x, y, 8 + random() * 9, 2 + random() * 4, pick(['#a09878', '#767761', '#c6a385']), 'opacity=".55"');
    })
    + [pine(108, 522, 271, '#102e37', '#356066'), pine(197, 479, 153, '#183c43', '#496e64'), pine(848, 513, 238, '#163740', '#4b7066'), pine(956, 554, 322, '#112c35', '#3a6165')].join('')
    + dust(62, ['#fff0a5', '#ffd172', '#82bca1'], .47);
}

function cat(s: Studio) {
  const { radial, linear, haze, random, pick, dust, clip } = s;
  const coat = radial('marmalade', [[0, '#ffdb9e'], [49, '#e8a467'], [100, '#ae6352']], '42%', '23%');
  return s.background('#716256', '#101b2d', '#28374a')
    + haze('hearth-glow', 362, 353, 378, 332, '#cb8a62', .47)
    + pen('M247 3v382m65 -381v361m448 -363v407m49 -403v416M0 413q485 -40 1000 38M0 427q502 -33 1000 45', '#d49873', 4, .21)
    + oval(528, 483, 255, 76, '#171b2b', 'opacity=".66"')
    + oval(520, 460, 225, 65, linear('braided-rug', [[0, '#aa6056'], [100, '#4e374c']]))
    + many(9, (i) => oval(520, 457, 217 - i * 14, 61 - i * 5.4, 'none', `stroke="${i % 2 ? '#a16a67' : '#ed9d71'}" stroke-width="2" opacity=".5" stroke-dasharray="${5 + i} 4"`))
    + haze('cat-shadow', 535, 472, 176, 38, '#291d2a', .74)
    + group('translate(-57 -96) scale(1.09)', catFigure(coat))
    + clip('face-fur', oval(428, 325, 58, 45, '#fff'), many(42, () => {
      const x = 354 + random() * 148, y = 279 + random() * 98;
      return pen(`M${n(x)} ${n(y)}l${n(3 + random() * 4)} -2`, pick(['#fff0c7', '#8b544a']), .68, .34);
    }))
    + dust(75, ['#ffdba4', '#e9a375'], .54);
}

function tissue(s: Studio) {
  const { radial, linear, clip, pick, random } = s;
  const shape = 'M308 298C364 249 426 259 482 220Q536 187 605 223L723 278Q748 294 719 319L691 448Q640 483 578 451L521 431Q478 433 421 470L308 416Q283 364 308 298Z';
  const surface = 'M308 298C364 249 426 259 482 220Q536 187 605 223L723 278Q748 294 719 319Q668 357 599 327Q534 294 488 322Q415 373 308 326Q293 317 308 298Z';
  const top = radial('top', [[0, '#ffc493'], [54, '#ce6d80'], [100, '#ad4f71']]);
  const base = linear('base', [[0, '#db7793'], [53, '#9c4876'], [100, '#573459']], '14%');
  return s.background('#57384f', '#17182e', '#2f243a') + s.haze('sample-shadow', 514, 453, 265, 106, '#1f182b', .86) + s.dust(154, ['#ffa38a', '#cc789f', '#ffd0b5'], .57)
    + path(shape, base, 'stroke="#954868" stroke-width="3"')
    + clip('section', path(shape, '#fff'), many(37, (i) => {
      const y = 310 + i * 4 + random() * 19;
      return pen(`M283 ${n(y)}C423 ${n(y + 110 * Math.sin(i * .2 + .7))} 441 ${n(y - 49)} 524 ${n(y - 22)}S623 ${n(y + 73)} 746 ${n(y - 3)}`, pick(['#ea7d96', '#713a66', '#ce658b', '#efae9a']), 1 + random() * 3, .55);
    })) + path(surface, top, 'stroke="#f8a897" stroke-width="3"')
    + clip('top-cells', path(surface, '#fff'), many(126, (i) => {
      const x = 295 + i % 18 * 26 + random() * 9, y = 213 + Math.floor(i / 18) * 23 + random() * 10;
      const color = pick(['#f8ad92', '#ffbb9b', '#d97385', '#ec8b8b', '#d56f7d']);
      return group(`translate(${n(x)} ${n(y)}) rotate(${n(-30 + random() * 60)})`, path('M-13 -3Q-8 -12 2 -10L12 -6Q18 0 12 6L2 10Q-10 9 -13 3Z', color, 'stroke="#a94d70" stroke-width="1.3"') + oval(1, 0, 4.9, 2.3, '#a55176') + dot(-1, -1, 1.05, '#ffcfb0'));
    })) + pen('M310 326Q412 373 488 322Q534 294 597 327Q665 358 720 315', '#ffc4a0', 2.4, .86);
}

function microbe(s: Studio) {
  const { radial, clip, random, pick } = s;
  const palette = ['#cfe78f', '#73b8a6', '#e5ca89', '#488e91'];
  const body = 'M-164 2C-164 -55 -115 -92 -58 -86L92 -65C144 -56 171 -37 170 12C169 59 120 85 72 80L-83 69C-139 62 -164 44 -164 2Z';
  const coat = radial('bacterium', [[0, '#d6e3a5'], [43, '#a4ce91'], [79, '#588e7a'], [100, '#2a5558']]);
  const outline = radial('envelope', [[0, '#94b897'], [100, '#78b4a3']]);
  return s.background('#285e61', '#0b2031', '#183b4c') + s.haze('slide', 506, 334, 319, 244, '#94cba4', .35) + s.dust(139, palette, .65)
    + many(17, (i) => {
      const x = 40 + random() * 925, y = 47 + random() * 599;
      if (x > 340 && x < 710 && y > 190 && y < 480) return '';
      return oval(x, y, 9 + random() * 29, 3 + random() * 8, pick(palette), `transform="rotate(${i * 32} ${n(x)} ${n(y)})" opacity=".17"`);
    })
    + group('translate(508 335) rotate(-23)',
      pen('M160 4C238 -66 270 55 227 65C191 73 201 36 237 24Q289 8 265 -39', '#9acead', 3.4, .83)
      + pen('M156 20C222 -6 287 25 263 82Q255 106 213 104', '#b6e3af', 1.35, .6)
      + many(72, (i) => {
        const a = i / 72 * tau, x = 167 * Math.cos(a), y = 80 * Math.sin(a), l = 5 + random() * 17;
        const dx = l * Math.cos(a), dy = l * Math.sin(a);
        return pen(`M${n(x)} ${n(y)}q${n(dx * .62 - 3)} ${n(dy * .6 - 5)} ${n(dx)} ${n(dy)}`, pick(palette), 1.1, .76);
      })
      + path(body, outline, 'stroke="#b1dbb3" stroke-width="7"') + group('scale(.96 .89)', path(body, coat))
      + clip('inside', path(body, '#fff'), many(174, () => {
        const x = -166 + random() * 340, y = -81 + random() * 162;
        return dot(x, y, .7 + random() * 3, pick(palette), .3 + random() * .48);
      }) + pen('M-102 22C-88 -28 -18 -31 -6 8C6 44 -63 40 -58 3C-53 -32 29 -35 41 -4C59 38 -1 44 11 12C26 -22 110 -27 94 12Q83 32 45 27', '#e5da99', 3.1, .83))
      + pen('M-146 -27Q-126 -78 -49 -75L90 -57', '#eef2bc', 3.5, .74));
}

function cell(s: Studio) {
  const { radial, clip, random, pick } = s;
  const shape = 'M343 250C369 206 427 182 489 194C538 204 581 182 627 208C677 237 699 282 692 326C686 369 717 390 678 440C643 485 601 481 564 480C513 479 482 506 427 484C365 460 339 446 332 404C325 358 297 309 343 250Z';
  const matrix = radial('matrix', [[0, '#38596e'], [52, '#41878b'], [76, '#578f93'], [94, '#266175'], [100, '#23384e']]);
  const core = radial('organelle-core', [[0, '#f1b7b2'], [28, '#d192b3'], [57, '#9e72a8'], [87, '#644476'], [100, '#50395d']]);
  const vesicle = radial('vesicle', [[0, '#fff4ba'], [39, '#c0d393'], [100, '#4f9289']]);
  const folds = (x: number, y: number, angle: number, k: number) => group(`translate(${x} ${y}) rotate(${angle}) scale(${k})`,
    path('M-35 0C-24 -24 9 -15 31 -11Q46 1 23 11Q-23 22 -35 0Z', '#bd756f', 'stroke="#f6b488" stroke-width="2.2"')
    + pen('M-28 0q8 -12 14 -3t14 1t13 -1t14 -4M-16 9q7 -7 10 -5t15 3t13 -4', '#6b5073', 2.8));
  return s.background('#275c66', '#11233c', '#1d3b52') + s.haze('specimen-glow', 513, 351, 305, 253, '#65afb2', .59) + s.dust(175, ['#8ed0c3', '#d9d795', '#a59bbf'], .61)
    + path(shape, matrix, 'stroke="#76c7c5" stroke-width="7"')
    + clip('membrane-cut', path(shape, '#fff'), many(205, () => {
      const x = 323 + random() * 386, y = 190 + random() * 306;
      return dot(x, y, .6 + random() * 2.9, pick(['#b1dad3', '#37576e', '#a1bda7', '#648eb1']), .24 + random() * .46);
    }) + many(7, (i) => pen(`M394 ${286 + i * 8}q10 -38 74 -60m-83 ${86 + i}q-16 57 56 89m117 ${-98 + i * 9}q43 26 18 68`, i % 2 ? '#6bbeb2' : '#8abfaa', 2.6, .57)))
    + folds(386, 363, 59, .94) + folds(614, 256, 28, 1.08) + folds(624, 427, -38, 1.12) + folds(473, 439, 13, .79) + folds(655, 346, -50, .66)
    + many(22, () => {
      const a = random() * tau, r = 98 + random() * 54;
      return dot(515 + Math.cos(a) * r, 331 + Math.sin(a) * r * .82, 3 + random() ** 2 * 11, vesicle, .85);
    })
    + oval(509, 330, 88, 76, core, 'transform="rotate(-17 509 330)" stroke="#e7aec5" stroke-width="4"')
    + oval(509, 330, 79, 67, 'none', 'transform="rotate(-17 509 330)" stroke="#705886" stroke-width="2.3" stroke-dasharray="2 6"')
    + oval(507, 323, 31, 24, '#9e638f', 'transform="rotate(-20 507 323)"') + oval(500, 317, 13, 6, '#e5a9ba', 'transform="rotate(-20 500 317)" opacity=".57"')
    + pen('M352 248Q411 179 484 201M589 204Q656 207 682 275M495 485q-67 13 -116 -31', '#b8e4d4', 2.6, .7);
}

function protein(s: Studio) {
  const { radial, random, pick } = s;
  const beads = ['#fac397', '#e9807a', '#88ccbb', '#89b8d4', '#b79acf'].map((c, i) => radial(`residue-${i}`, [[0, '#fff1c9'], [25, c], [68, c], [100, ['#9b5358', '#86465f', '#337781', '#456383', '#655187'][i]]]));
  const ribbon = (d: string, tone: string, glint: string) => pen(d, '#192e48', 23, .9) + pen(d, tone, 18) + pen(d, glint, 2.8, .64);
  const helix = (x: number, y: number, angle: number, length: number, color: number) => group(`translate(${x} ${y}) rotate(${angle})`,
    pen(`M0 0H${length * 7}`, '#20394e', 6)
    + many(length, (i) => {
      const z = Math.sin(i * .68), a = i * 7;
      return pen(`M${a} ${n(z * 29)}l7 ${n(Math.sin((i + 1) * .68) * 29 - z * 29)}`, '#513951', 10) + dot(a, z * 29, 7.3 + Math.cos(i * .68) * 2.3, beads[color]);
    }));
  return s.background('#3a5570', '#15213e', '#2e3858') + s.haze('fold-shadow', 518, 436, 231, 73, '#1b233d', .79) + s.dust(131, ['#a5cad1', '#e9b7ab', '#b6a5dc'], .61)
    + many(45, () => {
      const x = 40 + random() * 920, y = 40 + random() * 620;
      return x > 300 && x < 733 && y > 183 && y < 514 ? '' : dot(x, y, 2 + random() * 7, pick(beads), .15);
    })
    + ribbon('M362 319C327 281 382 225 436 249S482 314 450 358C408 425 460 446 530 409C588 378 633 408 671 371C701 340 672 286 639 274C581 255 576 221 554 214Q506 193 471 249', '#8372a8', '#d4a6ca')
    + helix(342, 309, 26, 23, 2) + helix(558, 215, 63, 21, 0)
    + ribbon('M373 405C377 456 463 472 507 443S519 390 550 357Q576 336 637 342', '#b36985', '#f7abb3')
    + path('M403 277L467 294L514 336L505 350L539 344L533 309L524 319L476 278L406 261Z', '#df936f', 'stroke="#eeae83" stroke-width="2"')
    + helix(449, 423, -33, 28, 1) + helix(592, 422, -57, 15, 4)
    + ribbon('M596 438Q570 478 525 463Q488 451 483 417', '#4c9d9d', '#b4e0bd');
}

function atom(s: Studio) {
  const { radial, haze, random, pick } = s;
  const vapor = radial('probability', [[0, '#d4c3ef', .66], [24, '#9db2eb', .45], [51, '#867cc8', .26], [100, '#4ab2c6', 0]]);
  return s.background('#333253', '#111d34', '#252d50') + s.dust(121, ['#9cd2dd', '#c3a5da'], .49)
    + many(5, (i) => oval(522 + Math.cos(i * tau / 5) * 41, 335 + Math.sin(i * tau / 5) * 30, 205 - i * 8, 93 + i * 6, vapor, `transform="rotate(${i * 37 - 30} 522 335)" opacity=".42"`))
    + many(239, () => {
      const a = random() * tau, r = 22 + Math.sqrt(random()) * 170;
      return dot(522 + r * Math.cos(a), 335 + r * Math.sin(a) * .81, .5 + random() * 1.4, pick(['#a0c8de', '#7a92bd', '#cdb0e1']), (1 - r / 208) * .56);
    }) + haze('center', 522, 335, 60, 60, '#e4c4d9', .38) + dot(522, 335, 6, '#eec6c6', .73);
}

function nucleus(s: Studio) {
  const { radial, haze, random } = s;
  const amber = radial('warm', [[0, '#f3c7a1'], [46, '#b17e87'], [100, '#563852']]);
  const jade = radial('cool', [[0, '#acd5c5'], [49, '#619eaa'], [100, '#384260']]);
  const cluster = [[-48, -55, 31], [9, -65, 34], [59, -42, 30], [-77, -12, 31], [78, 7, 31], [-51, 44, 38], [38, 53, 36], [-18, -19, 39], [30, -14, 37], [-2, 35, 39]];
  return s.background('#423957', '#181b32', '#272d46') + haze('halo', 526, 335, 246, 190, '#a090b4', .3) + s.dust(133, ['#93aabf', '#a888ac', '#d5b0a6'], .52)
    + group('translate(524 333) rotate(-16)', `<g opacity=".76">${cluster.map(([x, y, r], i) => dot(x, y, r, i % 2 ? amber : jade) + pen(`M${x - r * .6} ${y - 4}q2 -14 15 -19`, i % 2 ? '#f6d1bd' : '#c7e4de', 1.9, .43)).join('')}
    ${many(21, () => dot(-48 + random() * 96, -49 + random() * 98, .5 + random(), '#faf0d3', .37))}</g>`);
}

function field(s: Studio) {
  const { haze, random } = s;
  return s.background('#283d5c', '#141e3a', '#21344f') + haze('electric-blue', 470, 328, 328, 207, '#557da7', .38)
    + haze('magnetic-rose', 587, 336, 269, 183, '#bd76a5', .25) + s.dust(162, ['#a7c5d5', '#c6a9c8'], .48)
    + group('rotate(-15 520 340)', many(21, (i) => {
      const off = (i - 10) * 8;
      return pen(trace(92, (j) => {
        const x = -30 + j * 12, envelope = Math.exp(-(((x - 530) / 293) ** 2));
        const y = 334 + off * .64 + (51 + off * .44) * Math.sin((x - 500) * .025 + i * .1) * envelope;
        return `${x} ${n(y)}`;
      }), i < 10 ? '#7bbbc9' : '#c18cb6', i % 5 ? .85 : 1.5, .46 - Math.abs(i - 10) * .014);
    })) + many(24, () => {
      const x = 210 + random() * 620, y = 216 + random() * 245;
      return pen(`M${n(x)} ${n(y)}l8 -3`, '#bfdbd5', .65, .23);
    });
}

function planck(s: Studio) {
  const { linear, haze } = s;
  const floor = linear('measure-grid', [[0, '#27476c', .15], [40, '#88bcd0', .68], [100, '#c5a3c5', .13]], '78%');
  const rim = linear('measure-edge', [[0, '#7ca5c1', .09], [24, '#a5d1df', .93], [60, '#ffe3ad', .86], [100, '#b28ac6', .11]], '100%', '0%');
  const grid = many(34, (i) => {
    const frac = Math.sqrt(i / 33), y = 330 + frac * 206, inset = 95 * (1 - frac);
    return pen(`M${n(239 + inset)} ${n(y)}H${n(812 - inset)}`, floor, .85, .67);
  }) + many(44, (i) => pen(`M${n(386 + i * 6.4)} 330L${224 + i * 14} 536`, floor, .78, .8));
  return s.background('#252a51', '#121933', '#282644') + s.dust(96, ['#a6d2df', '#d3b5da'], .57)
    + haze('terminal-amber', 526, 328, 222, 49, '#e8bf9c', .56) + haze('ruler-shadow', 520, 539, 390, 100, '#171932', .57)
    + group('rotate(-12 526 335)', grid + path('M267 327H782L778 343H270Z', '#98adc8', 'opacity=".12"')
    + pen('M271 332H780', rim, 3) + many(75, (i) => {
      const x = 288 + i * 6.4, h = i % 10 === 0 ? 36 : i % 5 === 0 ? 17 : 7;
      return pen(`M${n(x)} 332v-${h}`, rim, i % 5 ? .9 : 1.5, .81);
    }) + pen('M521 262v103m10 -103v103M521 269h10m-10 89h10', '#ffe3ad', 1.6, .9)
    + dot(526, 331, 4, '#fff3c8', .92));
}

function earth(s: Studio) {
  const { radial, linear, haze, clip, random } = s;
  const sea = radial('ocean', [[0, '#77c4d1'], [39, '#428da9'], [70, '#356e97'], [92, '#23496d'], [100, '#1c3458']]);
  const terrain = linear('terrain', [[0, '#c4d896'], [29, '#91b991'], [48, '#d5be83'], [75, '#98b98e'], [100, '#546d6f']], '38%');
  const shade = radial('terminator', [[0, '#171c39', 0], [47, '#192744', .02], [73, '#16223e', .14], [100, '#101835', .81]], '33%', '31%', '79%');
  const land = 'M411 219L427 210L451 207L477 211L500 224L513 224L533 239L526 247L514 245L517 253L508 262L485 266L478 277L468 285L461 299L468 309L480 312L491 328L502 333L495 342L487 340L476 331L464 331L459 322L447 320L435 309L434 296L422 286L415 270L395 266L385 278L368 276L370 259L388 244Z M500 340L516 331L534 340L544 350L563 353L574 364L572 379L559 394L554 410L542 419L530 439L516 451L507 450L506 438L500 427L506 407L501 391L492 382L485 363L490 350Z M536 204L558 198L580 203L584 210L570 235L555 243L547 239L552 226L544 217Z M626 249L640 251L659 265L675 272L694 296L691 332L668 328L659 316L646 316L635 326L623 319L615 308L618 294L607 290L610 278L620 278Z M626 331L647 335L663 349L675 354L681 366L668 381L657 398L646 420L632 423L623 413L625 395L614 379L602 369L605 346Z';
  const sphere = dot(523, 336, 158, '#fff');
  return s.background('#2f4664', '#111931', '#212e4b') + s.dust(193, ['#a6c6d9', '#ded3ae', '#9c9bc4'], .83)
    + haze('atmosphere', 523, 336, 231, 231, '#72bfc9', .62)
    + dot(523, 336, 161, '#83c9d4', .66) + dot(523, 336, 158, sea)
    + clip('globe', sphere, path(land, terrain, 'stroke="#668c81" stroke-width="1.2"')
      + clip('continents', path(land, '#fff'), many(190, () => {
        const x = 363 + random() * 328, y = 192 + random() * 265;
        return oval(x, y, 1.5 + random() * 8, .8 + random() * 4, random() < .57 ? '#426e68' : '#f0d59e', 'opacity=".23"');
      }))
      + path('M377 218L445 173L582 177L619 200L564 209L539 203L518 213L485 204L463 214L422 227L396 240L380 233Z M396 471Q443 462 472 468L512 461L539 473L588 463L648 456L630 503L425 515Z', '#dbede7', 'opacity=".85"')
      + many(43, (i) => {
        const x = 357 + (i % 8) * 42 + random() * 45, y = 211 + Math.floor(i / 8) * 49 + random() * 29;
        return pen(`M${n(x)} ${n(y)}q12 -4 27 -8t${n(15 + random() * 26)} 3`, '#e8efde', 1.3 + random() ** 2 * 9, .1 + random() * .4);
      }) + dot(523, 336, 158, shade))
    + pen('M369 326C374 271 409 221 459 196Q506 174 550 183', '#bcf5e7', 2.1, .86);
}

function solar(s: Studio) {
  const { radial, haze, clip, random } = s;
  const sun = radial('photosphere', [[0, '#fff4c0'], [36, '#ffdb88'], [72, '#f4a15d'], [94, '#da6f55'], [100, '#c95a55']]);
  const orbit = [65, 89, 120, 150, 190, 229, 273, 321];
  const planet = [
    [2.75, 4, '#a8a8aa', '#53495e'], [4.7, 7, '#ebbd86', '#985b5d'], [5.75, 8, '#78c7cf', '#376a90'], [3.46, 6, '#e49676', '#985364'],
    [.13, 24, '#eac098', '#ac6f6c'], [2.8, 19, '#e4c68e', '#997061'], [5.16, 12, '#98cecb', '#518a9d'], [2.04, 10, '#83a8d8', '#4d659e'],
  ] as const;
  return s.background('#354364', '#141a33', '#232d4b') + s.dust(207, ['#9ba5cc', '#ffdcb0', '#d7c3d7'], .66)
    + haze('ecliptic', 521, 329, 416, 201, '#42628e', .39)
    + group('rotate(-13 521 329)', orbit.map((r, i) => oval(521, 329, r, r * .46, 'none', `stroke="${i % 2 ? '#868fb2' : '#baa5b4'}" stroke-width="1.1" opacity=".49"`)).join('')
    + many(155, () => {
      const a = random() * tau, r = 160 + random() * 20;
      return dot(521 + r * Math.cos(a), 329 + r * .46 * Math.sin(a), .35 + random() * 1.15, '#d4b3b1', .25 + random() * .4);
    }) + haze('corona', 521, 329, 100, 100, '#ffc589', .79) + dot(521, 329, 44, sun)
    + clip('sun-cut', dot(521, 329, 43, '#fff'), many(86, () => {
      const x = 477 + random() * 88, y = 285 + random() * 88;
      return pen(`M${n(x)} ${n(y)}q3 -3 ${n(3 + random() * 7)} -2`, random() < .4 ? '#fff3bd' : '#f19b65', 1.3, .5);
    }))
    + planet.map(([angle, radius, light, dark], i) => {
      const rx = orbit[i], x = n(521 + rx * Math.cos(angle)), y = n(329 + rx * .46 * Math.sin(angle));
      const fill = radial(`world-${i}`, [[0, '#fff1c3'], [33, light], [72, light], [100, dark]]);
      const bands = i === 4 ? clip('jovian-stripes', dot(x, y, radius, '#fff'), many(8, (j) => pen(`M${x - 26} ${y - 24 + j * 6}q20 9 54 2`, j % 2 ? '#ad736d' : '#fee2ae', 2 + j % 3, .68))) : '';
      const ring = i === 5 ? oval(x, y, radius * 1.71, radius * .44, 'none', `stroke="#efcc97" stroke-width="3.2" transform="rotate(-18 ${x} ${y})" opacity=".79"`) : '';
      return dot(x, y, radius, fill) + bands + ring;
    }).join(''));
}

// Spiral lights are an illustration of a disk, not a catalog of individual stars.
function spiral(s: Studio, x: number, y: number, size: number, rotation: number, opacity: number, density: number, palette: string[], glowName: string) {
  const { random, pick, haze } = s;
  return group(`translate(${x} ${y}) rotate(${rotation}) scale(${size})`, `<g opacity="${opacity}">
    ${haze(`${glowName}-disk`, 0, 0, 235, 148, palette[0], .33)}
    ${many(density, (i) => {
      const r = 13 + Math.sqrt(random()) * 185;
      const a = (i % 3) * tau / 3 + r * .023 + (random() - .5) * (1.02 - r / 375);
      return dot(Math.cos(a) * r, Math.sin(a) * r * .55 + (random() - .5) * 17, .45 + random() ** 3 * 3.5, pick(palette), .16 + (1 - r / 218) * .48 + random() * .24);
    })}
    ${haze(`${glowName}-bulge`, 0, 0, 67, 35, palette[1], .67)}
  </g>`);
}

function galaxy(s: Studio) {
  return s.background('#2d345a', '#121b36', '#242c4e') + s.dust(214, ['#c9d4e4', '#a2a5cb', '#e9c0ba'], .72)
    + s.haze('star-belt', 516, 348, 320, 153, '#8f7da5', .29)
    + spiral(s, 526, 334, 1.12, -28, .73, 570, ['#7f9ace', '#f2cb9f', '#b3add7', '#df99a6'], 'galactic')
    + s.haze('outer-dust', 320, 390, 200, 53, '#685b8c', .25);
}

function localGroup(s: Studio) {
  const galaxies = [
    [388, 370, .70, -36, .71, 184], [608, 283, .82, 18, .69, 196], [620, 429, .39, -4, .63, 100],
    [490, 237, .2, -35, .59, 55], [524, 407, .17, 62, .64, 46], [431, 422, .16, 19, .53, 48],
  ];
  return s.background('#2e355c', '#111a32', '#222c48') + s.dust(237, ['#97a8cb', '#e4c9b8', '#8b8eb5'], .78)
    + s.haze('association', 521, 333, 294, 203, '#8d88ad', .29)
    + galaxies.map(([x, y, z, angle, opacity, count], i) => spiral(s, x, y, z, angle, opacity, count, i % 2 ? ['#99b5db', '#ded5b4', '#d6a7b9'] : ['#ba9ebc', '#f2c49e', '#a2b7dc'], `neighbor-${i}`)).join('');
}

function web(s: Studio) {
  const { random, pick, haze } = s;
  const nodes = [[42, 168], [225, 212], [361, 308], [488, 238], [532, 354], [668, 264], [748, 382], [879, 248], [967, 127], [144, 500], [351, 471], [566, 490], [706, 561], [894, 524], [989, 616], [77, 654], [378, 594], [534, 61], [747, 86], [299, 89], [63, 358]];
  const threads = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [9, 10], [10, 4], [4, 11], [11, 6], [11, 12], [12, 13], [13, 14], [9, 15], [10, 16], [16, 11], [2, 10], [3, 17], [5, 18], [1, 19], [18, 7], [17, 19], [20, 2], [20, 9], [6, 13], [3, 5]];
  const colors = ['#7db1ce', '#988cc1', '#e7bfaa', '#c893b6'];
  return s.background('#313552', '#151a31', '#252b46') + s.dust(172, colors, .59)
    + haze('gold-supercluster', 514, 351, 294, 211, '#c38ca7', .26)
    + threads.map(([from, to], i) => {
      const [x1, y1] = nodes[from], [x2, y2] = nodes[to];
      const d = (i % 2 ? -1 : 1) * (12 + random() * 24);
      const mx = (x1 + x2) / 2 + d, my = (y1 + y2) / 2 - d;
      const line = `M${x1} ${y1}Q${n(mx)} ${n(my)} ${x2} ${y2}`;
      const color = colors[i % colors.length];
      return pen(line, color, 22, .065) + pen(line, color, 8, .12) + pen(line, color, .9, .41)
        + many(37, () => {
          const t = random(), w = (random() - .5) * (10 + Math.sin(t * Math.PI) * 20);
          const x = (1 - t) ** 2 * x1 + 2 * t * (1 - t) * mx + t * t * x2 + w;
          const y = (1 - t) ** 2 * y1 + 2 * t * (1 - t) * my + t * t * y2 - w * .6;
          return dot(x, y, .37 + random() ** 3 * 2.13, pick(colors), .16 + random() * .39);
        });
    }).join('')
    + nodes.map(([x, y], i) => haze(`knot-${i}`, x, y, i === 4 ? 49 : 26, i === 4 ? 46 : 23, colors[i % 4], .46) + many(i === 4 ? 31 : 9, () => dot(x + (random() - .5) * 17, y + (random() - .5) * 14, .5 + random() * 1.6, pick(colors), .6))).join('');
}

function horizon(s: Studio) {
  const { radial, haze, clip, random, pick } = s;
  const globe = 'M352 325a174 169 0 1 0 348 0a174 169 0 1 0 -348 0Z';
  const surface = radial('light-shell', [[0, '#8a779a'], [37, '#927994'], [64, '#566c8e'], [86, '#37466f'], [100, '#1d294f']], '44%', '38%');
  const colors = ['#d4a0ae', '#a5bacd', '#e8bd94', '#8e8eb8', '#62537d'];
  const map = (a: number, b: number) => {
    const wobble = 7 * Math.sin(a * 4 + b * 6) + 4.4 * Math.sin(a * 9 - b * 4);
    return [526 + (174 + wobble) * Math.cos(a) * Math.sin(b), 325 + (169 + wobble) * Math.cos(b)];
  };
  return s.background('#383959', '#121b33', '#222947') + s.dust(241, colors, .75)
    + haze('last-light', 527, 326, 279, 241, '#c08aa7', .50) + path(globe, surface)
    + clip('surface-bound', path(globe, '#fff'), many(42, (i) => {
      const b = .1 + i * 3 / 41;
      return pen(trace(64, (j) => map(j / 63 * Math.PI, b).map(n).join(' ')), colors[i % colors.length], 2.9 + (i % 4) * 1.2, .39);
    }) + many(26, (i) => pen(trace(49, (j) => map(i / 25 * Math.PI, .03 + j * 3.08 / 48).map(n).join(' ')), colors[(i + 3) % colors.length], .85, .27))
    + many(430, () => {
      const x = 349 + random() * 354, y = 156 + random() * 338;
      return dot(x, y, .53 + random() ** 3 * 4.7, pick(colors), .13 + random() * .35);
    }) + haze('near-light', 461, 252, 183, 127, '#e7b09b', .25))
    + path(globe, 'none', 'stroke="#b6abc6" stroke-opacity=".71" stroke-width="2"')
    + pen('M365 269C390 195 462 155 532 156Q573 157 608 176', '#f2bdad', 2.1, .71)
    + group('rotate(-25 526 325)', pen('M320 319C374 395 676 399 732 319', '#edbfaf', 2.4, .58) + pen('M320 319C373 257 676 252 732 319', '#a985ac', 1.3, .49)
    + dot(725, 330, 3.7, '#ffd8a7') + dot(336, 335, 2.9, '#a9d2cf'));
}

const painters = { house, cat, tissue, microbe, cell, protein, atom, nucleus, field, planck, earth, solar, galaxy, group: localGroup, web, horizon };

/** Paints the inner artwork of a 1000 × 700 SVG. The caller owns the viewport and overlays. */
export function sceneArt(id: string): string {
  const name = Object.prototype.hasOwnProperty.call(painters, id) ? id as keyof typeof painters : 'house';
  const brush = studio(name);
  return brush.seal(painters[name](brush));
}
