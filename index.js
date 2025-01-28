const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// This function fetches HTML from the website and extracts data for a given character.
async function extractData(characterName) {
    try {
        const url = `https://www.prydwen.gg/wuthering-waves/characters/${characterName}`;
        console.log(`Fetching HTML from ${url}...`);
        const response = await axios.get(url);
        const html = response.data;
        console.log("HTML fetched successfully.");

        const $ = cheerio.load(html);
        console.log("HTML loaded into Cheerio.");

        // Selecting the 13th div with class 'tab-inside'.
        // This div contains all the build information on the Prydwen character page.
        // It was determined by inspecting the HTML structure of the page.
        const buildsTab = $("div.tab-inside:nth-child(13)");

        if (!buildsTab.length) {
            throw new Error("Builds tab not found!");
        }
        console.log("Builds tab found.");

        const weaponData = extractWeaponBuilds(buildsTab, $);
        const echoSetsData = extractEchoSetBuilds(buildsTab, $);
        const echoStatsData = extractEchoStats(buildsTab, $);
        const substatPriorityData = extractSubstatPriority(buildsTab, $);
        const endgameStatsData = extractEndgameStats(buildsTab, $);
        const skillPriorityData = extractSkillPriority(buildsTab, $);

        const allData = {
            weaponBuilds: weaponData,
            echoSetBuilds: echoSetsData,
            echoStats: echoStatsData,
            substatPriority: substatPriorityData,
            endgameStats: endgameStatsData,
            skillPriority: skillPriorityData
        };

        return allData;
    } catch (error) {
        console.error(`Error during extraction for ${characterName}:`);
        if (error.response) {
            if (error.response.status === 404) {
                console.error(
                    `  Character "${characterName}" not found (404 error).`
                );
            } else {
                console.error("  Response status:", error.response.status);
                console.error("  Response data:", error.response.data);
            }
        } else if (error.request) {
            console.error("  No response received:", error.request);
        } else {
            console.error("  ", error.message);
        }
        return null;
    }
}

// This function extracts the weapon builds available for the character.
function extractWeaponBuilds(buildsTab, $) {
    const weaponBuilds = [];
    // Selecting the first element with class 'build-tips' within the 'buildsTab'.
    // This section contains the weapon recommendations.
    const weaponsSection = buildsTab.find(".build-tips").first();

    if (!weaponsSection.length) {
        console.error("Weapons section not found.");
        return weaponBuilds;
    }

    // Selecting all elements with class 'single-item' within the 'weaponsSection'.
    // Each 'single-item' represents a weapon recommendation.
    const weaponItems = weaponsSection.find(".single-item");

    weaponItems.each((i, weaponItem) => {
        // Selecting the percentage element within each weapon item.
        const percentageElement = $(weaponItem).find(".percentage p");
        const percentage = percentageElement.length
            ? percentageElement.text().trim()
            : "";

        // Selecting the weapon name element within each weapon item.
        const weaponNameElement = $(weaponItem).find(".ww-weapon-name");
        // Using regex to extract weapon name and duplicates (S1, S5 etc.) from the text.
        const weaponNameParts = weaponNameElement.length
            ? weaponNameElement.text().trim().match(/(.+)\(S(\d+)\)/)
            : null;
        const weaponName = weaponNameParts ? weaponNameParts[1].trim() : "";
        const weaponDuplicates = weaponNameParts ? weaponNameParts[2] : "";

        if (weaponName && weaponDuplicates) {
            weaponBuilds.push({
                name: weaponName,
                duplicates: weaponDuplicates,
                percentage: percentage,
            });
        }
    });
    return weaponBuilds;
}

