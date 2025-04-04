# Project Overview

Wc3 Risk System is a portable custom game system for Warcraft 3. Risk is based off of the ideas and concepts from the<br> board game Risk: Global Domination.
The system is designed to be easily used by others who are wanting to create their own version of Risk in Warcraft 3 with minimal coding invovled.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Introduction

Welcome to the Wc3 Risk System, my passion project and a labor of love for the Warcraft 3 gaming community. Inspired by the classic board game "Risk: Global Domination," I set out to create an immersive custom game experience within the Warcraft 3 universe, offering players an engaging and thrilling multiplayer real-time strategy (RTS) adventure.

**Inspiration and Background**<br>
The idea for the Wc3 Risk System was born out of my deep affection for both Warcraft 3 and the strategic gameplay of "Risk." Combining the best of both worlds, my goal is to deliver an accessible yet intricate gaming experience that appeals to both casual players and seasoned strategists.

**Key Highlights**

- Engage in epic battles with up to 23 players in a Free-for-All (FFA) or Team style gameplay.
- Experience different game modes, including the intense 1v1 mode and inventive variations like "Capitals."
- Enjoy a user-friendly system that facilitates easy customization, allowing aspiring developers and modders to create their own Risk-inspired games within Warcraft 3.

**Target Audience**<br>
My risk system is designed for fellow Warcraft 3 enthusiasts who crave a unique and challenging multiplayer experience. Whether you're seeking strategic thrills or are eager to dive into the world of custom game creation, I warmly welcome you to explore the Wc3 Risk System.

## Features

- Typescript based project that requires no code changes outside of configs to be fully useable
- Easily configure codebase through clear and conside config files, no code editing needed!
- Support for 2-23 Players in Free-For-All or Team Games.
- Support for Single Player training mode
- In game settings that allow host to change various aspects of the session. (Victory Conditions, Diplomacy, Fog of War, Gold Sending, Promode)
- In game and external stat tracking (Roughly 40-50 stats tracked per player per game)

## Getting Started

**Requirements**

1. [Node.js](https://nodejs.org/) \*Node version 18 or greater, as of 8/1/2023 it has been tested with version 18.17.0 LTS.
2. Warcraft III verison 1.31.0 or greater.

**Project Setup**

1. [Download](https://github.com/dtchitt/wc3-risk-system/archive/refs/heads/main.zip) (or clone) the repo and cd into the project root.

```bash
cd wc3-risk-system
```

2. Install the dependencies.

```
npm install
```

3. Configure your project by creating a .env file with gameExecutable evnrionment variable that properly points to your Warcraft III game executable.<br>

**Setting up .env**

To simplify collaboration, an .env file is used to store local references to the game executable as well as a build folder that is accessible from within the game. If you haven't already, start by creating a .env file in the repository root directory. Adjust the following sample environment values to point to your local executable and build directory. These values are injected into the config.json files when running commands.

Ensure that the .env file is not committed to the repository.

Windows Template:

```
GAME_EXECUTABLE=C:\\Program Files (x86)\\Warcraft III\\_retail_\\x86_64\\Warcraft III.exe
OUTPUT_FOLDER=C:\\Users\\{USERNAME}\\Documents\\Warcraft III\\Maps\\Download\\(0) testing
TAG_NAME=dev
```

MacOS Template:

```
GAME_EXECUTABLE=/Applications/Warcraft III/_retail_/x86_64/Warcraft III.app/Contents/MacOS/Warcraft III
OUTPUT_FOLDER=/Users/{USERNAME}/Library/Application Support/Blizzard/Warcraft III/Maps/Download/(0) testing
TAG_NAME=dev
```

Running the build command will automatically generate the path and required directories. This includes injecting the map version number. The above settings would generate a file in the output folder named `Risk Europe 2.7.4-preview.w3x`.

Check out the base [wc3-ts-template](https://cipherxof.github.io/w3ts/docs/getting-started) for more detials on installation and usage

## Usage

**Testing the project locally**

```
npm run test
```

**Building the project for release**

```
npm run build
```

## Documentation

TODO

## Publish builds

This project uses Github Actions to publish its builds. Maps are named `Risk Europe v[Major].[Minor].w3x`. Example, `Risk Europe v2.60.w3x`.

The fastest way to publish a new build as a release based on the main branch is to push a tag.

Run the following commands:

```
git tag v2.60
git push origin v2.60
```

Replace the values as you see fit.

## Contributing

TODO

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
