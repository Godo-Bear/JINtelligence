/* History and Geography topic banks (Victorian Curriculum, Years 7-8 level), written fresh for JINtelligence —
   two topics each, with a lesson, worked examples and 15 questions across all three difficulties.
   Follows the same self-contained pattern as science.js. Loaded after visuals.js and science.js, before app.js. */
const HISTORY_TOPICS = (function () {
  const mix = (arr, seed) => {
    let x = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 13);
    const out = [...arr];
    const rnd = () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  const mc = (d, prompt, options, answer, explanation) => ({ d, prompt, options: mix(options, prompt), answer, answerType: "text", explanation });
  const q = (d, prompt, answer, explanation) => ({ d, prompt, answer, ...(typeof answer === "number" ? {} : { answerType: "text" }), explanation });
  const order = (d, prompt, items, first, last, explanation) => ({ d, prompt, visual: { type: "order", items, first, last }, explanation });
  const topic = (id, name, icon, info, list) => ({
    id, name, icon, ...info,
    questions: list.map((item, i) => {
      const { d, ...rest } = item;
      const out = { id: `${id}-${i + 1}`, difficulty: d, ...rest };
      if (isVisualInput(out)) out.answer = visualAnswerText(out);
      return out;
    }),
  });

  return [
    topic("hist-ancient", "Ancient Civilisations", "🏛️", {
      blurb: "Mesopotamia, Ancient Egypt, Ancient Greece and Ancient Rome — how the earliest civilisations shaped government, writing and law.",
      recap: "The earliest civilisations developed writing, laws and government that still shape the world today — from democracy in Ancient Greece to the Roman alphabet still used to write English.",
      example: "Democracy began in Ancient Athens, where citizens voted directly on the laws that governed them.",
      workedExample: {
        1: { question: "Which river valley is considered the 'cradle of civilisation', home to Sumer and Babylon?", walkthrough: "Mesopotamia developed between the Tigris and Euphrates rivers, in what is now mostly Iraq. It's often called the 'cradle of civilisation' because it's home to some of the earliest cities and writing." },
        2: { question: "What was the name of the picture-writing system used in Ancient Egypt?", walkthrough: "Ancient Egyptians wrote using hieroglyphics — small pictures and symbols representing sounds and ideas, often carved on temple walls and tombs." },
        3: { question: "What type of government did Ancient Athens pioneer, where citizens voted directly on laws?", walkthrough: "Ancient Athens pioneered democracy, from Greek words meaning 'rule by the people'. Citizens (though only free men at the time) voted directly on laws and decisions." },
      },
    }, [
      mc(1, "Which river flows through Ancient Egypt?", ["The Nile", "The Amazon", "The Tigris", "The Ganges"], "The Nile", "The Nile's yearly floods made the surrounding land fertile, allowing Ancient Egyptian civilisation to thrive in the desert."),
      mc(1, "What were the great stone tombs built for Egyptian pharaohs called?", ["Pyramids", "Ziggurats", "Colosseums", "Aqueducts"], "Pyramids", "The pyramids were built as tombs to protect and honour the bodies of Egyptian pharaohs."),
      q(1, "What is the name of the Ancient Egyptian picture-writing system?", ["hieroglyphics", "hieroglyphs"], "Hieroglyphics used small pictures and symbols to represent sounds and ideas."),
      mc(1, "Mesopotamia developed between which two rivers?", ["The Tigris and Euphrates", "The Nile and Amazon", "The Ganges and Indus", "The Danube and Rhine"], "The Tigris and Euphrates", "These two rivers, in modern-day Iraq, gave Mesopotamia its fertile land."),
      mc(1, "Which ancient civilisation built the Colosseum?", ["Ancient Rome", "Ancient Greece", "Ancient Egypt", "Mesopotamia"], "Ancient Rome", "The Colosseum in Rome was a huge amphitheatre used for public entertainment, including gladiator contests."),
      mc(2, "Which Ancient Greek city-state is credited with inventing democracy?", ["Athens", "Sparta", "Rome", "Troy"], "Athens", "Ancient Athens pioneered democracy, letting citizens vote directly on laws."),
      q(2, "What is the title given to Ancient Egyptian kings and rulers?", "pharaoh", "A pharaoh was treated as both a political leader and a god-like figure in Ancient Egypt."),
      mc(2, "The Ancient Romans built huge networks of these structures to carry water into cities. What are they called?", ["Aqueducts", "Pyramids", "Ziggurats", "Amphitheatres"], "Aqueducts", "Roman aqueducts used gravity to carry fresh water, sometimes over long distances, into cities and towns."),
      mc(2, "Which Ancient Greek city-state was known for its strict warrior culture and powerful army?", ["Sparta", "Athens", "Crete", "Corinth"], "Sparta", "Spartan society trained boys from a young age to become disciplined soldiers."),
      order(2, "Put these civilisations in the order they are generally taught to have first developed, earliest to latest.", ["Mesopotamia", "Ancient Egypt", "Ancient Greece", "Ancient Rome"], "Earliest", "Most recent", "Mesopotamia and Egypt developed first (around 3000-3500 BCE), followed by Ancient Greece (from about 800 BCE) and then Ancient Rome."),
      mc(3, "What was the name of the early Babylonian code of laws, one of the oldest written legal codes in history?", ["The Code of Hammurabi", "The Magna Carta", "The Twelve Tables", "The Justinian Code"], "The Code of Hammurabi", "Created by King Hammurabi of Babylon, it set out laws and punishments carved onto a large stone pillar."),
      q(3, "What is the name for the Ancient Egyptian process of preserving a body for the afterlife?", ["mummification", "embalming"], "Mummification involved removing organs, drying the body, and wrapping it in linen, so it would last for the afterlife."),
      mc(3, "Which Ancient Roman set of laws was an early legal code that influenced later Roman law?", ["The Twelve Tables", "The Code of Hammurabi", "The Magna Carta", "The Rosetta Stone"], "The Twelve Tables", "The Twelve Tables, written around 450 BCE, were one of the earliest Roman attempts to write down a legal code everyone could see."),
      mc(3, "The Rosetta Stone helped historians decode which ancient writing system?", ["Egyptian hieroglyphics", "Roman numerals", "Sumerian cuneiform", "Ancient Greek script"], "Egyptian hieroglyphics", "The Rosetta Stone had the same text written in hieroglyphics, Demotic script and Ancient Greek, letting scholars finally translate hieroglyphics."),
      q(3, "What is the name of the wedge-shaped writing system developed in Mesopotamia, one of the earliest writing systems in the world?", "cuneiform", "Cuneiform was written by pressing a reed stylus into soft clay tablets, making wedge-shaped marks."),
    ]),
    topic("hist-medieval", "Medieval Europe and Exploration", "🏰", {
      blurb: "Feudalism, the Black Death and castles, then the Renaissance and the voyages of exploration that connected the world.",
      recap: "Life in Medieval Europe was organised around feudalism and the Church, before trade, the Renaissance and new sea voyages connected the world in new ways.",
      example: "Castles were built for defence during the Middle Ages, and explorers like Columbus and Cook later sailed to places Europeans had never mapped before.",
      workedExample: {
        1: { question: "What is the name for the medieval social system where land was exchanged for loyalty and military service?", walkthrough: "This system is called feudalism. A king granted land to lords, who granted parts of it to knights, in exchange for loyalty and military service." },
        2: { question: "What disease killed roughly a third of Europe's population in the 1300s?", walkthrough: "This was the Black Death (bubonic plague), spread partly by fleas on rats, which devastated Europe's population in the 14th century." },
        3: { question: "Who is credited with leading the first European voyage to reach the Americas, in 1492?", walkthrough: "Christopher Columbus led a Spanish-funded expedition across the Atlantic in 1492, reaching the Caribbean." },
      },
    }, [
      mc(1, "What is the name for the medieval system where land was given in exchange for loyalty and service?", ["Feudalism", "Democracy", "Communism", "Federation"], "Feudalism", "Under feudalism, kings granted land to lords, who granted parts of it to knights, in return for loyalty and military service."),
      mc(1, "What were medieval castles mainly built for?", ["Defence", "Farming", "Trade", "Worship"], "Defence", "Castles were built with thick walls, moats and towers to protect lords and their land from attack."),
      q(1, "What is the deadly disease, also called the bubonic plague, that killed millions in Europe during the 1300s?", ["the black death", "black death", "bubonic plague"], "The Black Death spread quickly across Europe in the 1300s, partly carried by fleas living on rats."),
      mc(1, "Who is credited with leading the first European voyage to reach the Americas, in 1492?", ["Christopher Columbus", "James Cook", "Ferdinand Magellan", "Marco Polo"], "Christopher Columbus", "Columbus sailed across the Atlantic Ocean in 1492, funded by the Spanish crown, reaching the Caribbean."),
      mc(1, "Which group ran most schools and kept most books in medieval Europe?", ["The Church", "The army", "Merchants", "Kings alone"], "The Church", "Monasteries and the Church were centres of education and book-copying throughout the Middle Ages."),
      mc(2, "What period of 'rebirth' in art, science and learning followed the Middle Ages in Europe?", ["The Renaissance", "The Reformation", "The Enlightenment", "The Industrial Revolution"], "The Renaissance", "The Renaissance, starting in Italy, saw a renewed interest in classical art, science and learning."),
      q(2, "What is the word for the code of honourable conduct followed by medieval knights?", "chivalry", "Chivalry was a code covering courage, honour and the protection of the weak, expected of medieval knights."),
      mc(2, "Which explorer led the first expedition to sail all the way around the world, though he died partway through the voyage?", ["Ferdinand Magellan", "Christopher Columbus", "James Cook", "Vasco da Gama"], "Ferdinand Magellan", "Magellan's expedition set out in 1519 and completed the first circumnavigation of the globe in 1522, though Magellan himself was killed in the Philippines."),
      mc(2, "What invention by Johannes Gutenberg, around 1440, allowed books to be copied much faster than by hand?", ["The printing press", "The compass", "The telescope", "The steam engine"], "The printing press", "The printing press used movable metal type, letting books be printed far more quickly and cheaply than copying by hand."),
      order(2, "Put these events in chronological order, earliest to latest.", ["The Black Death reaches Europe", "The printing press is invented", "Columbus reaches the Americas", "Cook charts the east coast of Australia"], "Earliest", "Most recent", "The Black Death struck in the mid-1300s, the printing press was invented around 1440, Columbus reached the Americas in 1492, and Cook charted Australia's east coast in 1770."),
      mc(3, "In which century did the Black Death reach Europe?", ["The 14th century", "The 10th century", "The 16th century", "The 18th century"], "The 14th century", "The Black Death reached Europe around 1347, which falls in the 14th century."),
      q(3, "In what year did Captain James Cook chart the east coast of Australia, claiming it for Britain?", 1770, "Cook charted the east coast of Australia in 1770 during his first Pacific voyage on the Endeavour."),
      mc(3, "Which trade route network, revived by increased trade in the late Middle Ages, famously connected Europe to Asia and was used by Marco Polo?", ["The Silk Road", "The Nile trade route", "The Amber Road", "The Spice Islands route"], "The Silk Road", "The Silk Road was a network of trade routes connecting Europe and Asia, carrying goods like silk, spices and ideas."),
      q(3, "What is the general term for a farming system where land is divided into sections and a different crop (or none at all) is grown in each each year, to keep the soil fertile?", ["crop rotation", "crop rotation system"], "Crop rotation, including leaving a field fallow (unplanted) sometimes, helped medieval farmers keep their soil productive."),
      mc(3, "Which of these pairs correctly names two of the three main groups ('estates') of medieval society?", ["The clergy and the nobility", "The army and the navy", "The judges and the senators", "The explorers and the merchants"], "The clergy and the nobility", "Medieval society was often divided into the clergy (church), the nobility (lords and knights), and everyone else (commoners, including peasants and merchants)."),
    ]),
  ];
})();

