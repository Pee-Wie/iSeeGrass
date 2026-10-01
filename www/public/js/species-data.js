/**
 * Global seagrass species dataset.
 * Sources: IUCN Red List, SeagrassNet, Seagrass-Watch, published taxonomic literature.
 * Order Alismatales — 4 families, 12 genera, ~60–72 species.
 */
export const SEAGRASS_SPECIES = [

  /* ── Family: Hydrocharitaceae ─────────────────────────────────── */

  {
    id: "enhalus-acoroides",
    commonName: "Tape Seagrass",
    scientificName: "Enhalus acoroides",
    genus: "Enhalus",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific & Southeast Asia",
    habitat: "Sandy and muddy intertidal & subtidal flats",
    depth: "0 – 5 m",
    leafShape: "Very long, broad ribbon",
    leafLength: "30 – 150 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "The largest seagrass species in the world by leaf size. Tape Seagrass forms extensive intertidal and subtidal meadows across Southeast Asia and is culturally important as a traditional food and medicine plant.",
    funFact:
      "The only seagrass whose white male flowers float to the surface and drift to pollinate surface-floating female flowers.",
    tags: ["Southeast Asia", "Largest species", "Intertidal"],
  },

  {
    id: "thalassia-testudinum",
    commonName: "Turtle Grass",
    scientificName: "Thalassia testudinum",
    genus: "Thalassia",
    family: "Hydrocharitaceae",
    region: "Caribbean & Gulf of Mexico",
    habitat: "Shallow coastal lagoons, bays, clear warm water",
    depth: "0.5 – 10 m",
    leafShape: "Flat, ribbon-like",
    leafLength: "10 – 35 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "One of the most ecologically important seagrass species in the Caribbean, Turtle Grass forms dense meadows providing critical habitat for sea turtles, manatees, and hundreds of invertebrate species.",
    funFact:
      "Named for its role as a primary food source for green sea turtles (Chelonia mydas).",
    tags: ["Caribbean", "Tropical", "Dense meadows"],
  },

  {
    id: "thalassia-hemprichii",
    commonName: "Hemprich's Seagrass",
    scientificName: "Thalassia hemprichii",
    genus: "Thalassia",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific & Red Sea",
    habitat: "Intertidal and shallow subtidal sandy substrates",
    depth: "0 – 10 m",
    leafShape: "Flat, ribbon-like",
    leafLength: "10 – 40 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "The Indo-Pacific counterpart of Turtle Grass, dominating diverse mixed-species meadows across the Red Sea and Indo-Pacific, frequently found alongside Halophila and Cymodocea species.",
    funFact:
      "A dominant species in some of the world's most species-rich seagrass meadows in the Coral Triangle region.",
    tags: ["Indo-Pacific", "Mixed meadows", "Coral Triangle"],
  },

  {
    id: "halophila-ovalis",
    commonName: "Dugong Grass",
    scientificName: "Halophila ovalis",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific",
    habitat: "Sandy and muddy substrates, calm coastal waters",
    depth: "0.5 – 30 m",
    leafShape: "Oval to elliptical leaf pairs",
    leafLength: "1 – 4 cm",
    color: "Light to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "A pioneer species capable of rapid colonisation of bare sediments. Its small oval leaves grow in pairs on a delicate stem. A primary food source for dugongs and green sea turtles across the Indo-Pacific.",
    funFact:
      "Can grow at depths exceeding 90 m in exceptionally clear tropical waters.",
    tags: ["Indo-Pacific", "Pioneer species", "Dugong food"],
  },

  {
    id: "halophila-stipulacea",
    commonName: "Spoon Seagrass",
    scientificName: "Halophila stipulacea",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Red Sea & Indian Ocean",
    habitat: "Sandy and silty sediments, calm sheltered bays",
    depth: "1 – 90 m",
    leafShape: "Elliptical with prominent midrib and cross veins",
    leafLength: "2 – 6 cm",
    color: "Dark green with white veins",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Originally from the Red Sea and Indian Ocean, it entered the Mediterranean through the Suez Canal and has become the only known invasive seagrass, outcompeting native Posidonia and Cymodocea meadows.",
    funFact:
      "The only known invasive seagrass species, spreading through the Mediterranean via ballast water.",
    tags: ["Invasive", "Red Sea", "Deep water"],
  },

  {
    id: "halophila-decipiens",
    commonName: "Paddle Weed",
    scientificName: "Halophila decipiens",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Pan-tropical (Atlantic, Pacific & Indian Oceans)",
    habitat: "Sandy substrates, deeper coastal and offshore waters",
    depth: "5 – 100 m",
    leafShape: "Oblong, paired leaves with serrated margins",
    leafLength: "1 – 2.5 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "One of the deepest-growing seagrasses, Paddle Weed is found across all tropical oceans. Its small, finely serrated paired leaves distinguish it from other Halophila species. It tolerates low light at depth.",
    funFact:
      "Recorded at depths over 90 m, making it one of the deepest-growing seagrasses on the planet.",
    tags: ["Pan-tropical", "Deep water", "Offshore"],
  },

  {
    id: "halophila-spinulosa",
    commonName: "Fern Seagrass",
    scientificName: "Halophila spinulosa",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific & Australia",
    habitat: "Sandy and silty subtidal sediments",
    depth: "2 – 25 m",
    leafShape: "Multiple small oval leaflets along a stem (fern-like)",
    leafLength: "0.5 – 1.5 cm per leaflet",
    color: "Bright to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["visayas", "mindanao"],
    description:
      "Easily recognised by its fern-like arrangement of multiple small leaflets along each stem. Common in Australian and Indo-Pacific waters, often forming sparse but extensive beds on sandy substrates.",
    funFact:
      "Its branching, fern-like leaf structure is unique among seagrasses and makes it immediately identifiable in the field.",
    tags: ["Australia", "Indo-Pacific", "Distinctive morphology"],
  },

  {
    id: "halophila-beccarii",
    commonName: "Beccari's Seagrass",
    scientificName: "Halophila beccarii",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Southeast Asia & Bay of Bengal",
    habitat: "Intertidal mudflats, mangrove margins, estuaries",
    depth: "0 – 2 m",
    leafShape: "Small elliptical leaf pairs",
    leafLength: "0.5 – 1.5 cm",
    color: "Light green",
    iucnStatus: "Vulnerable",
    statusColor: "vu",
    phRegions: ["luzon", "visayas"],
    description:
      "A small, inconspicuous species typically found on intertidal mudflats alongside mangroves. One of the least studied seagrasses, it is threatened by coastal development and sedimentation across its range.",
    funFact:
      "One of the smallest seagrass species in the world, its tiny leaves can be easily overlooked during surveys.",
    tags: ["Southeast Asia", "Intertidal", "Vulnerable"],
  },

  {
    id: "halophila-major",
    commonName: "Major Seagrass",
    scientificName: "Halophila major",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific",
    habitat: "Subtidal sandy and muddy sediments",
    depth: "1 – 15 m",
    leafShape: "Large elliptical leaf pairs",
    leafLength: "3 – 7 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "A larger-leaved Halophila species found across the Indo-Pacific. Often confused with H. ovalis but distinguished by its substantially larger leaves and distinct venation pattern.",
    funFact:
      "Despite its name, Halophila major is still one of the smaller seagrasses compared to species like Enhalus acoroides.",
    tags: ["Indo-Pacific", "Subtidal"],
  },

  {
    id: "halophila-engelmannii",
    commonName: "Engelman's Seagrass",
    scientificName: "Halophila engelmannii",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Gulf of Mexico & Caribbean",
    habitat: "Sandy and silty subtidal sediments",
    depth: "2 – 30 m",
    leafShape: "Narrow, elongated strap-like leaf pairs",
    leafLength: "1 – 4 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The only Halophila species native to the Atlantic and Gulf of Mexico. It forms sparse beds on soft substrates and is an important component of deep reef-associated communities in the Gulf.",
    funFact:
      "The sole representative of its genus in the Atlantic, occupying an ecological niche otherwise held by Indo-Pacific Halophila species.",
    tags: ["Gulf of Mexico", "Caribbean", "Deep water"],
  },

  /* ── Family: Cymodoceaceae ────────────────────────────────────── */

  {
    id: "cymodocea-rotundata",
    commonName: "Rotund Cymodocea",
    scientificName: "Cymodocea rotundata",
    genus: "Cymodocea",
    family: "Cymodoceaceae",
    region: "Indo-Pacific & Red Sea",
    habitat: "Sandy substrates, shallow coastal lagoons, reef flats",
    depth: "0.5 – 10 m",
    leafShape: "Narrow strap with rounded tip and entire margins",
    leafLength: "7 – 15 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "One of the most common seagrasses in Indo-Pacific mixed-species meadows. Often co-dominates with Thalassia hemprichii and Halophila ovalis. Its round leaf tip distinguishes it from other Cymodocea species.",
    funFact:
      "The genus Cymodocea is named after the sea nymph Cymodoce from Greek mythology.",
    tags: ["Indo-Pacific", "Mixed meadows", "Reef flat"],
  },

  {
    id: "cymodocea-serrulata",
    commonName: "Serrated Cymodocea",
    scientificName: "Cymodocea serrulata",
    genus: "Cymodocea",
    family: "Cymodoceaceae",
    region: "Indo-Pacific & East Africa",
    habitat: "Sandy substrates, shallow lagoons and bays",
    depth: "0.5 – 8 m",
    leafShape: "Narrow strap with finely serrated margins",
    leafLength: "7 – 20 cm",
    color: "Bright to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "Distinguished by finely serrated leaf margins visible under magnification. Common in shallow Indo-Pacific seagrass communities and frequently found alongside Cymodocea rotundata in mixed meadows.",
    funFact:
      "Its finely serrated leaf edges—resembling tiny saw teeth—are the key morphological feature separating it from C. rotundata.",
    tags: ["Indo-Pacific", "East Africa", "Mixed meadows"],
  },

  {
    id: "cymodocea-nodosa",
    commonName: "Little Neptune Grass",
    scientificName: "Cymodocea nodosa",
    genus: "Cymodocea",
    family: "Cymodoceaceae",
    region: "Mediterranean & East Atlantic",
    habitat: "Sandy bottoms, lagoons, sheltered coastal areas",
    depth: "0.3 – 15 m",
    leafShape: "Narrow strap, rounded tip",
    leafLength: "25 – 45 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A fast-colonising Mediterranean species particularly resistant to eutrophication and turbidity, making it a useful indicator of intermediate water quality. Often found alongside Posidonia oceanica.",
    funFact:
      "Its flowers are among the few seagrass flowers visible to the naked eye, appearing as small cream-coloured spikes.",
    tags: ["Mediterranean", "Resilient", "Water quality indicator"],
  },

  {
    id: "cymodocea-angustata",
    commonName: "Narrow Cymodocea",
    scientificName: "Cymodocea angustata",
    genus: "Cymodocea",
    family: "Cymodoceaceae",
    region: "Northern Australia",
    habitat: "Sandy intertidal and subtidal flats",
    depth: "0 – 5 m",
    leafShape: "Very narrow strap-like",
    leafLength: "10 – 30 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to northern Australia, Narrow Cymodocea forms extensive intertidal meadows along Australia's northern coastline. It is an important habitat for dugongs and sea turtles in the region.",
    funFact:
      "Endemic to Australia, it is one of the few seagrass species with a range restricted almost entirely to a single country.",
    tags: ["Australia", "Endemic", "Intertidal"],
  },

  {
    id: "halodule-uninervis",
    commonName: "Spade Grass",
    scientificName: "Halodule uninervis",
    genus: "Halodule",
    family: "Cymodoceaceae",
    region: "Indo-Pacific & Red Sea",
    habitat: "Intertidal flats, estuaries, sandy lagoons",
    depth: "0 – 12 m",
    leafShape: "Narrow, tip with 3 points (trident-shaped)",
    leafLength: "4 – 15 cm",
    color: "Light to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "One of the most abundant seagrasses in the Indo-Pacific, easily recognised by its distinctive trident-shaped leaf tip. Forms extensive monospecific beds and is a key food for dugongs.",
    funFact:
      "Its three-pointed leaf tip is a diagnostic feature — it looks exactly like a tiny spade or trident.",
    tags: ["Indo-Pacific", "Pioneer species", "Dugong food"],
  },

  {
    id: "halodule-pinifolia",
    commonName: "Pin-leaf Shoal Grass",
    scientificName: "Halodule pinifolia",
    genus: "Halodule",
    family: "Cymodoceaceae",
    region: "Indo-Pacific & East Africa",
    habitat: "Intertidal sandy and muddy flats",
    depth: "0 – 5 m",
    leafShape: "Very narrow, pin-like with rounded tip",
    leafLength: "3 – 8 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "A small, narrow-leaved pioneer species forming short-lived intertidal meadows. Often among the first seagrasses to colonise disturbed intertidal areas across the Indo-Pacific and East Africa.",
    funFact:
      "Despite its tiny size, Pin-leaf Shoal Grass can form dense mats covering several hectares on intertidal flats.",
    tags: ["Indo-Pacific", "Pioneer species", "Intertidal"],
  },

  {
    id: "halodule-wrightii",
    commonName: "Shoal Grass",
    scientificName: "Halodule wrightii",
    genus: "Halodule",
    family: "Cymodoceaceae",
    region: "Tropical & Subtropical Atlantic",
    habitat: "Intertidal flats, estuaries, disturbed areas",
    depth: "0 – 5 m",
    leafShape: "Very narrow strap, rounded or notched tip",
    leafLength: "5 – 20 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A pioneer species that quickly colonises disturbed or newly exposed Atlantic sediments. Highly tolerant of salinity fluctuations, making it common in estuarine environments and a frequent succession precursor.",
    funFact:
      "Often the first seagrass species to recolonise after a disturbance like a storm or dredging event.",
    tags: ["Caribbean", "Pioneer species", "Estuarine"],
  },

  {
    id: "syringodium-isoetifolium",
    commonName: "Needle Seagrass",
    scientificName: "Syringodium isoetifolium",
    genus: "Syringodium",
    family: "Cymodoceaceae",
    region: "Indo-Pacific & East Africa",
    habitat: "Sandy and gravelly substrates, reef flats",
    depth: "0.5 – 15 m",
    leafShape: "Cylindrical, needle-like",
    leafLength: "10 – 30 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "Easily identified by its distinctive round, hollow, needle-shaped leaves. Often forms monospecific beds on sandy reef flats and is an important habitat for juvenile fish and invertebrates.",
    funFact:
      "Its cylindrical hollow leaves are unique among seagrasses — buoyant to help remain upright in currents.",
    tags: ["Indo-Pacific", "Distinctive morphology", "Reef habitat"],
  },

  {
    id: "syringodium-filiforme",
    commonName: "Manatee Grass",
    scientificName: "Syringodium filiforme",
    genus: "Syringodium",
    family: "Cymodoceaceae",
    region: "Caribbean & Gulf of Mexico",
    habitat: "Sandy and rocky bottoms, shallow coastal waters",
    depth: "0.5 – 12 m",
    leafShape: "Cylindrical, thread-like",
    leafLength: "10 – 35 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The Atlantic counterpart of Needle Seagrass, Manatee Grass forms extensive beds across the Caribbean and Gulf of Mexico. Named for its importance as a food source for manatees, it often grows alongside Thalassia testudinum.",
    funFact:
      "Named after the West Indian manatee (Trichechus manatus), which grazes extensively on its cylindrical leaves.",
    tags: ["Caribbean", "Manatee food", "Mixed meadows"],
  },

  {
    id: "thalassodendron-ciliatum",
    commonName: "Comb Seagrass",
    scientificName: "Thalassodendron ciliatum",
    genus: "Thalassodendron",
    family: "Cymodoceaceae",
    region: "East Africa & Indian Ocean Islands",
    habitat: "Rocky substrates, reef slopes, exposed coasts",
    depth: "1 – 20 m",
    leafShape: "Strap-like with serrated margins",
    leafLength: "5 – 14 cm",
    color: "Dark green",
    iucnStatus: "Vulnerable",
    statusColor: "vu",
    phRegions: ["visayas", "mindanao"],
    description:
      "One of the few seagrass species adapted to rocky substrates, anchoring itself with robust rhizomes. Supports diverse fish assemblages on East African reef slopes.",
    funFact:
      "Unlike most seagrasses that prefer sediment, it thrives on hard rocky substrates along wave-exposed coasts.",
    tags: ["East Africa", "Rocky habitat", "Vulnerable"],
  },

  {
    id: "thalassodendron-pachyrhizum",
    commonName: "Thick-rooted Seagrass",
    scientificName: "Thalassodendron pachyrhizum",
    genus: "Thalassodendron",
    family: "Cymodoceaceae",
    region: "Western Australia",
    habitat: "Rocky and coarse sandy substrates, exposed coasts",
    depth: "1 – 25 m",
    leafShape: "Strap-like with toothed margins",
    leafLength: "4 – 12 cm",
    color: "Dark green",
    iucnStatus: "Near Threatened",
    statusColor: "nt",
    description:
      "Endemic to western Australia, this species anchors on hard substrates using its thick rhizomes. It grows in exposed high-energy environments unusual for seagrasses.",
    funFact:
      "Endemic to Australia's west coast, it is one of the least studied seagrasses in the southern hemisphere.",
    tags: ["Australia", "Endemic", "Rocky habitat"],
  },

  {
    id: "amphibolis-antarctica",
    commonName: "Wire Weed",
    scientificName: "Amphibolis antarctica",
    genus: "Amphibolis",
    family: "Cymodoceaceae",
    region: "Southern Australia",
    habitat: "Rocky and sandy substrates, exposed and semi-exposed coasts",
    depth: "0 – 35 m",
    leafShape: "Small, clustered at stem tips",
    leafLength: "1 – 3 cm",
    color: "Bright to olive green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A structurally unique seagrass with woody, wire-like stems that persist for decades. Dominant in southern Australian coastal waters, it supports a complex epiphytic community and is highly sensitive to temperature increases.",
    funFact:
      "Unlike most seagrasses, Wire Weed retains germinated seeds on the parent plant, nurturing seedlings before they detach — an unusual reproductive strategy.",
    tags: ["Australia", "Temperate", "Woody stems"],
  },

  {
    id: "amphibolis-griffithii",
    commonName: "Griffin's Seagrass",
    scientificName: "Amphibolis griffithii",
    genus: "Amphibolis",
    family: "Cymodoceaceae",
    region: "Southern & Western Australia",
    habitat: "Rocky and sandy coasts, sheltered to semi-exposed",
    depth: "0 – 15 m",
    leafShape: "Small, clustered, spatula-shaped",
    leafLength: "1 – 2.5 cm",
    color: "Olive green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to southern and western Australia, Griffin's Seagrass co-occurs with Amphibolis antarctica but tends to prefer slightly more sheltered environments. It supports a rich epiphytic community.",
    funFact:
      "Both Amphibolis species are endemic to Australia and have no close relatives anywhere else in the world.",
    tags: ["Australia", "Endemic", "Temperate"],
  },

  {
    id: "thalassodendron-leptocaule",
    commonName: "Slender-stemmed Seagrass",
    scientificName: "Thalassodendron leptocaule",
    genus: "Thalassodendron",
    family: "Cymodoceaceae",
    region: "East Africa & Mozambique Channel",
    habitat: "Sandy and rocky subtidal substrates",
    depth: "2 – 18 m",
    leafShape: "Narrow strap with slightly toothed margins",
    leafLength: "4 – 10 cm",
    color: "Dark green",
    iucnStatus: "Data Deficient",
    statusColor: "dd",
    description:
      "The least documented of the three Thalassodendron species, found in deeper subtidal zones along the East African coast. Its slender stems and growth on mixed substrates distinguish it from T. ciliatum.",
    funFact:
      "So poorly documented that its full distribution along the African coast remains uncertain — a reminder of how much remains to be discovered about seagrasses.",
    tags: ["East Africa", "Data deficient", "Subtidal"],
  },

  /* ── Family: Cymodoceaceae continued: Halodule additions ─────── */

  {
    id: "halodule-beaudettei",
    commonName: "Beaudette's Shoal Grass",
    scientificName: "Halodule beaudettei",
    genus: "Halodule",
    family: "Cymodoceaceae",
    region: "Gulf of Mexico & Caribbean",
    habitat: "Intertidal mudflats, shallow sandy estuaries",
    depth: "0 – 4 m",
    leafShape: "Narrow strap, bi-dentate tip",
    leafLength: "5 – 15 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A close relative of Halodule wrightii found in the Gulf of Mexico and Caribbean, often treated as a synonym but recognised as distinct by some authorities. Forms pioneer beds on soft intertidal sediments.",
    funFact:
      "Taxonomically debated for decades, Beaudette's Shoal Grass is a good example of how seagrass species boundaries are still being refined by molecular studies.",
    tags: ["Caribbean", "Gulf of Mexico", "Pioneer species"],
  },

  {
    id: "halodule-emarginata",
    commonName: "Notched Shoal Grass",
    scientificName: "Halodule emarginata",
    genus: "Halodule",
    family: "Cymodoceaceae",
    region: "Brazil & South Atlantic",
    habitat: "Sandy intertidal and shallow subtidal flats",
    depth: "0 – 5 m",
    leafShape: "Narrow strap with notched (emarginate) tip",
    leafLength: "3 – 12 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to the South Atlantic coast of Brazil, Notched Shoal Grass is distinguished by its distinctly notched leaf tip. It forms intertidal meadows that are important nursery grounds for juvenile fish along the Brazilian coast.",
    funFact:
      "One of only a few seagrass species endemic to South America, highlighting the unique marine flora of the Brazilian coastline.",
    tags: ["Brazil", "South Atlantic", "Endemic"],
  },

  /* ── Family: Zosteraceae ──────────────────────────────────────── */

  {
    id: "zostera-marina",
    commonName: "Common Eelgrass",
    scientificName: "Zostera marina",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "North Atlantic & North Pacific",
    habitat: "Sheltered bays, estuaries, intertidal to subtidal zones",
    depth: "0 – 10 m",
    leafShape: "Narrow, strap-like",
    leafLength: "20 – 120 cm",
    color: "Bright to dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The most widespread seagrass in the Northern Hemisphere, supporting diverse marine food webs, stabilising sediments, and serving as critical nursery habitat for commercially important fish including Pacific herring.",
    funFact:
      "Eelgrass meadows can sequester carbon 35 times faster per unit area than tropical rainforests.",
    tags: ["Temperate", "Nursery habitat", "Carbon sequestration"],
  },

  {
    id: "zostera-noltei",
    commonName: "Dwarf Eelgrass",
    scientificName: "Zostera noltei",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Europe & North Africa (Atlantic & Mediterranean)",
    habitat: "Intertidal mudflats, estuaries, sheltered sandy shores",
    depth: "0 – 2 m",
    leafShape: "Very narrow, thread-like",
    leafLength: "3 – 20 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The smallest European seagrass, forming dense intertidal mats that stabilise estuarine sediments and provide feeding grounds for migratory waterfowl including Brent geese and wigeon.",
    funFact:
      "Dwarf Eelgrass can withstand complete aerial exposure for hours during low tide — a rare ability among seagrasses.",
    tags: ["Europe", "Intertidal", "Waterfowl food"],
  },

  {
    id: "zostera-japonica",
    commonName: "Asian Eelgrass",
    scientificName: "Zostera japonica",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "East Asia (native); Pacific Northwest USA (introduced)",
    habitat: "Intertidal mudflats and sandy shores",
    depth: "0 – 3 m",
    leafShape: "Narrow, strap-like",
    leafLength: "5 – 20 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Native to East Asia, this species was accidentally introduced to the Pacific coast of North America where it is now considered invasive, competing with native Z. marina on intertidal flats.",
    funFact:
      "Introduced to the US Pacific coast via oyster aquaculture imports from Japan in the early 20th century.",
    tags: ["East Asia", "Intertidal", "Invasive (N. America)"],
  },

  {
    id: "zostera-muelleri",
    commonName: "Mueller's Eelgrass",
    scientificName: "Zostera muelleri",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Australia & New Zealand",
    habitat: "Estuaries, sheltered bays, intertidal to subtidal",
    depth: "0 – 5 m",
    leafShape: "Narrow, strap-like",
    leafLength: "10 – 60 cm",
    color: "Bright to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The dominant Zostera species complex of eastern Australia and New Zealand, with several recognised subspecies. Forms extensive meadows critical for juvenile fish nurseries and carbon storage along southern Pacific coastlines.",
    funFact:
      "Meadows in New South Wales support some of the highest densities of seahorses recorded anywhere in the world.",
    tags: ["Australia", "New Zealand", "Temperate"],
  },

  {
    id: "zostera-nigricaulis",
    commonName: "Black-stemmed Eelgrass",
    scientificName: "Zostera nigricaulis",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Southern & Western Australia",
    habitat: "Shallow sheltered bays and estuaries",
    depth: "0 – 4 m",
    leafShape: "Narrow, strap-like",
    leafLength: "10 – 40 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Distinguished by its dark-coloured rhizomes and stems, Black-stemmed Eelgrass is endemic to southern and western Australia. It often grows alongside Posidonia species in mixed coastal meadows.",
    funFact:
      "Its characteristically dark stems make it one of the easier Australian Zostera species to identify in the field.",
    tags: ["Australia", "Endemic", "Temperate"],
  },

  {
    id: "zostera-polychlamys",
    commonName: "Many-sheathed Eelgrass",
    scientificName: "Zostera polychlamys",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Southern Australia",
    habitat: "Shallow sheltered lagoons and bays",
    depth: "0 – 3 m",
    leafShape: "Narrow, strap-like",
    leafLength: "8 – 30 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to southern Australia, this species is recognised by the many overlapping leaf sheaths on its stems. It forms part of the diverse temperate seagrass assemblages of the Great Australian Bight region.",
    funFact:
      "One of several seagrass species found only in Australian waters, reflecting the continent's extraordinary marine biodiversity.",
    tags: ["Australia", "Endemic", "Temperate"],
  },

  {
    id: "zostera-tasmanica",
    commonName: "Tasmanian Eelgrass",
    scientificName: "Zostera tasmanica",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Tasmania & Southern Australia",
    habitat: "Sheltered estuaries and coastal lagoons",
    depth: "0 – 4 m",
    leafShape: "Narrow strap",
    leafLength: "10 – 45 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Found primarily in Tasmanian and southern Australian coastal waters, Tasmanian Eelgrass forms important intertidal and subtidal meadows that support diverse invertebrate communities in cool-temperate waters.",
    funFact:
      "Tasmania's sheltered bays host some of the southernmost seagrass meadows in the world, in waters around 12 °C.",
    tags: ["Tasmania", "Australia", "Temperate"],
  },

  {
    id: "zostera-capensis",
    commonName: "Cape Eelgrass",
    scientificName: "Zostera capensis",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "South Africa & East Africa",
    habitat: "Estuaries, tidal flats, sheltered lagoons",
    depth: "0 – 3 m",
    leafShape: "Narrow, strap-like",
    leafLength: "10 – 50 cm",
    color: "Bright to medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The only Zostera species in sub-Saharan Africa, Cape Eelgrass forms critical estuarine meadows along the South and East African coasts. It is an important nursery habitat for commercially important fish species.",
    funFact:
      "South Africa's estuarine seagrass meadows support more than 100 species of fish at some point in their life cycle.",
    tags: ["South Africa", "East Africa", "Estuarine"],
  },

  {
    id: "zostera-novazelandica",
    commonName: "New Zealand Eelgrass",
    scientificName: "Zostera novazelandica",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "New Zealand",
    habitat: "Intertidal sandflats and sheltered estuaries",
    depth: "0 – 2 m",
    leafShape: "Very narrow, thread-like",
    leafLength: "4 – 20 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to New Zealand's intertidal and shallow subtidal zones, this small eelgrass species forms the foundation of many North Island estuarine ecosystems, supporting wading birds and juvenile fish.",
    funFact:
      "Unique to New Zealand, this species co-evolved with local wildlife including the endemic South Island pied oystercatcher.",
    tags: ["New Zealand", "Endemic", "Intertidal"],
  },

  {
    id: "zostera-asiatica",
    commonName: "Asian Broad-leaf Eelgrass",
    scientificName: "Zostera asiatica",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "North Pacific (Russia, Japan, Korea)",
    habitat: "Rocky and sandy subtidal coasts",
    depth: "1 – 10 m",
    leafShape: "Broad, strap-like",
    leafLength: "30 – 80 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A broad-leaved eelgrass species found in the cold North Pacific waters of Russia, Japan, and Korea. It forms subtidal meadows in moderately exposed coastal areas and is distinguished from Z. marina by its wider leaves.",
    funFact:
      "In Japan, dried Zostera asiatica leaves were historically used to stuff mattresses and pack fragile goods — a practice known as 'mogusa'.",
    tags: ["Japan", "Korea", "Russia", "Temperate"],
  },

  {
    id: "zostera-caulescens",
    commonName: "Giant Eelgrass",
    scientificName: "Zostera caulescens",
    genus: "Zostera",
    family: "Zosteraceae",
    region: "Japan & Korea",
    habitat: "Rocky and sandy subtidal coasts",
    depth: "2 – 15 m",
    leafShape: "Long, broad strap",
    leafLength: "100 – 200 cm",
    color: "Dark green",
    iucnStatus: "Near Threatened",
    statusColor: "nt",
    description:
      "The largest Zostera species, forming spectacular deep subtidal meadows off Japan and Korea. Its long leaves create towering underwater forests that provide habitat for a wide range of marine life.",
    funFact:
      "With leaves up to 2 metres long, Giant Eelgrass creates one of the most dramatic seagrass habitats in the world.",
    tags: ["Japan", "Korea", "Deepwater", "Near Threatened"],
  },

  {
    id: "phyllospadix-scouleri",
    commonName: "Scouler's Surfgrass",
    scientificName: "Phyllospadix scouleri",
    genus: "Phyllospadix",
    family: "Zosteraceae",
    region: "Pacific Coast of North America",
    habitat: "Rocky intertidal and subtidal exposed coasts",
    depth: "0 – 10 m",
    leafShape: "Narrow, strap-like, very tough",
    leafLength: "30 – 100 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Unlike most seagrasses, Surfgrass attaches to rocky substrate with specially adapted holdfasts. It dominates exposed rocky Pacific shores from Alaska to Baja California, forming wave-swept green carpets.",
    funFact:
      "The only seagrass genus to root on bare rock, using adhesive holdfasts instead of rhizomes in sediment.",
    tags: ["North America", "Rocky habitat", "Wave-exposed"],
  },

  {
    id: "phyllospadix-torreyi",
    commonName: "Torrey's Surfgrass",
    scientificName: "Phyllospadix torreyi",
    genus: "Phyllospadix",
    family: "Zosteraceae",
    region: "Pacific Coast of North America (California to Mexico)",
    habitat: "Rocky subtidal and deep intertidal zones",
    depth: "1 – 15 m",
    leafShape: "Narrow, strap-like",
    leafLength: "30 – 120 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Found along the Californian and Baja coastline, Torrey's Surfgrass grows in slightly deeper water than Scouler's Surfgrass and supports rich invertebrate and fish communities on rocky reefs.",
    funFact:
      "Torrey's Surfgrass pollen is elongated and filamentous — perfectly adapted for underwater pollination in strong surge.",
    tags: ["California", "Rocky habitat", "Subtidal"],
  },

  {
    id: "phyllospadix-japonicus",
    commonName: "Japanese Surfgrass",
    scientificName: "Phyllospadix japonicus",
    genus: "Phyllospadix",
    family: "Zosteraceae",
    region: "Japan, Korea & Russian Far East",
    habitat: "Rocky intertidal and subtidal exposed coasts",
    depth: "0 – 8 m",
    leafShape: "Narrow strap",
    leafLength: "20 – 80 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The Asian counterpart of the Pacific surfgrasses, common on rocky shores of Japan and Korea. It withstands strong wave action and cold water temperatures, providing shelter for diverse intertidal invertebrates.",
    funFact:
      "Japanese Surfgrass is harvested and eaten as a sea vegetable in parts of Japan, where it is known as 'umi-suge'.",
    tags: ["Japan", "Korea", "Rocky habitat", "Edible"],
  },

  {
    id: "phyllospadix-iwatensis",
    commonName: "Iwate Surfgrass",
    scientificName: "Phyllospadix iwatensis",
    genus: "Phyllospadix",
    family: "Zosteraceae",
    region: "Japan & Korea",
    habitat: "Rocky subtidal zones, cold temperate coasts",
    depth: "1 – 12 m",
    leafShape: "Narrow strap",
    leafLength: "20 – 90 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to cold-temperate rocky coasts of Japan and Korea, Iwate Surfgrass grows in deeper subtidal zones than P. japonicus and is an important habitat for urchins and benthic invertebrates.",
    funFact:
      "Named after Iwate Prefecture in northern Japan, where it is particularly abundant on rocky offshore reefs.",
    tags: ["Japan", "Korea", "Rocky habitat", "Subtidal"],
  },

  {
    id: "phyllospadix-serrulatus",
    commonName: "Serrated Surfgrass",
    scientificName: "Phyllospadix serrulatus",
    genus: "Phyllospadix",
    family: "Zosteraceae",
    region: "Pacific Coast of North America (Alaska to Oregon)",
    habitat: "Rocky intertidal zones, sheltered to exposed coasts",
    depth: "0 – 5 m",
    leafShape: "Narrow strap with finely serrated margins",
    leafLength: "20 – 60 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Found on cool rocky shores from Alaska to Oregon, Serrated Surfgrass is distinguished by its finely toothed leaf margins. It forms dense patches in the lower intertidal zone alongside mussels and sea urchins.",
    funFact:
      "The serrated edges of its leaves help create drag that slows water flow, trapping fine particles and enriching the surrounding sediment.",
    tags: ["North America", "Alaska", "Rocky habitat"],
  },

  /* ── Family: Posidoniaceae ────────────────────────────────────── */

  {
    id: "posidonia-oceanica",
    commonName: "Neptune Grass",
    scientificName: "Posidonia oceanica",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Mediterranean Sea",
    habitat: "Rocky and sandy bottoms, clear oligotrophic water",
    depth: "1 – 40 m",
    leafShape: "Long ribbon-like, strap-shaped",
    leafLength: "30 – 120 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A flagship Mediterranean species that grows extremely slowly — sometimes just a centimeter per year — and can live for thousands of years. Its dense mats, called 'matte', store vast carbon and protect coastlines from erosion.",
    funFact:
      "Some Posidonia clones are estimated to be over 100,000 years old, making them among the oldest living organisms on Earth.",
    tags: ["Mediterranean", "Slow-growing", "Carbon storage"],
  },

  {
    id: "posidonia-australis",
    commonName: "Ribbon Weed",
    scientificName: "Posidonia australis",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Southern Australia",
    habitat: "Sandy substrates, clear sheltered coastal waters",
    depth: "1 – 15 m",
    leafShape: "Wide, flat ribbon",
    leafLength: "30 – 80 cm",
    color: "Dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The largest of the Australian Posidonia species, forming vast meadows in southern Australian waters including the world-famous Shark Bay, a UNESCO World Heritage Site. It supports Australia's dugong population.",
    funFact:
      "The Shark Bay Posidonia meadows cover over 4,000 km² and are estimated to be some of the oldest and most extensive on Earth.",
    tags: ["Australia", "Shark Bay", "UNESCO heritage"],
  },

  {
    id: "posidonia-sinuosa",
    commonName: "Sinuous Posidonia",
    scientificName: "Posidonia sinuosa",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Southern Australia",
    habitat: "Sandy and gravelly coastal waters, semi-exposed",
    depth: "1 – 20 m",
    leafShape: "Narrow strap, wavy margins",
    leafLength: "20 – 50 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "One of the most abundant seagrasses in southern Australia, often co-occurring with Posidonia australis. Its slightly narrower and wavy-edged leaves distinguish it from its relatives.",
    funFact:
      "Often co-dominates mixed Posidonia meadows, which can cover thousands of hectares in Spencer Gulf and Gulf St Vincent.",
    tags: ["Australia", "Temperate", "Mixed meadows"],
  },

  {
    id: "posidonia-coriacea",
    commonName: "Tough Posidonia",
    scientificName: "Posidonia coriacea",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Western & Southern Australia",
    habitat: "Sandy substrates, exposed to semi-exposed coasts",
    depth: "1 – 10 m",
    leafShape: "Short, broad, leathery",
    leafLength: "10 – 30 cm",
    color: "Olive to dark green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "With notably leathery, thick leaves, Tough Posidonia is well adapted to the physical stresses of exposed coasts. Endemic to Australia, it is found in energetic environments where other Posidonia species are absent.",
    funFact:
      "Its leathery leaves are so tough that fragments washed ashore form dense fibrous balls called 'Neptune balls' on Australian beaches.",
    tags: ["Australia", "Endemic", "Wave-exposed"],
  },

  {
    id: "posidonia-angustifolia",
    commonName: "Narrow-leaf Posidonia",
    scientificName: "Posidonia angustifolia",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Southern & Western Australia",
    habitat: "Sandy substrates, sheltered to semi-exposed coasts",
    depth: "1 – 15 m",
    leafShape: "Narrow, strap-like",
    leafLength: "15 – 45 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "One of several narrow-leaved Australian Posidonia species. It forms dense subtidal meadows along the southern Australian coast, often in association with other Posidonia species in structurally diverse mixed-species beds.",
    funFact:
      "Australia is home to 9 of the world's 10 Posidonia species, making it the global centre of diversity for this genus.",
    tags: ["Australia", "Endemic", "Mixed meadows"],
  },

  {
    id: "posidonia-ostenfeldii",
    commonName: "Ostenfeld's Posidonia",
    scientificName: "Posidonia ostenfeldii",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Southern Australia",
    habitat: "Sandy substrates in sheltered coastal waters",
    depth: "1 – 12 m",
    leafShape: "Narrow strap",
    leafLength: "10 – 35 cm",
    color: "Olive-green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "A less-studied Australian Posidonia species endemic to southern waters. Forms part of the diverse temperate seagrass communities of the Great Australian Bight and the Spencer Gulf.",
    funFact:
      "Named after the Danish botanist Carl Emil Hansen Ostenfeld, a pioneer of marine plant research in the early 20th century.",
    tags: ["Australia", "Endemic", "Temperate"],
  },

  {
    id: "posidonia-robertsoniae",
    commonName: "Robertson's Posidonia",
    scientificName: "Posidonia robertsoniae",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Western Australia",
    habitat: "Sandy substrates in sheltered bays",
    depth: "1 – 10 m",
    leafShape: "Flat, strap-like",
    leafLength: "15 – 40 cm",
    color: "Green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Endemic to Western Australia, Robertson's Posidonia is one of the less commonly documented species in the genus. It contributes to the remarkable diversity of seagrass communities in the waters of southwest Australia.",
    funFact:
      "Southwestern Australian waters are considered the most diverse seagrass region in the world, with up to 30 species co-occurring in some areas.",
    tags: ["Australia", "Endemic", "Western Australia"],
  },

  {
    id: "posidonia-denhartogii",
    commonName: "Den Hartog's Posidonia",
    scientificName: "Posidonia denhartogii",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Western Australia",
    habitat: "Sandy coastal substrates",
    depth: "1 – 12 m",
    leafShape: "Strap-like",
    leafLength: "10 – 30 cm",
    color: "Green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Named after seagrass pioneer Cornelis den Hartog, this Australian endemic is part of the remarkable species radiation of Posidonia found only in Australian waters.",
    funFact:
      "Cornelis den Hartog's 1970 monograph 'The Sea-grasses of the World' is still considered one of the foundational works in seagrass biology.",
    tags: ["Australia", "Endemic", "Western Australia"],
  },

  {
    id: "posidonia-kirkmanii",
    commonName: "Kirkman's Posidonia",
    scientificName: "Posidonia kirkmanii",
    genus: "Posidonia",
    family: "Posidoniaceae",
    region: "Western Australia",
    habitat: "Sandy and gravelly substrates",
    depth: "1 – 10 m",
    leafShape: "Narrow strap",
    leafLength: "10 – 30 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The most recently described of the Australian Posidonia species, Kirkman's Posidonia completes the nine-species radiation of this genus in Australian coastal waters.",
    funFact:
      "Named after the Australian marine biologist Hugh Kirkman, who dedicated decades to studying and protecting Australian seagrass ecosystems.",
    tags: ["Australia", "Endemic", "Recently described"],
  },

  /* ── Other / Brackish ─────────────────────────────────────────── */

  /* ── Hydrocharitaceae: remaining Halophila species ───────────── */

  {
    id: "halophila-johnsonii",
    commonName: "Johnson's Seagrass",
    scientificName: "Halophila johnsonii",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Southeast Florida, USA",
    habitat: "Shallow estuaries, lagoons, mangrove-fringed shores",
    depth: "0 – 2 m",
    leafShape: "Elongated, narrow elliptical leaf pairs",
    leafLength: "1.5 – 3 cm",
    color: "Light to medium green",
    iucnStatus: "Endangered",
    statusColor: "en",
    description:
      "One of the rarest and most geographically restricted seagrasses in the world, found only in a 200 km stretch of southeastern Florida. It is the only seagrass species listed as Threatened under the US Endangered Species Act.",
    funFact:
      "Johnson's Seagrass has never been observed reproducing sexually — it survives solely through vegetative spread, making it uniquely vulnerable to habitat loss.",
    tags: ["Florida", "USA", "Endangered", "Endemic"],
  },

  {
    id: "halophila-minor",
    commonName: "Small Paddle Weed",
    scientificName: "Halophila minor",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Indo-Pacific & Southeast Asia",
    habitat: "Sandy and muddy intertidal and shallow subtidal flats",
    depth: "0 – 10 m",
    leafShape: "Small oval to oblong leaf pairs",
    leafLength: "0.8 – 2 cm",
    color: "Light green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    phRegions: ["luzon", "visayas", "mindanao"],
    description:
      "One of the smallest Halophila species, forming sparse but widespread beds across Indo-Pacific coastal flats. Its tiny paired oval leaves are easily overlooked but play an important role in pioneer community establishment.",
    funFact:
      "Despite being one of the smallest seagrasses, H. minor can colonise bare sediment within weeks of a disturbance, making it a key early-succession species.",
    tags: ["Indo-Pacific", "Pioneer species", "Southeast Asia"],
  },

  {
    id: "halophila-tricostata",
    commonName: "Three-ribbed Seagrass",
    scientificName: "Halophila tricostata",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Northern Australia (Great Barrier Reef)",
    habitat: "Sandy subtidal sediments, clear coastal waters",
    depth: "2 – 25 m",
    leafShape: "Elliptical leaf pairs with three prominent veins",
    leafLength: "1 – 3 cm",
    color: "Bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "Named for the three distinctive parallel veins running through each leaf, this species is endemic to the Great Barrier Reef region of northern Australia. It grows in clear, well-lit subtidal zones on sandy sediments.",
    funFact:
      "Its three-veined leaves are its defining feature — no other Halophila species shares this trait, making field identification straightforward.",
    tags: ["Australia", "Great Barrier Reef", "Endemic"],
  },

  {
    id: "halophila-australis",
    commonName: "Southern Seagrass",
    scientificName: "Halophila australis",
    genus: "Halophila",
    family: "Hydrocharitaceae",
    region: "Southern Australia & New Zealand",
    habitat: "Subtidal sandy and muddy sediments, cool coastal waters",
    depth: "1 – 30 m",
    leafShape: "Elliptical leaf pairs",
    leafLength: "1.5 – 4 cm",
    color: "Medium green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "The southernmost-ranging Halophila species, adapted to the cool temperate waters of southern Australia and New Zealand. It grows in deeper subtidal zones where most other tropical Halophila species cannot survive.",
    funFact:
      "Southern Seagrass is the only Halophila species that has successfully colonised New Zealand's cool temperate waters.",
    tags: ["Australia", "New Zealand", "Temperate", "Deep water"],
  },

  {
    id: "ruppia-maritima",
    commonName: "Widgeon Grass",
    scientificName: "Ruppia maritima",
    genus: "Ruppia",
    family: "Ruppiaceae",
    region: "Cosmopolitan (worldwide)",
    habitat: "Brackish to saline lagoons, estuaries, coastal ponds",
    depth: "0.1 – 3 m",
    leafShape: "Hair-like, thread-like",
    leafLength: "4 – 15 cm",
    color: "Olive-green to bright green",
    iucnStatus: "Least Concern",
    statusColor: "lc",
    description:
      "One of the most broadly distributed aquatic macrophytes, Widgeon Grass thrives across a wide range of salinities. An important food source for waterfowl, particularly widgeon ducks, across all continents.",
    funFact:
      "Can tolerate salinities from near-freshwater to hypersaline conditions above 100 ppt — an extraordinary range among aquatic plants.",
    tags: ["Cosmopolitan", "Brackish water", "Waterfowl food"],
  },
];

/**
 * Unique sorted lists for filter dropdowns.
 */
export const FAMILIES   = [...new Set(SEAGRASS_SPECIES.map(s => s.family))].sort();
export const GENERA     = [...new Set(SEAGRASS_SPECIES.map(s => s.genus))].sort();
export const IUCN_STATUSES = [
  { label: "Least Concern",       value: "lc" },
  { label: "Near Threatened",     value: "nt" },
  { label: "Vulnerable",          value: "vu" },
  { label: "Endangered",          value: "en" },
  { label: "Critically Endangered", value: "cr" },
  { label: "Data Deficient",      value: "dd" },
];

