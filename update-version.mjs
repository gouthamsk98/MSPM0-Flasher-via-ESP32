import fs from 'fs';

// Path to package.json
import packageJson from './package.json'  with { type: "json" };


// Increment version (basic example: increment patch version)
const versionParts = packageJson.version.split('.');
versionParts[2] = parseInt(versionParts[2]) + 1; // Increment patch version
packageJson.version = versionParts.join('.');

// Write updated package.json
fs.writeFileSync("./package.json", JSON.stringify(packageJson, null, 2), 'utf8');

console.log(`Version updated to ${packageJson.version}`);
