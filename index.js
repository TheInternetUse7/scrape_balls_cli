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
    const weaponsSection = buildsTab.find(".build-tips");

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

        weaponBuilds.push({
            name: weaponName,
            duplicates: weaponDuplicates,
            percentage: percentage,
        });
    });

    return weaponBuilds;
}

function extractEchoSetBuilds(buildsTab, $) {
    const echoSetBuilds = [];
    const echoSetsSection = buildsTab.find(
        "div.build-tips:has(div.ww-set-accordion)"
    );

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

        const echoNameElement = $(echoSetItem)
            .parent()
            .find(".information ul li .ww-echo-name");
        const echoName = echoNameElement.length
            ? echoNameElement.text().trim()
            : "";

        echoSetBuilds.push({
            percentage: percentage,
            setName: setName,
            echoName: echoName,
        });
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
    const endgameStatsHeader = buildsTab.find("div.content-header");

    if (!endgameStatsHeader.length) {
        console.error("Endgame stats section not found.");
        return endgameStats;
    }

    const statsContainer = endgameStatsHeader
        .parent()
        .find("div.box.review.raw > ul");

    if (!statsContainer.length) {
        console.error("Endgame stats list not found.");
        return endgameStats;
    }

    const statItems = statsContainer.find("li");

    statItems.each((i, statItem) => {
        const pTag = $(statItem).find("p");
        if (!pTag.length) return;

        const parts = pTag.text().replace(/<!-- -->/g, "").split(":");
        if (parts.length === 2) {
            const statName = parts[0].trim();
            const statValue = parts[1].trim();
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