// This function extracts the echo set builds and their details.
function extractEchoSetBuilds(buildsTab, $) {
    const echoSetBuilds = [];
    // Selecting the last element with class 'build-tips' within 'buildsTab'.
    // This section contains the echo set recommendations and is usually after the weapon builds.
    const echoSetsSection = buildsTab.find("div.build-tips").last();

    if (!echoSetsSection.length) {
        console.error("Echo Sets section not found.");
        return echoSetBuilds;
    }

    // Selecting all elements with class 'single-item' within the 'echoSetsSection'.
    // Each 'single-item' here represents an echo set recommendation.
    const echoSetItems = echoSetsSection.find(".single-item");
    echoSetItems.each((i, echoSetItem) => {
        // Selecting the percentage element within each echo set item.
        const percentageElement = $(echoSetItem).find(".percentage p");
        const percentage = percentageElement.length
            ? percentageElement.text().trim()
            : "";

        // Selecting the set name from the accordion button within each echo set item.
        const setNameElement = $(echoSetItem).find(
            ".ww-set-accordion .accordion-button"
        );
        const setName = setNameElement.length
            ? $(setNameElement)
                .contents() // Get all child nodes, including text and elements
                .filter((i, el) => el.type === "text") // Filter out only text nodes
                .text() // Get the text content of the filtered text nodes
                .trim()
            : "";

        let echoName = "";
        // Selecting the echo name from the 'information' div that follows each echo set item.
        // It looks for a list 'ul.ww-echo-list' and then selects the name from its list items.
        const echoNameElement = $(echoSetItem).next('.information').find("ul.ww-echo-list li .ww-echo-name");
        if (echoNameElement.length > 0) {
            echoName = echoNameElement.map((i, el) => $(el).text().trim()).get().join(", "); // Join multiple echo names if present
        }

        if (percentage || setName || echoName) {
            echoSetBuilds.push({
                percentage: percentage,
                setName: setName,
                echoName: echoName,
            });
        }
    });

    return echoSetBuilds;
}

// This function extracts the echo stats such as distributions and costs.
function extractEchoStats(buildsTab, $) {
    const echoStats = [];
    // Selecting all 'h6' elements that are immediately followed by an element with class 'main-stats'.
    // These 'h6' elements usually contain the echo stat distribution titles like "4-3-3-1-1:".
    const statsSections = buildsTab.find("h6:has(+ .main-stats)");

    if (!statsSections.length) {
        console.error("Echo Stats section not found.");
        return echoStats;
    }

    statsSections.each((i, statsSection) => {
        const distribution = $(statsSection).text().trim();
        // Selecting the next sibling element with class 'main-stats' and then finding all 'box' elements within it.
        // Each 'box' represents a cost tier (4-cost, 3-cost, etc.) in the echo stat distribution.
        const statsBoxes = $(statsSection).next().find(".box");
        const stats = {};

        statsBoxes.each((j, box) => {
            const cost = $(box).find(".stats-inside strong").text().trim();
            // Selecting all 'span' elements within 'ww-stat' class inside each 'box'.
            // These 'span' elements contain the stat names (CRIT DMG, ATK%, etc.).
            const statNames = $(box)
                .find(".ww-stat > span")
                .map((k, span) => $(span).text().trim())
                .get();

            // Grouping stats by their cost. If a cost already exists, it concatenates the new stats.
            if (stats[cost]) {
                stats[cost] = stats[cost].concat(statNames);
            } else {
                stats[cost] = statNames;
            }
        });

        echoStats.push({
            distribution: distribution,
            stats: stats,
        });
    });

    return echoStats;
}

// This function extracts the priority for substats used by the character.
function extractSubstatPriority(buildsTab, $) {
    let substatPriority = "";
    // Selecting the element with class 'sub-stats' and then finding the 'p' element within it.
    // This 'p' element contains the substat priority text.
    const substatElement = buildsTab.find(".sub-stats p");

    if (!substatElement.length) {
        console.error("Substat priority section not found.");
        return substatPriority;
    }

    substatPriority = substatElement.text().replace("Substats:", "").trim(); // Removing "Substats:" prefix and trimming whitespace
    return substatPriority;
}

