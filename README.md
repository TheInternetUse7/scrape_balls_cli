# Wuthering Waves Build Data Scraper

## Overview

This Node.js script is designed to scrape character build information from [Prydwen.gg's Wuthering Waves character pages](https://www.prydwen.gg/wuthering-waves/characters/). It extracts details such as:

- **Weapon Builds:** Recommended weapons, their duplicates (refinement levels), and performance percentages.
- **Echo Set Builds:** Best echo sets and recommended main echoes.
- **Echo Stats:** Optimal main stats for echo sets based on cost (4-cost, 3-cost, 1-cost).
- **Substat Priority:**  Order of importance for substats.
- **Endgame Stats:**  Target stats for level 90 characters (ATK, HP, CRIT Rate, etc.).
- **Skill Priority:** Recommended order for leveling character skills.

The scraped data is saved as JSON files, making it easy to use for personal reference, analysis, or integration into other projects.

**Please Note:** This script is intended for personal, educational, and non-commercial use. Always respect website terms of service and robots.txt when scraping websites. The accuracy and reliability of the scraped data depend on the source website.

## Prerequisites

Before running this script, ensure you have the following installed:

- **Node.js:**  You need Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).
- **npm (Node Package Manager):** npm comes bundled with Node.js.

You also need to install the required npm packages. Navigate to the directory where you've saved `index.js` in your terminal and run:

```bash
npm install axios cheerio fs
```

This command installs:

- **axios:**  For making HTTP requests to fetch the HTML content of web pages.
- **cheerio:** For parsing HTML and XML documents and navigating the DOM structure.
- **fs:**  Node.js built-in module for file system operations (used for saving the JSON output).

## Usage

To run the script and scrape data for a specific character, use the following command in your terminal:

```bash
node index.js <character_name>
```

Replace `<character_name>` with the name of the character as it appears in the Prydwen.gg URL. For example, to scrape data for **Carlotta**, you would use:

```bash
node index.js carlotta
```

To scrape data for **Jinhsi**, you would use:

```bash
node index.js jinhsi
```

**Important:** The `<character_name>` argument is case-sensitive and should match the URL path on Prydwen.gg (e.g., `carlotta`, `jinhsi`).

## Output

After successfully running the script, the scraped data will be saved as a JSON file in a directory named `_` (underscore) created in the same directory where you run the script.

The filename will be based on the character name you provided. For example:

- For `carlotta`, the output file will be `_/carlotta.json`.
- For `jinhsi`, the output file will be `_/jinhsi.json`.

Each JSON file will contain the following structure:

```json
{
  "weaponBuilds": [
    // Array of recommended weapon builds
    {
      "name": "Weapon Name",
      "duplicates": "Duplicates/Refinement Level (e.g., 5 for S5)",
      "percentage": "Performance Percentage"
    },
    // ... more weapon builds
  ],
  "echoSetBuilds": [
    // Array of recommended echo set builds
    {
      "percentage": "Performance Percentage",
      "setName": "Echo Set Name",
      "echoName": "Recommended Main Echo Name(s)"
    },
    // ... more echo set builds
  ],
  "echoStats": [
    // Array of echo stat distributions
    {
      "distribution": "Echo Distribution Type (e.g., 4-3-3-1-1:)",
      "stats": {
        "4 cost": ["Stat 1", "Stat 2"],
        "3 cost": ["Stat 1", "Stat 2", "Stat 3"],
        "1 cost": ["Stat 1", "Stat 2"]
      }
    },
    // ... more distributions if available
  ],
  "substatPriority": "String describing substat priority",
  "endgameStats": {
    // Object containing endgame stat recommendations
    "ATK": "Recommended ATK range",
    "HP": "Recommended HP value",
    // ... other endgame stats
  },
  "skillPriority": [
    // Array of skill leveling priority
    "Skill 1",
    "Skill 2",
    // ... more skills in priority order
  ]
}
```

## Disclaimer

- **Use Responsibly:** This script is provided for educational purposes only. Scraping websites should be done responsibly and ethically. Be mindful of website load and terms of service.
- **No Guarantees:** The script is provided as-is, without any guarantees of accuracy or reliability. Website structures can change, which may break the script.
- **Prydwen.gg Terms:** Ensure that your use of this script complies with Prydwen.gg's terms of service and robots.txt file.
- **Data Accuracy:** The accuracy of the scraped data depends entirely on the information presented on Prydwen.gg.

## Contributing

If you find any issues or have improvements, feel free to contribute by submitting pull requests or opening issues.
