const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

async function extractData(characterName) {
    try {
        const url = `https://www.prydwen.gg/wuthering-waves/characters/${characterName}`;
        console.log(`Fetching HTML from ${url}...`);
        const response = await axios.get(url);
        const html = response.data;
        console.log("HTML fetched successfully.");

        const $ = cheerio.load(html);
        console.log("HTML loaded into Cheerio.");

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

        const allData = {
            weaponBuilds: weaponData,
            echoSetBuilds: echoSetsData,
            echoStats: echoStatsData,
            substatPriority: substatPriorityData,
            endgameStats: endgameStatsData,
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

function extractWeaponBuilds(buildsTab, $) {
    const weaponBuilds = [];
    const weaponsSection = buildsTab.find(".build-tips").first();

    if (!weaponsSection.length) {
        console.error("Weapons section not found.");
        return weaponBuilds;
    }

    const weaponItems = weaponsSection.find(".single-item");

    weaponItems.each((i, weaponItem) => {
        const percentageElement = $(weaponItem).find(".percentage p");
        const percentage = percentageElement.length
            ? percentageElement.text().trim()
            : "";

        const weaponNameElement = $(weaponItem).find(".ww-weapon-name");
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

function extractEchoSetBuilds(buildsTab, $) {
    const echoSetBuilds = [];
    const echoSetsSection = buildsTab.find("div.build-tips").last();

    if (!echoSetsSection.length) {
        console.error("Echo Sets section not found.");
        return echoSetBuilds;
    }

    const echoSetItems = echoSetsSection.find(".single-item");
    echoSetItems.each((i, echoSetItem) => {
        const percentageElement = $(echoSetItem).find(".percentage p");
        const percentage = percentageElement.length
            ? percentageElement.text().trim()
            : "";

        const setNameElement = $(echoSetItem).find(
            ".ww-set-accordion .accordion-button"
        );
        const setName = setNameElement.length
            ? $(setNameElement)
                .contents()
                .filter((i, el) => el.type === "text")
                .text()
                .trim()
            : "";

        let echoName = "";
        const echoNameElement = $(echoSetItem).next('.information').find("ul.ww-echo-list li .ww-echo-name");
        if (echoNameElement.length > 0) {
            echoName = echoNameElement.map((i, el) => $(el).text().trim()).get().join(", ");
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

function extractEchoStats(buildsTab, $) {
    const echoStats = [];
    const statsSections = buildsTab.find("h6:has(+ .main-stats)");

    if (!statsSections.length) {
        console.error("Echo Stats section not found.");
        return echoStats;
    }

    statsSections.each((i, statsSection) => {
        const distribution = $(statsSection).text().trim();
        const statsBoxes = $(statsSection).next().find(".box");
        const stats = {};

        statsBoxes.each((j, box) => {
            const cost = $(box).find(".stats-inside strong").text().trim();
            const statNames = $(box)
                .find(".ww-stat > span")
                .map((k, span) => $(span).text().trim())
                .get();

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

function extractSubstatPriority(buildsTab, $) {
    let substatPriority = "";
    const substatElement = buildsTab.find(".sub-stats p");

    if (!substatElement.length) {
        console.error("Substat priority section not found.");
        return substatPriority;
    }

    substatPriority = substatElement.text().replace("Substats:", "").trim();
    return substatPriority;
}

function extractEndgameStats(buildsTab, $) {
    const endgameStats = {};
    const endgameStatsHeader = buildsTab.find("div.content-header").filter(function () {
        return $(this).text().trim() === 'Best Endgame Stats (Level 90)';
    });

    if (!endgameStatsHeader.length) {
        console.error("Endgame stats section not found.");
        return endgameStats;
    }

    const statsContainer = endgameStatsHeader.closest('.tab-inside').find("div.box.review.raw > ul");

    if (!statsContainer.length) {
        console.error("Endgame stats list not found.");
        return endgameStats;
    }

    const statItems = statsContainer.find("> li"); // Only select direct children li

    statItems.each((i, statItem) => {
        const pTag = $(statItem).find("> p"); // Only consider the direct p tag within the li
        if (!pTag.length) return;

        // Remove HTML comments
        let text = pTag.html().replace(/<!--[\s\S]*?-->/g, "").trim();

        // Handle special cases and extract statName and statValue
        let statName = "";
        let statValue = "";

        if (text.includes("CRIT DMG%")) {
            statName = "CRIT DMG%";
            statValue = text.match(/<b>([\d\-+%]+)<\/b>/)[1];
        } else if (text.includes("Energy Regeneration")) {
            statName = "Energy Regeneration";
            const valueMatch = text.match(/<b>([\d\-+%]+)<\/b>/);
            if (valueMatch) {
                statValue = valueMatch[1];
                let description = "";
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
                statValue = parts[1].replace(/<[^>]+>/g, '').trim();
            }
        }

        // Add stat to object if both name and value are present
        if (statName && statValue) {
            endgameStats[statName] = statValue;
        }
    });

    return endgameStats;
}

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