const GEOGRAPHY_TOPICS = (function () {
  const mix = (arr, seed) => {
    let x = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
    const out = [...arr];
    const rnd = () => { x = (x + 0x6d2b79f5) >>> 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  const mc = (d, prompt, options, answer, explanation) => ({ d, prompt, options: mix(options, prompt), answer, answerType: "text", explanation });
  const q = (d, prompt, answer, explanation) => ({ d, prompt, answer, ...(typeof answer === "number" ? {} : { answerType: "text" }), explanation });
  const num = (d, prompt, answer, explanation, tolerance) => ({ d, prompt, answer, explanation, ...(tolerance ? { tolerance } : {}) });
  const order = (d, prompt, items, first, last, explanation) => ({ d, prompt, visual: { type: "order", items, first, last }, explanation });
  const topic = (id, name, icon, info, list) => ({
    id, name, icon, ...info,
    questions: list.map((item, i) => {
      const { d, ...rest } = item;
      const out = { id: `${id}-${i + 1}`, difficulty: d, ...rest };
      if (isVisualInput(out)) out.answer = visualAnswerText(out);
      return out;
    }),
  });

  return [
    topic("geo-landforms", "Landscapes, Landforms and Water", "🏞️", {
      blurb: "Weathering, erosion and deposition shape landforms, and the water cycle moves water between the ocean, sky and land.",
      recap: "Natural processes like weathering, erosion and deposition shape landforms over time, and the water cycle constantly moves water between the oceans, atmosphere and land.",
      example: "A river's mouth often forms a flat, fan-shaped landform called a delta, where it deposits sediment as it slows down entering the sea.",
      workedExample: {
        1: { question: "What is the process called when rock is broken down in place, without being moved?", walkthrough: "This is weathering — rock breaking down where it is, caused by things like temperature changes, rain, wind or plant roots." },
        2: { question: "What is the process called when broken-down rock and soil are moved by wind, water or ice?", walkthrough: "This is erosion — the movement of weathered material from one place to another, by forces like rivers, wind, waves or glaciers." },
        3: { question: "What are the three main stages of the water cycle usually called?", walkthrough: "Evaporation (water turns to vapour), condensation (vapour forms clouds) and precipitation (water falls as rain, snow or hail), often followed by run-off back to the ocean." },
      },
    }, [
      mc(1, "What is the term for rock being broken down where it is, without being moved?", ["Weathering", "Erosion", "Deposition", "Evaporation"], "Weathering", "Weathering breaks rock down in place, caused by things like temperature changes, rain, wind or plant roots."),
      mc(1, "What is the term for broken rock and soil being carried away by water, wind or ice?", ["Erosion", "Weathering", "Precipitation", "Condensation"], "Erosion", "Erosion is the movement of weathered material from one place to another."),
      mc(1, "What is it called when water vapour turns back into liquid water in the sky, forming clouds?", ["Condensation", "Evaporation", "Precipitation", "Erosion"], "Condensation", "Condensation happens when water vapour cools and turns back into tiny liquid droplets, forming clouds."),
      mc(1, "What is rain, snow or hail falling from clouds called?", ["Precipitation", "Evaporation", "Condensation", "Deposition"], "Precipitation", "Precipitation is any form of water falling from clouds to the ground."),
      mc(1, "What is a large, flat landform at a river's mouth, formed from deposited sediment, called?", ["A delta", "A plateau", "A canyon", "A glacier"], "A delta", "As a river slows down entering the sea, it drops the sediment it was carrying, often forming a fan-shaped delta."),
      mc(2, "What is the process where the sun heats water, turning it into water vapour, called?", ["Evaporation", "Condensation", "Precipitation", "Deposition"], "Evaporation", "Evaporation is the first step of the water cycle, turning liquid water into vapour."),
      mc(2, "What is a large, raised area of mostly flat land, higher than the land around it, called?", ["A plateau", "A valley", "A delta", "A trench"], "A plateau", "A plateau is a raised, flat area of land, sometimes called a tableland."),
      q(2, "What is the term for rock or soil being dropped or settled somewhere after being carried by water, wind or ice?", "deposition", "Deposition happens when the water, wind or ice carrying sediment slows down and can no longer carry it, so it's dropped."),
      mc(2, "A U-shaped valley with steep sides was most likely carved by which force?", ["A glacier", "A desert wind", "A volcano", "An earthquake"], "A glacier", "Glaciers carve wide, U-shaped valleys as they slowly grind through rock on their way downhill."),
      mc(2, "What is a deep, narrow valley with steep sides, often carved by a river over a very long time, called?", ["A canyon", "A plateau", "A delta", "A plain"], "A canyon", "Canyons, like the Grand Canyon, form as rivers slowly erode rock over thousands or millions of years."),
      mc(3, "Which coastline feature is a tall, isolated column of rock left standing after the rock around it has eroded away?", ["A sea stack", "A delta", "A plateau", "An estuary"], "A sea stack", "Sea stacks form when waves erode a headland unevenly, leaving an isolated column of harder rock standing in the sea."),
      order(3, "Put these stages of the water cycle in order, starting with water evaporating from the ocean.", ["Water evaporates from the ocean", "Water vapour condenses into clouds", "Precipitation falls as rain or snow", "Water runs off into rivers and back to the ocean"], "Start", "End", "Water evaporates, condenses into clouds, falls as precipitation, then runs off back towards the ocean, completing the cycle."),
      mc(3, "What is the area of partly salty water where a river meets the sea, often home to many different species, called?", ["An estuary", "A plateau", "A glacier", "A plain"], "An estuary", "Estuaries are where fresh river water mixes with salty seawater, creating a rich habitat for many species."),
      mc(3, "Coral reefs, like the Great Barrier Reef, are most commonly found in which climate zone?", ["Tropical", "Polar", "Temperate", "Arid/desert"], "Tropical", "Coral reefs need warm, shallow, sunlit water to grow, which is why they're found in tropical regions."),
      q(3, "What is the name for a long, flat area of mostly flat land, often used for farming, found between hills, mountains or along a river?", ["a plain", "plain"], "A plain is a large area of flat land, often fertile and widely used for farming."),
    ]),
    topic("geo-global", "Global Connections and Map Skills", "🗺️", {
      blurb: "Why people migrate, how cities grow, and how to read a map using scale, contour lines, latitude and longitude.",
      recap: "Geographers study why people move (migration), how cities grow (urbanisation), and how to read maps using scale, contour lines, and lines of latitude and longitude.",
      example: "Someone might migrate because of a 'push' factor like war at home, or a 'pull' factor like better job opportunities somewhere else.",
      workedExample: {
        1: { question: "A family leaves their country because of war. Is this a push or pull factor?", walkthrough: "This is a push factor — something negative at home that pushes people to leave." },
        2: { question: "A map has a scale of 1 : 100 000. A distance of 2 cm on the map represents what real distance, in km?", walkthrough: "2 cm × 100 000 = 200 000 cm. Converting to km: 200 000 ÷ 100 000 = 2 km." },
        3: { question: "What do lines of latitude measure?", walkthrough: "Lines of latitude measure distance north or south of the equator (0°), running horizontally around the globe." },
      },
    }, [
      mc(1, "A reason that pushes someone to leave their home country, like war or famine, is called a…", ["Push factor", "Pull factor", "Contour line", "Latitude line"], "Push factor", "A push factor is something negative at home that drives people to leave, like war, famine or persecution."),
      mc(1, "A reason that attracts someone to move to a new country, like job opportunities, is called a…", ["Pull factor", "Push factor", "Longitude line", "Scale factor"], "Pull factor", "A pull factor is something positive about a new place that attracts people to move there."),
      mc(1, "What is it called when more and more people move to live in cities?", ["Urbanisation", "Migration", "Erosion", "Globalisation"], "Urbanisation", "Urbanisation is the growth in the proportion of people living in cities rather than rural areas."),
      mc(1, "What do lines of latitude measure distance from?", ["The equator", "The North Pole", "The Prime Meridian", "The nearest coastline"], "The equator", "Lines of latitude run horizontally and measure distance north or south of the equator."),
      mc(1, "What do lines of longitude measure distance from?", ["The Prime Meridian", "The equator", "The South Pole", "The International Date Line"], "The Prime Meridian", "Lines of longitude run vertically (pole to pole) and measure distance east or west of the Prime Meridian."),
      mc(2, "On a topographic map, lines joining points of equal height are called…", ["Contour lines", "Latitude lines", "Grid lines", "Scale lines"], "Contour lines", "Contour lines connect points of equal elevation, showing the shape of the land."),
      mc(2, "On a contour map, contour lines that are very close together show what kind of land?", ["Steep land", "Flat land", "A river", "A lake"], "Steep land", "Closely spaced contour lines mean height changes quickly over a short distance — steep terrain."),
      num(2, "A map has a scale of 1 : 50 000. A real distance of 5 km is how many cm on the map? (1 km = 100 000 cm)", 10, "5 km = 500 000 cm. At a scale of 1 : 50 000, the map distance is 500 000 ÷ 50 000 = 10 cm."),
      mc(2, "The term for the world becoming more connected through trade, travel and technology is called…", ["Globalisation", "Urbanisation", "Migration", "Colonisation"], "Globalisation", "Globalisation describes growing connections between countries through trade, communication and travel."),
      mc(2, "Which of these is an example of a 'pull' factor for migration?", ["Better job opportunities", "A natural disaster at home", "A war at home", "A famine at home"], "Better job opportunities", "Better job opportunities attract people to a new place, making it a pull factor."),
      num(3, "A map has a scale of 1 : 25 000. A distance of 8 cm on the map represents how many metres in real life? (1 cm on the map = 25 000 cm = 250 m in real life)", 2000, "8 cm × 250 m = 2000 m in real life."),
      mc(3, "A city with a population of over 10 million people is generally classified as a…", ["Megacity", "Primate city", "Metropolis only", "Urban sprawl"], "Megacity", "The United Nations generally defines a megacity as an urban area with a population over 10 million."),
      mc(3, "What is it called when a city's built-up area spreads outward into surrounding rural land?", ["Urban sprawl", "Urbanisation", "Deforestation", "Desertification"], "Urban sprawl", "Urban sprawl is the uncontrolled spread of a city's development into the countryside around it."),
      q(3, "What is the name for the imaginary line at 0° longitude, passing through Greenwich, England, used as the reference point for time zones?", ["the prime meridian", "prime meridian"], "The Prime Meridian is the reference line for measuring longitude and for setting world time zones (like GMT)."),
      mc(3, "Which of these is most likely to be a genuine 'push' factor causing migration?", ["Political persecution at home", "Better schools elsewhere", "A warmer climate elsewhere", "Family already living elsewhere"], "Political persecution at home", "Political persecution is a negative condition at home pushing people to leave, making it a push factor (the others describe reasons that pull someone towards a new place)."),
    ]),
  ];
})();

Object.assign(TOPIC_LESSONS, {
  "hist-ancient": [
    { title: "The first civilisations", text: "Mesopotamia and Ancient Egypt were among the first civilisations, both growing up around rivers whose yearly floods created fertile farmland.",
      points: ["Mesopotamia grew up between the Tigris and Euphrates rivers.", "Ancient Egypt grew up along the Nile."] },
    { title: "Government and law", points: ["Ancient Athens pioneered democracy — citizens voting directly on laws.", "Babylon's Code of Hammurabi was one of the earliest written law codes.", "Rome's Twelve Tables were an early attempt to write Roman law down for everyone to see."] },
    { title: "Writing systems", points: ["Egyptian hieroglyphics used pictures and symbols.", "Mesopotamian cuneiform used wedge-shaped marks pressed into clay.", "The Rosetta Stone, with the same text in three scripts, let historians finally decode hieroglyphics."],
      tip: "A civilisation's writing system is one of the clearest signs historians use to study how advanced and organised it was." },
  ],
  "hist-medieval": [
    { title: "Feudalism and daily life", text: "Medieval European society was organised through feudalism — land exchanged for loyalty and military service, from the king down to knights.",
      points: ["Castles were built mainly for defence.", "The Church ran most schools and kept most books."] },
    { title: "The Black Death", text: "The Black Death reached Europe in the 14th century, killing a huge share of the population and changing society afterwards.",
      points: ["It spread partly through fleas living on rats.", "It reduced the workforce so much that surviving peasants gained more bargaining power over their labour."] },
    { title: "The Renaissance and exploration", points: ["The Renaissance was a 'rebirth' of art, science and learning, starting in Italy.", "The printing press (Gutenberg, around 1440) let books be copied far faster than by hand.", "Explorers like Columbus, Magellan and later Cook sailed to places Europeans had never mapped before."] },
  ],
  "geo-landforms": [
    { title: "Shaping the land", text: "Weathering breaks rock down in place; erosion carries it away; deposition drops it somewhere new.",
      points: ["Glaciers carve wide, U-shaped valleys.", "Rivers can carve deep, narrow canyons over a very long time.", "Deltas form where a river deposits sediment as it slows down entering the sea."] },
    { title: "The water cycle", points: ["Evaporation: the sun heats water, turning it to vapour.", "Condensation: vapour cools and forms clouds.", "Precipitation: water falls as rain, snow or hail.", "Run-off: water flows back towards rivers and the ocean, completing the cycle."] },
    { title: "Coasts and climate", points: ["Sea stacks form where waves erode a headland unevenly.", "Estuaries mix fresh river water with salty seawater, creating rich habitats.", "Coral reefs need warm, shallow, sunlit water, so they grow in tropical regions."] },
  ],
  "geo-global": [
    { title: "Migration", text: "People migrate for push factors (negative reasons to leave, like war or famine) and pull factors (positive reasons to move somewhere, like jobs or safety).",
      tip: "If a question describes something bad happening at home, it's almost always a push factor; if it describes something good about a new place, it's a pull factor." },
    { title: "Cities and urbanisation", points: ["Urbanisation is the growing share of people living in cities.", "A megacity generally has a population over 10 million.", "Urban sprawl is a city's built-up area spreading into the surrounding countryside."] },
    { title: "Map skills", points: ["Contour lines join points of equal height; closely spaced lines mean steep land.", "Map scale (like 1 : 50 000) converts map distances into real-world distances.", "Latitude measures distance north/south of the equator; longitude measures distance east/west of the Prime Meridian."] },
  ],
});