// This function extracts the best endgame stats for a level 90 build.
function extractEndgameStats(buildsTab, $) {
    const endgameStats = {};
    // Selecting the 'div.content-header' element that contains the text "Best Endgame Stats (Level 90)".
    const endgameStatsHeader = buildsTab.find("div.content-header").filter(function () {
        return $(this).text().trim() === 'Best Endgame Stats (Level 90)';
    });

    if (!endgameStatsHeader.length) {
        console.error("Endgame stats section not found.");
        return endgameStats;
    }

    // Traversing up to the closest 'tab-inside' container, then finding the 'div.box.review.raw > ul' within it.
    // This 'ul' element contains the list of endgame stats.
    const statsContainer = endgameStatsHeader.closest('.tab-inside').find("div.box.review.raw > ul");

    if (!statsContainer.length) {
        console.error("Endgame stats list not found.");
        return endgameStats;
    }

    // Selecting direct child 'li' elements of the stats container.
    const statItems = statsContainer.find("> li"); // Only select direct children li

    statItems.each((i, statItem) => {
        // Selecting direct child 'p' elements within each 'li'.
        const pTag = $(statItem).find("> p"); // Only consider the direct p tag within the li
        if (!pTag.length) return;

        // Remove HTML comments which might interfere with text parsing
        let text = pTag.html().replace(/<!--[\s\S]*?-->/g, "").trim();

        // Handle special cases and extract statName and statValue
        let statName = "";
        let statValue = "";

        if (text.includes("CRIT DMG%")) {
            statName = "CRIT DMG%";
            statValue = text.match(/<b>([\d\-+%]+)<\/b>/)[1]; // Regex to find value within <b> tags
        } else if (text.includes("Energy Regeneration")) {
            statName = "Energy Regeneration";
            const valueMatch = text.match(/<b>([\d\-+%]+)<\/b>/);
            if (valueMatch) {
                statValue = valueMatch[1];
                let description = "";
                // For Energy Regeneration, extract the description from the nested <ul><li><p> elements.
                const nextPTag = pTag.next('ul').find('li p');
                if (nextPTag.length > 0) {
                    description = nextPTag.text().trim();
                }
                endgameStats["description"] = description;
            }
        } else if (text.includes(":")) {
            const parts = text.split(":");
            if (parts.length === 2) {
                statName = parts[0].replace(/<[^>]+>/g, '').trim(); // Remove any residual HTML tags from name
                statValue = parts[1].replace(/<[^>]+>/g, '').trim(); // Remove any residual HTML tags from value
            }
        }

        // Add stat to object if both name and value are present
        if (statName && statValue) {
            endgameStats[statName] = statValue;
        }
    });

    return endgameStats;
}

// This function extracts the recommended skill leveling priority.
function extractSkillPriority(buildsTab, $) {
    const skillPriority = [];
    // Selecting the 'div.content-header' element that contains the text "Skill Priority".
    const skillHeader = buildsTab.find("div.content-header").filter(function () {
        return $(this).text().trim() === 'Skill Priority';
    });

    if (!skillHeader.length) {
        console.error("Skill Priority section not found.");
        return skillPriority;
    }

    // Selecting the next sibling element with class 'skill-priority'.
    // This section contains the skill priority list.
    const priorityContainer = skillHeader.nextAll(".skill-priority").first();
    // Selecting all 'p' elements within 'skill' class inside the priority container.
    // Each 'p' element represents a skill in the priority list.
    const skills = priorityContainer.find(".skill p");

    skills.each((i, skill) => {
        skillPriority.push($(skill).text().trim());
    });

    return skillPriority;
}

// This main function orchestrates the entire scraping process and writes data to a file.
async function main() {
    const characterName = process.argv[2]; // Get character name from command-line arguments

    if (!characterName) {
        console.error("Please provide a character name as a command-line argument.");
        return;
    }

    const extractedData = await extractData(characterName);

    if (extractedData) {
        const outputDir = "./_";
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const outputFilename = `${outputDir}/${characterName}.json`; // Use character name in filename
        fs.writeFileSync(outputFilename, JSON.stringify(extractedData, null, 2));
        console.log(`Data extracted and saved to ${outputFilename}`);
    }
}

main();