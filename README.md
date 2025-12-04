# Project Overview 
Wc3 Risk System is a portable custom game system for Warcraft 3. Risk is based off of the ideas and concepts from the
board game Risk: Global Domination. The system is designed to be easily used by others who are wanting to create their own version of Risk in Warcraft 3 with minimal coding involved.

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Introduction
Welcome to the Wc3 Risk System, a passion project and a labor of love for the Warcraft 3 gaming community. Inspired by the classic board game "Risk: Global Domination," this project aims to create an immersive custom game experience within the Warcraft 3 universe, offering players an engaging and thrilling multiplayer real-time strategy (RTS) adventure.

### Inspiration and Background
The idea for the Wc3 Risk System was born out of a deep affection for both Warcraft 3 and the strategic gameplay of "Risk." Combining the best of both worlds, the goal is to deliver an accessible yet intricate gaming experience that appeals to both casual players and seasoned strategists.

### Key Highlights

- Engage in epic battles with up to 23 players in a Free-for-All (FFA) or Team style gameplay.
- Experience different game modes, including the intense 1v1 mode and inventive variations like "Capitals."
- Enjoy a user-friendly system that facilitates easy customization, allowing aspiring developers and modders to create their own Risk-inspired games within Warcraft 3.

### Target Audience
This risk system is designed for fellow Warcraft 3 enthusiasts who crave a unique and challenging multiplayer experience. Whether you're seeking strategic thrills or are eager to dive into the world of custom game creation, the Wc3 Risk System welcomes exploration.

## Features
- Typescript based project that requires no code changes outside of configs to be fully useable
- Easily configure codebase through clear and concise config files, no code editing needed!
- Support for 2-23 Players in Free-For-All or Team Games.
- Support for Single Player training mode
- In game settings that allow host to change various aspects of the session. (Victory Conditions, Diplomacy, Fog of War, Gold Sending, Promode)
- In game and external stat tracking (Roughly 40-50 stats tracked per player per game)

## Getting Started
### Requirements

- Node.js *Node version 18 or greater, as of 8/1/2023 it has been tested with version 18.17.0 LTS.
- Warcraft III version 1.31.0 or greater.

### Project Setup

1. Download (or clone) the repo and cd into the project root.
   ```
   cd wc3-risk-system
   ```
2. Install the dependencies.
   ```
   npm install
   ```
3. Configure your project by creating a .env file with gameExecutable environment variable that properly points to your Warcraft III game executable.

### Setting up .env

To simplify collaboration, an .env file is used to store local references to the game executable as well as a build folder that is accessible from within the game. If you haven't already, start by creating a .env file in the repository root directory. Adjust the following sample environment values to point to your local executable and build directory. These values are injected into the config.json files when running commands.

Ensure that the .env file is not committed to the repository.

**Windows Template:**

```
GAME_EXECUTABLE=C:\\Program Files (x86)\\Warcraft III\\_retail_\\x86_64\\Warcraft III.exe
OUTPUT_FOLDER=C:\\Users\\{USERNAME}\\Documents\\Warcraft III\\Maps\\Download\\(0) testing
TAG_NAME=dev
```

**MacOS Template:**

```
GAME_EXECUTABLE=/Applications/Warcraft III/_retail_/x86_64/Warcraft III.app/Contents/MacOS/Warcraft III
OUTPUT_FOLDER=/Users/{USERNAME}/Library/Application Support/Blizzard/Warcraft III/Maps/Download/(0) testing
TAG_NAME=dev
```

Running the build command will automatically generate the path and required directories. This includes injecting the map version number. The above settings would generate a file in the output folder named `Risk Europe 2.7.4-preview.w3x`.

Check out the base [wc3-ts-template](https://cipherxof.github.io/w3ts/docs/getting-started) for more detials on installation and usage

## Usage
### Testing the project locally

```
npm run test <terrain>

npm run test europe
npm run test asia
```

### Building the project for release

```
npm run build <terrain>

npm run build europe
npm run build asia
```

This instruction may fail if you have saved through the World Editor. The error message looks like this:

```
Error: ByteStream: readInt32Array: premature end - want 18399232 bytes but have 1063
    at BinaryStream.readInt32Array (C:\Users\micro\workdir\wc3-risk-system\node_modules\mdx-m3-viewer-th\src\common\binarystream.ts:346:13)
    at RandomUnitTable.load (C:\Users\micro\workdir\wc3-risk-system\node_modules\mdx-m3-viewer-th\src\parsers\w3x\w3i\randomunittable.ts:19:31)
    at War3MapW3i.load (C:\Users\micro\workdir\wc3-risk-system\node_modules\mdx-m3-viewer-th\src\parsers\w3x\w3i\file.ts:149:23)
    at updateStrings (C:\Users\micro\workdir\wc3-risk-system\scripts\build.ts:99:6)
    at createMapFromDir (C:\Users\micro\workdir\wc3-risk-system\scripts\build.ts:55:2)
    at main (C:\Users\micro\workdir\wc3-risk-system\scripts\build.ts:43:2)
    at Object.<anonymous> (C:\Users\micro\workdir\wc3-risk-system\scripts\build.ts:123:1)
    at Module._compile (node:internal/modules/cjs/loader:1565:14)
    at Module.m._compile (C:\Users\micro\workdir\wc3-risk-system\node_modules\ts-node\src\index.ts:858:23)
    at node:internal/modules/cjs/loader:1708:10
```

The solution is to restore the war3map.w3i file.

Run the following command to restore it to the version on main. The purpose here is to restore the file back to a version before the World Editor save.

```
git restore --source main -- maps\risk_europe.w3x\war3map.w3i
```

You can now build the map again.

### Publish builds
This project uses Github Actions to publish its builds. To publish a new version simply create a new release with a unique version tag. Once published, wait until the github actions have completed building the artifacts and attached them to the release.

Builds include `Risk_Europe_X.YZ.w3x` and `Risk_Europe_X.YZ_w3c.w3x`.
The version with w3c suffix includes specific build instructions that ensures that the version automatically launches the 1v1 ladder matchup required by the W3Champions platform.

The reason for a X.YZ version format is that the custom map list is sorted alphabetically. This creates issues when using semver, as the version would not be ordered alphabetically as such, making it difficult for the end user when browsing map versions.

## Documentation
TODO

## Contributing

Contributions to this project are welcome! However, please note that contributing requires verification that pull requests can build and run in a WarCraft III client that has a valid license. Contributors are expected to use their own license or purchase one from Blizzard. **No licenses will be provided upon request.**

To contribute:
1. Fork the repository
2. Create your feature branch
3. Ensure your changes build and run successfully in a licensed WarCraft III client
4. Submit a pull request with a clear description of your changes

## License
This project is licensed under the MIT License - see the LICENSE file for details.