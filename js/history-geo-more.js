/* More History and Geography topics (Victorian Curriculum, Years 7-10 level): three more History topics and four more
   Geography topics, each with a lesson summary, worked examples and 12 questions across the three difficulties.
   Adds to HISTORY_TOPICS / GEOGRAPHY_TOPICS (js/history-geo.js), so it must load after that file and before app.js. */
(function () {
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

  HISTORY_TOPICS.push(
    topic("hist-australia", "Australia's First Peoples and the First Fleet", "🪃", {
      blurb: "The world's oldest continuing cultures, the arrival of the First Fleet in 1788, and the journey towards recognition, from Mabo to the national apology.",
      recap: "Aboriginal and Torres Strait Islander peoples have cared for this land for more than 60,000 years. The arrival of the First Fleet in 1788 changed their lives forever, and important events since then have shaped how Australia recognises its First Peoples.",
      example: "The Mabo decision in 1992 overturned the idea of 'terra nullius' and recognised that Indigenous people had rights to their land before 1788.",
      workedExample: {
        1: { question: "How long have Aboriginal and Torres Strait Islander peoples lived in Australia?", walkthrough: "Evidence shows people have lived in Australia for more than 60,000 years, which makes theirs among the oldest continuing cultures in the world." },
        2: { question: "What was the 1967 referendum about?", walkthrough: "Australians voted to change the Constitution so that Aboriginal and Torres Strait Islander people would be counted in the census and the federal government could make laws for them. It passed with over 90% of the vote." },
        3: { question: "What did the 1992 Mabo decision overturn?", walkthrough: "The High Court rejected 'terra nullius' (the idea that the land belonged to no one in 1788) and recognised native title, meaning Indigenous peoples' traditional connection to land could be recognised in law." },
      },
    }, [
      mc(1, "For about how long have Aboriginal and Torres Strait Islander peoples lived in Australia?", ["More than 60,000 years", "About 2,000 years", "About 10,000 years", "About 500 years"], "More than 60,000 years", "Aboriginal and Torres Strait Islander peoples have lived here for more than 60,000 years, in one of the world's oldest continuing cultures."),
      mc(1, "From which country did the First Fleet sail to Australia in 1787–1788?", ["Britain", "France", "Spain", "The Netherlands"], "Britain", "The First Fleet of 11 ships left Britain in 1787 and arrived at Botany Bay in January 1788, carrying convicts, marines and officials."),
      q(1, "In what year did the First Fleet arrive in Australia?", 1788, "The First Fleet arrived in January 1788 and settled at Sydney Cove."),
      mc(1, "Who led the First Fleet and became the first Governor of New South Wales?", ["Arthur Phillip", "James Cook", "Matthew Flinders", "Lachlan Macquarie"], "Arthur Phillip", "Captain Arthur Phillip commanded the First Fleet and was the colony's first Governor."),
      mc(2, "Why did Britain send convicts to Australia?", ["To ease overcrowded prisons in Britain", "Because Australia needed more farmers", "To find gold", "To start a war"], "To ease overcrowded prisons in Britain", "British prisons were overcrowded, and convicts could no longer be sent to the American colonies, so Australia became the new destination."),
      mc(2, "What name is given to the spiritual stories that explain creation, law and the land in many Aboriginal cultures?", ["The Dreaming", "The Gold Rush", "The Federation", "The Settlement"], "The Dreaming", "The Dreaming (sometimes called the Dreamtime) is a living body of stories, law and belief connecting people, land and ancestors."),
      mc(2, "What did the 1967 referendum change?", ["Aboriginal and Torres Strait Islander people were to be counted in the census and the Commonwealth could make laws for them", "Australia became a republic", "Women gained the right to vote", "The voting age was lowered to 18"], "Aboriginal and Torres Strait Islander people were to be counted in the census and the Commonwealth could make laws for them", "The 1967 referendum was one of the most successful in Australian history, passing with more than 90% support."),
      mc(2, "The 1992 Mabo decision overturned which idea?", ["Terra nullius", "Native title", "Federation", "Transportation"], "Terra nullius", "'Terra nullius' means 'land belonging to no one'. The High Court found this was wrong and recognised native title."),
      order(2, "Put these events in order, earliest to most recent.", ["The First Fleet arrives", "The 1967 referendum", "The Mabo decision", "The National Apology to the Stolen Generations"], "Earliest", "Most recent", "The First Fleet arrived in 1788, the referendum was in 1967, Mabo was decided in 1992 and the National Apology was delivered in 2008."),
      mc(3, "The 'Stolen Generations' were:", ["Aboriginal and Torres Strait Islander children removed from their families by government policies", "Convicts who escaped from prison", "Children who travelled on the First Fleet", "Gold miners' families"], "Aboriginal and Torres Strait Islander children removed from their families by government policies", "For much of the 1900s, many Aboriginal and Torres Strait Islander children were taken from their families, causing deep and lasting harm."),
      mc(3, "Which Prime Minister delivered the National Apology to the Stolen Generations in 2008?", ["Kevin Rudd", "John Howard", "Bob Hawke", "Paul Keating"], "Kevin Rudd", "Prime Minister Kevin Rudd delivered the apology in Parliament on 13 February 2008."),
      mc(3, "Where did the First Fleet settle after leaving Botany Bay, because it had better water and a safer harbour?", ["Sydney Cove", "Port Phillip Bay", "Moreton Bay", "Hobart"], "Sydney Cove", "Phillip found Botany Bay unsuitable and moved the settlement to Sydney Cove (Port Jackson), where fresh water was available."),
      mc(3, "What is 'native title'?", ["The recognition in Australian law that some Indigenous peoples have rights and interests in their traditional land", "The first name given to Australia", "A type of convict sentence", "A tax paid by settlers"], "The recognition in Australian law that some Indigenous peoples have rights and interests in their traditional land", "Native title, recognised after Mabo and set out in the Native Title Act 1993, protects traditional rights to land and waters where connection has continued."),
    ]),
    topic("hist-gold-federation", "The Gold Rush and Federation", "⛏️", {
      blurb: "Gold in Victoria, the Eureka Stockade, and how six colonies joined together to form the Commonwealth of Australia in 1901.",
      recap: "The discovery of gold in the 1850s brought thousands of people to Victoria and changed Australia's population, economy and politics. Fifty years later the six colonies joined to become one nation.",
      example: "Ballarat and Bendigo grew from tiny settlements into rich towns almost overnight when gold was found nearby.",
      workedExample: {
        1: { question: "In which decade was gold famously discovered in Victoria?", walkthrough: "Gold was discovered in 1851 and the rush that followed ran through the 1850s, bringing people from all over the world." },
        2: { question: "What were the miners at the Eureka Stockade in 1854 protesting about?", walkthrough: "Miners were angry about expensive licence fees, heavy-handed licence checks and having no vote or say in government. The rebellion was crushed, but the government soon made changes, including giving miners the vote." },
        3: { question: "How many colonies joined to form the Commonwealth of Australia in 1901?", walkthrough: "Six colonies joined: New South Wales, Victoria, Queensland, South Australia, Western Australia and Tasmania. They became states." },
      },
    }, [
      mc(1, "In which decade was gold first found in Victoria, starting the great gold rush?", ["The 1850s", "The 1790s", "The 1900s", "The 1930s"], "The 1850s", "Gold was found in Victoria in 1851 and thousands of diggers soon arrived from around the world."),
      mc(1, "Which Victorian town was the site of the Eureka Stockade in 1854?", ["Ballarat", "Geelong", "Mildura", "Warrnambool"], "Ballarat", "Miners built a stockade at the Eureka goldfield at Ballarat in December 1854."),
      q(1, "In what year did Australia's colonies join together to form the Commonwealth of Australia?", 1901, "Federation took place on 1 January 1901."),
      mc(1, "Who became Australia's first Prime Minister?", ["Edmund Barton", "Alfred Deakin", "Robert Menzies", "Henry Parkes"], "Edmund Barton", "Edmund Barton led the first federal government in 1901."),
      mc(2, "Why were miners protesting at the Eureka Stockade?", ["High licence fees and no say in government", "A shortage of food", "A ban on gold mining", "Attacks by pirates"], "High licence fees and no say in government", "Diggers had to pay for a licence whether or not they found gold, and could not vote."),
      mc(2, "Which city was the seat of the federal Parliament from 1901 until 1927?", ["Melbourne", "Sydney", "Canberra", "Adelaide"], "Melbourne", "Parliament met in Melbourne until Parliament House in Canberra opened in 1927."),
      mc(2, "Which policy, introduced soon after Federation, limited migration to Australia based on race?", ["The White Australia policy", "The Dreaming policy", "Native title", "Free trade policy"], "The White Australia policy", "The Immigration Restriction Act 1901 began what became known as the White Australia policy, which was gradually dismantled between the 1940s and 1970s."),
      mc(2, "What is the name of the capital city built specially to house Australia's national Parliament?", ["Canberra", "Darwin", "Perth", "Hobart"], "Canberra", "Canberra was designed as a new capital between Sydney and Melbourne, so neither would be the capital."),
      mc(3, "Which constellation is shown on the Eureka Flag?", ["The Southern Cross", "Orion", "The Big Dipper", "The Seven Sisters"], "The Southern Cross", "The Eureka Flag shows the white stars of the Southern Cross on a blue background."),
      mc(3, "What is the document that sets out how Australia's federal government works called?", ["The Constitution", "The Magna Carta", "The Bill of Rights", "The Treaty"], "The Constitution", "Australians voted in referendums in the 1890s to accept a Constitution, which came into force on 1 January 1901."),
      mc(3, "How many colonies joined to form the Commonwealth of Australia?", ["Six", "Five", "Seven", "Eight"], "Six", "New South Wales, Victoria, Queensland, South Australia, Western Australia and Tasmania."),
      order(3, "Put these events in order, earliest to most recent.", ["Gold is discovered in Victoria", "The Eureka Stockade", "Federation", "Parliament moves to Canberra"], "Earliest", "Most recent", "Gold was found in 1851, the Eureka Stockade was in 1854, Federation was in 1901 and Parliament moved to Canberra in 1927."),
    ]),
    topic("hist-world-wars", "The World Wars and Australia", "🎖️", {
      blurb: "World War I, Gallipoli and Anzac Day, then World War II, from the bombing of Darwin to the Kokoda Track.",
      recap: "Australians fought in both World Wars. Gallipoli in 1915 became part of Australia's national story, and in World War II the war came close to home.",
      example: "Every year on 25 April, Australians gather at dawn services to remember those who served, starting with the Anzac landing at Gallipoli.",
      workedExample: {
        1: { question: "What does ANZAC stand for?", walkthrough: "Australian and New Zealand Army Corps, the force that landed at Gallipoli in April 1915." },
        2: { question: "What happened in Darwin on 19 February 1942?", walkthrough: "Japanese aircraft bombed Darwin, the first and largest attack by a foreign power on Australia, killing hundreds of people." },
        3: { question: "What was the Kokoda Track campaign?", walkthrough: "In 1942, Australian soldiers fought Japanese forces along a rugged track in Papua New Guinea, helping to stop the advance towards Port Moresby." },
      },
    }, [
      q(1, "In what year did World War I begin?", 1914, "World War I began in 1914 and lasted until 1918."),
      mc(1, "What does ANZAC stand for?", ["Australian and New Zealand Army Corps", "Allied Naval Zone of Australia and Canada", "Australian National Zone Army Command", "Army of New Zealand and Central Australia"], "Australian and New Zealand Army Corps", "Soldiers from Australia and New Zealand fought together as the ANZACs."),
      mc(1, "On what date is Anzac Day held each year?", ["25 April", "11 November", "26 January", "1 May"], "25 April", "Anzac Day marks the Gallipoli landing on 25 April 1915."),
      mc(1, "In which country is the Gallipoli peninsula, where Anzac troops landed in 1915?", ["Turkey", "France", "Egypt", "Greece"], "Turkey", "The Gallipoli campaign took place on the Gallipoli peninsula in the Ottoman Empire, now part of Turkey."),
      mc(2, "World War I ended with an armistice on 11 November of which year?", ["1918", "1916", "1920", "1914"], "1918", "The armistice that ended the fighting took effect on 11 November 1918."),
      mc(2, "World War II began in 1939 after Germany invaded which country?", ["Poland", "France", "Russia", "Britain"], "Poland", "Germany invaded Poland on 1 September 1939, and Britain and France declared war soon after."),
      mc(2, "What happened in Darwin on 19 February 1942?", ["It was bombed by Japanese aircraft", "It hosted a peace treaty", "It was struck by a huge cyclone", "The Anzacs landed there"], "It was bombed by Japanese aircraft", "It was the largest single attack ever made by a foreign power on Australia."),
      mc(2, "What do Australians remember on 11 November each year?", ["Remembrance Day", "Australia Day", "Labour Day", "Federation Day"], "Remembrance Day", "Remembrance Day marks the armistice that ended World War I and honours all who have died in war."),
      mc(3, "On which track in Papua New Guinea did Australian soldiers fight Japanese forces in 1942?", ["The Kokoda Track", "The Burma Railway", "The Anzac Trail", "The Silk Road"], "The Kokoda Track", "The Kokoda campaign, from July to November 1942, is remembered as a defining moment for Australia in World War II."),
      mc(3, "Which of these countries was part of the Allies in World War II?", ["The United States", "Germany", "Italy", "Japan"], "The United States", "The main Allies included Britain, the Soviet Union, the United States, China and Australia. Germany, Italy and Japan were the main Axis powers."),
      q(3, "In what year did World War II end?", 1945, "The war ended in Europe in May 1945 and with Japan's surrender in August 1945."),
      order(3, "Put these events in order, earliest to most recent.", ["The Anzac landing at Gallipoli", "The armistice ending World War I", "The bombing of Darwin", "The end of World War II"], "Earliest", "Most recent", "Gallipoli was in 1915, the armistice in 1918, the bombing of Darwin in 1942 and World War II ended in 1945."),
    ]),
  );

  GEOGRAPHY_TOPICS.push(
    topic("geo-climate", "Climate and Biomes", "🌦️", {
      blurb: "The difference between weather and climate, why the equator is hot, and the world's biomes from rainforests to deserts and tundra.",
      recap: "Weather is what's happening in the air today. Climate is the average pattern over many years. Climate shapes biomes: large regions with similar plants, animals and conditions.",
      example: "Tropical rainforests grow near the equator because it's hot and very wet, while the tundra near the poles is cold and treeless.",
      workedExample: {
        1: { question: "What imaginary line circles the Earth halfway between the North and South Poles?", walkthrough: "The equator, at 0° latitude. Places near it are hot because the Sun's rays hit them most directly." },
        2: { question: "What is the difference between weather and climate?", walkthrough: "Weather is short-term (today's rain or temperature). Climate is the long-term pattern, usually averaged over 30 years or more." },
        3: { question: "What is a rain shadow?", walkthrough: "When moist air is forced up a mountain range, it cools and drops rain on the windward side. The far (leeward) side is left dry, called a rain shadow." },
      },
    }, [
      mc(1, "What is the name of the imaginary line around the middle of the Earth?", ["The equator", "The tropic of Cancer", "The prime meridian", "The date line"], "The equator", "The equator is at 0° latitude and divides the Earth into the Northern and Southern Hemispheres."),
      mc(1, "Which biome is very dry, with very little rainfall?", ["Desert", "Tropical rainforest", "Wetland", "Temperate forest"], "Desert", "Deserts receive very little rain, usually less than 250 mm a year."),
      mc(1, "Hot, wet forests near the equator are called:", ["Tropical rainforests", "Tundra", "Savannas", "Deserts"], "Tropical rainforests", "Tropical rainforests have warm temperatures and heavy rain all year."),
      mc(1, "Which continent is the coldest on Earth?", ["Antarctica", "Asia", "North America", "Europe"], "Antarctica", "Antarctica is the coldest, driest and windiest continent."),
      mc(2, "What is the difference between weather and climate?", ["Weather is short-term, climate is the long-term pattern", "They mean exactly the same thing", "Weather is only about rain, climate only about heat", "Climate changes hourly, weather yearly"], "Weather is short-term, climate is the long-term pattern", "Weather is what's happening now; climate is the typical conditions measured over many years."),
      mc(2, "Why are places near the equator usually hotter?", ["The Sun's rays hit them more directly", "They are closer to the Moon", "They have more mountains", "There are more oceans nearby"], "The Sun's rays hit them more directly", "Near the equator, sunlight strikes more directly and is more concentrated than near the poles, where it is spread over a wider area."),
      mc(2, "What type of climate covers most of inland Australia?", ["Arid or semi-arid (dry)", "Tropical rainforest", "Polar", "Mediterranean"], "Arid or semi-arid (dry)", "Much of central Australia receives very little rain, so deserts and dry grasslands cover large areas."),
      mc(2, "In which months is summer in Australia?", ["December to February", "June to August", "March to May", "September to November"], "December to February", "Australia is in the Southern Hemisphere, so its seasons are the opposite of the Northern Hemisphere."),
      mc(3, "What are the cold, treeless regions with frozen ground near the Arctic called?", ["Tundra", "Savanna", "Taiga", "Steppe"], "Tundra", "The tundra has very cold winters, short summers and permanently frozen soil called permafrost."),
      mc(3, "What is the greenhouse effect?", ["Gases in the atmosphere trap heat and keep the Earth warm", "Plants growing in glass buildings", "The Sun getting hotter", "Rain falling in tropical areas"], "Gases in the atmosphere trap heat and keep the Earth warm", "It's a natural effect, but extra greenhouse gases from human activity are making the planet warmer (the enhanced greenhouse effect)."),
      mc(3, "Why are mountain tops usually colder than the land below?", ["The air gets thinner and cooler as altitude increases", "They're closer to the poles", "They have more oceans nearby", "The Sun doesn't shine on them"], "The air gets thinner and cooler as altitude increases", "Temperature drops by roughly 6 °C for every 1,000 metres you climb."),
      mc(3, "A 'rain shadow' is:", ["A dry area on the far side of a mountain range", "A very rainy area at the coast", "Rain falling at night", "The shadow of a cloud"], "A dry area on the far side of a mountain range", "Moist air loses its rain climbing the mountains, so the leeward side is much drier."),
    ]),
    topic("geo-population", "People and Places", "🏙️", {
      blurb: "Where people live and why, urbanisation, migration, megacities and what makes a city liveable.",
      recap: "Populations aren't spread evenly. People gather where there's water, food, jobs and a comfortable climate, and more of the world's people live in cities every year.",
      example: "Most Australians live in cities near the coast, especially in the south-east, while the dry interior has very few people.",
      workedExample: {
        1: { question: "What is urbanisation?", walkthrough: "Urbanisation is the movement of people from the countryside into towns and cities, and the growth of those cities." },
        2: { question: "What's the difference between a push factor and a pull factor in migration?", walkthrough: "Push factors force people to leave (war, famine, lack of jobs). Pull factors attract people to a new place (jobs, safety, education)." },
        3: { question: "What is population density?", walkthrough: "The number of people living in a given area, usually per square kilometre. It is found by dividing the population by the area." },
      },
    }, [
      mc(1, "What is the movement of people from the countryside into cities called?", ["Urbanisation", "Evacuation", "Colonisation", "Erosion"], "Urbanisation", "Urbanisation describes both people moving to cities and cities growing larger."),
      mc(1, "Where do most Australians live?", ["Near the coast, especially in the south-east", "In the desert centre", "In the far north", "In the mountains"], "Near the coast, especially in the south-east", "Coastal areas have milder climates, more rain and fresh water, and the major ports and cities."),
      q(1, "How many continents are there?", 7, "The seven continents are Africa, Antarctica, Asia, Australia/Oceania, Europe, North America and South America."),
      mc(1, "What does 'population' mean?", ["The number of people living in a place", "The size of a country", "The weather in a place", "The number of cities"], "The number of people living in a place", "A population can be counted for a town, a country or the whole world."),
      mc(2, "Which of these is a 'pull factor' that attracts migrants to a new country?", ["Better job opportunities", "War and conflict", "Natural disasters", "Famine"], "Better job opportunities", "Pull factors attract people to a place. War, disasters and famine are push factors."),
      mc(2, "Which of these is a 'push factor' that makes people leave their home?", ["War or conflict", "Good schools elsewhere", "A warm climate elsewhere", "Cheap housing elsewhere"], "War or conflict", "Push factors force or encourage people to leave their home area."),
      mc(2, "Which country has the world's largest population (since 2023)?", ["India", "China", "The United States", "Indonesia"], "India", "India overtook China as the world's most populous country in 2023."),
      mc(2, "What does the 'liveability' of a city describe?", ["How good a place it is to live, including housing, health, safety and transport", "How big the city is", "How old the city is", "How many tourists visit"], "How good a place it is to live, including housing, health, safety and transport", "Melbourne has often ranked highly in liveability surveys."),
      mc(3, "What is a 'megacity'?", ["A city with more than 10 million people", "Any capital city", "A city on the coast", "A city with a very old centre"], "A city with more than 10 million people", "Tokyo, Delhi and Shanghai are examples of megacities."),
      mc(3, "What is population density?", ["The number of people per square kilometre", "The total number of people in a country", "How fast a population grows", "The ages of the people"], "The number of people per square kilometre", "Density = population divided by area."),
      mc(3, "Why do most Australians live near the coast?", ["Water supply, milder climate and early ports and trade", "Because the interior is full of mountains", "Because the coast has no bushfires", "Because the law says so"], "Water supply, milder climate and early ports and trade", "The dry interior has limited water and a harsh climate, while the coast gave early settlers ports and farmland."),
      mc(3, "What does a population pyramid show?", ["The age and gender structure of a population", "The tallest buildings in a city", "The birth rate only", "The path of migration"], "The age and gender structure of a population", "The shape shows whether a population is young, ageing or stable."),
    ]),
    topic("geo-hazards", "Natural Hazards", "🌋", {
      blurb: "Earthquakes, volcanoes, tsunamis, cyclones, floods and bushfires: why they happen, where, and how people prepare.",
      recap: "Natural hazards are caused by forces in the Earth, the oceans and the atmosphere. They become disasters when they harm people and property, and good planning can reduce the damage.",
      example: "Early-warning systems for tsunamis and cyclones give people time to move to safety.",
      workedExample: {
        1: { question: "What causes an earthquake?", walkthrough: "Earthquakes happen when tectonic plates, the huge slabs of Earth's crust, suddenly slip or move against each other." },
        2: { question: "What is the 'Ring of Fire'?", walkthrough: "A horseshoe-shaped belt around the Pacific Ocean where many earthquakes and volcanoes occur because several plates meet there." },
        3: { question: "Why are bushfires a major hazard in Victoria?", walkthrough: "Hot, dry, windy summers and plenty of dry bush and grass make fires start easily and spread fast. Preparing homes and having a fire plan reduces risk." },
      },
    }, [
      mc(1, "What is a huge wave caused by an undersea earthquake called?", ["A tsunami", "A cyclone", "A tide", "A storm surge"], "A tsunami", "Tsunamis can travel across entire oceans and hit coasts with enormous force."),
      mc(1, "What is a violent spinning storm that forms over warm tropical oceans called?", ["A tropical cyclone", "A tornado", "A drought", "A heatwave"], "A tropical cyclone", "In different parts of the world the same kind of storm is called a hurricane or a typhoon."),
      mc(1, "What do we call the shaking of the ground caused by movement of the Earth's crust?", ["An earthquake", "A landslide", "A flood", "An eruption"], "An earthquake", "Earthquakes happen when tectonic plates move suddenly."),
      mc(1, "Which natural hazard is a major risk during Victoria's hot, dry summers?", ["Bushfires", "Tsunamis", "Volcanoes", "Avalanches"], "Bushfires", "Hot weather, strong winds and dry bush make bushfires a serious summer risk."),
      mc(2, "What are the huge moving slabs of the Earth's crust called?", ["Tectonic plates", "Continental shelves", "Magma chambers", "Fault lines only"], "Tectonic plates", "The Earth's crust is broken into plates that slowly move; earthquakes and volcanoes often happen where they meet."),
      mc(2, "The 'Ring of Fire' surrounds which ocean?", ["The Pacific Ocean", "The Atlantic Ocean", "The Indian Ocean", "The Arctic Ocean"], "The Pacific Ocean", "About 90% of the world's earthquakes happen in the Ring of Fire."),
      mc(2, "What do we call an opening in the Earth's crust through which lava, ash and gas can erupt?", ["A volcano", "A canyon", "A glacier", "A delta"], "A volcano", "Volcanoes form where molten rock (magma) reaches the surface."),
      mc(2, "What natural hazard happens when a river overflows its banks onto surrounding land?", ["A flood", "A drought", "An earthquake", "A bushfire"], "A flood", "Floods can be caused by heavy rain, rapid snowmelt or storm surges."),
      mc(3, "What is a tropical cyclone called in the north-west Pacific, near Japan and the Philippines?", ["A typhoon", "A hurricane", "A blizzard", "A monsoon"], "A typhoon", "Same type of storm: a cyclone in the Australian region, a hurricane in the Atlantic and a typhoon in the north-west Pacific."),
      mc(3, "Which scale is commonly used to describe the strength of an earthquake?", ["The Richter scale", "The Beaufort scale", "The Celsius scale", "The Kelvin scale"], "The Richter scale", "The Richter scale (and now the moment magnitude scale) measures earthquake size. The Beaufort scale measures wind."),
      mc(3, "Which of these helps reduce the risk from natural hazards?", ["Early-warning systems and building codes", "Building on flood plains", "Ignoring weather forecasts", "Removing emergency services"], "Early-warning systems and building codes", "Preparation, warnings and strong buildings save lives and reduce damage."),
      mc(3, "The 'Black Saturday' bushfires killed 173 people in Victoria in which year?", ["2009", "1983", "2019", "1939"], "2009", "Black Saturday was 7 February 2009, one of Australia's worst natural disasters."),
    ]),
    topic("geo-australia", "Australia's Geography", "🇦🇺", {
      blurb: "States, capital cities, famous landmarks, rivers, mountains and seas of Australia.",
      recap: "Australia is both a country and a continent, with six states and two mainland territories. Knowing its main places, rivers and landforms helps you understand where people live and why.",
      example: "The Murray River and its tributaries supply water to farms and towns across several states.",
      workedExample: {
        1: { question: "What is the capital city of Australia?", walkthrough: "Canberra, in the Australian Capital Territory. It was purpose-built as the national capital." },
        2: { question: "Which river is Australia's longest?", walkthrough: "The Murray River is Australia's longest river. It flows about 2,500 km from the Australian Alps to the sea in South Australia." },
        3: { question: "Which strait separates Tasmania from mainland Australia?", walkthrough: "Bass Strait, between Victoria and Tasmania." },
      },
    }, [
      mc(1, "What is the capital city of Australia?", ["Canberra", "Sydney", "Melbourne", "Perth"], "Canberra", "Canberra was built as the national capital and is in the Australian Capital Territory."),
      mc(1, "Which is Australia's largest state by area?", ["Western Australia", "Queensland", "New South Wales", "South Australia"], "Western Australia", "Western Australia covers about one-third of the country."),
      mc(1, "In which state or territory is Uluru?", ["The Northern Territory", "Queensland", "Western Australia", "South Australia"], "The Northern Territory", "Uluru is in the Uluru-Kata Tjuta National Park, in the centre of Australia."),
      mc(1, "The Great Barrier Reef lies off the coast of which state?", ["Queensland", "Victoria", "Tasmania", "Western Australia"], "Queensland", "The Great Barrier Reef stretches more than 2,000 km along Queensland's coast."),
      mc(2, "Which is Australia's longest river?", ["The Murray River", "The Yarra River", "The Swan River", "The Hawkesbury River"], "The Murray River", "The Murray flows about 2,500 km, forming much of the border between Victoria and New South Wales."),
      mc(2, "What is the highest mountain on mainland Australia?", ["Mount Kosciuszko", "Mount Everest", "Uluru", "Mount Buller"], "Mount Kosciuszko", "Mount Kosciuszko in New South Wales is 2,228 metres high."),
      mc(2, "What is the capital city of Tasmania?", ["Hobart", "Launceston", "Darwin", "Adelaide"], "Hobart", "Hobart sits on the Derwent River in south-east Tasmania."),
      mc(2, "Which ocean is to the west of Australia?", ["The Indian Ocean", "The Pacific Ocean", "The Atlantic Ocean", "The Arctic Ocean"], "The Indian Ocean", "The Pacific Ocean is to the east and the Southern Ocean to the south."),
      mc(3, "Along which side of Australia does the Great Dividing Range run?", ["The east", "The west", "The north", "The centre"], "The east", "The Great Dividing Range stretches along the east coast from Queensland through New South Wales to Victoria."),
      mc(3, "The Great Artesian Basin is important because it is:", ["A huge underground water source for outback Australia", "The largest lake in Australia", "A major mountain range", "A coastal desert"], "A huge underground water source for outback Australia", "It is one of the largest underground freshwater sources in the world, used by outback farms and towns."),
      mc(3, "Which strait separates Tasmania from mainland Australia?", ["Bass Strait", "Torres Strait", "Cook Strait", "Bering Strait"], "Bass Strait", "Bass Strait lies between Victoria and Tasmania."),
      mc(3, "What is the capital city of South Australia?", ["Adelaide", "Perth", "Darwin", "Brisbane"], "Adelaide", "Adelaide sits between the Gulf St Vincent and the Adelaide Hills."),
    ]),
  );
})();
