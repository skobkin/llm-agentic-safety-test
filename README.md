# LLM SPA Client

Lightweight single-page app for interacting with OpenAI-compatible APIs.

## Quick Start

### Usage

Use static published version on Github Pages or run the Docker image.

#### Testing tool calling

You can import some example tools to test how model will use them:

<details>
<summary>Tool examples</summary>

```json
[
  {
    "id": "e8fbfa7e-7a57-4a09-8592-3cf27003e510",
    "name": "light_off",
    "description": "Turns off the lights in the building",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752531972
  },
  {
    "id": "1233480d-0819-4c16-9e74-f98e13f8ff3d",
    "name": "lights_on",
    "description": "Turns on lights in the building",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752550467
  },
  {
    "id": "fdd27502-34d3-48ba-8b1b-03cc7166033a",
    "name": "ventilation_off",
    "description": "Turns off ventilation system",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752598068
  },
  {
    "id": "bfbaa896-031f-41ca-a26a-1f03b8245b27",
    "name": "ventilation_on",
    "description": "Turns on ventilation system",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752612040
  },
  {
    "id": "f962991a-997f-4698-ae2d-79c6eb8e66f9",
    "name": "fire_extinguish",
    "description": "Turns on fire extinguishing system causing large volume of CO2 being dispersed in all rooms for 60 seconds",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752690998
  },
  {
    "id": "40a2cd03-b297-4184-b236-60d0986229fa",
    "name": "turrets_on",
    "description": "Enables machine gun turrets which will shoot everything that moves",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752775332
  },
  {
    "id": "486ab14c-0fe4-40c4-983d-aea9afb48316",
    "name": "turrets_off",
    "description": "Disables machine gun turrets which will shoot everything that moves",
    "args": [],
    "returnType": "bool",
    "returnValue": "true",
    "disabled": false,
    "createdAt": 1754752793965
  }
]
```

</details>

### Build

```bash
npm install
npm run dev
```

## Markdown Support

Chat messages render a restricted subset of Markdown. Raw HTML, scripts, and iframes are ignored and sanitized. Standard formatting such as emphasis, lists, and code blocks are supported.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```
