# AI assistance and project provenance

Project: mission-control / Beyond Earth
Team: Always Online
Team leader: Gypsyna Koh Jac Que

## Team contribution

The team supplied the mission-game concept, the Earth/Moon/Mars progression,
Mars mission sequence, requested controls, science objectives, visual references,
audio preferences, and repeated gameplay feedback. Individual members' coding
contributions are not inferred or assigned here.

## Code and data assistance

OpenAI ChatGPT/Codex assisted with implementation and debugging across the
existing game and this Mars extension. The Mars modules `MarsMission.jsx`,
`MarsWorld.jsx`, `MarsHardware.jsx`, `MarsLandscape.jsx`, `marsPhysics.js`,
`marsAudio.js`, `MarsAssembly.jsx`, `MarsAssembly.css`, `marsConfiguration.js` and `MarsMission.css` were generated with
substantial AI assistance. Codex also assisted with VAB readiness, the Earth-to-Mars
handoff, test code, documentation, and presentation preparation. Relevant source
files contain disclosure comments, and package.json records this assistance.

Earlier Earth and lunar code also received ChatGPT/Codex assistance according to
the project conversation. This disclosure does not claim that assistance was
limited to isolated difficult functions or bug fixes. Third-party libraries retain
their own licenses. Instrument outputs are simulated training data, not NASA
measurements or real evidence of mineral detection.

## Visuals

The Mars terrain, capsule, carrier and landing platform are procedural game
artwork produced through AI-assisted code. The rover is NASA/JPL's original
Perseverance GLB, not an AI-generated rover asset. Ground and rock materials are
credited CC0 photographs from Poly Haven, tinted for the scene. The Mars view and captured photos
include an `AI-assisted simulation visuals` indicator. Game screenshots used in
the presentation are labelled as AI-assisted simulation visuals. They are not
photographs of a real mission. No NASA logo, flag or mission insignia has been
generated for the new artwork or presentation. The supplied reference illustration
is not republished as a game asset or as evidence of gameplay.

NASA and other external map textures are credited separately. They are not
claimed as AI-generated or original team imagery.

## Audio

The existing piano recording, 'Hymn' by Scott Buckley, is retained unchanged under
CC BY 4.0. It is an external human-composed recording, not an AI-generated song.
Existing procedural launch/UI effects were implemented with AI coding assistance.
Mission Control narration uses the browser/operating system speech synthesizer.
No new continuous synthesized Mars drone or replacement soundtrack is included.
See public/audio/CREDITS.md and public/audio/metadata.json.

## Writing and presentation

ChatGPT/Codex assisted with the submission summary, project description,
resource list, and seven-slide demonstration deck. The team should review these
materials and ensure they reflect its actual work, selected challenge and demo.
Please select the applicable SI-use categories in the submission form.

## Scientific limits

This is an educational game, not validated aerospace software. Earth launch uses
the existing simplified model with an explicit optional circular-orbit training
assist. Interplanetary correction is a corridor-error exercise rather than a
Lambert trajectory solver. Transfer duration, terrain dimensions, solar charging,
instrument operations and communication time are compressed for gameplay.
Mars entry uses a simplified exponential atmosphere, drag and finite thrust/fuel.
The default payload uses 1300 kg dry mass and 500 kg landing propellant. The separate payload workshop now derives landing mass, fuel, thrust, battery capacity and equipment capabilities from player-selected modules. The selected rocket model is reused for Earth launch and Mars cruise. Rover suspension is a terrain-following visual approximation,
not a complete articulated rigid-body dynamics solver.

## Version 0.14 additions

Codex assisted with the cooperative room server and remote consoles, local mission records, README editing, tests and the updated seven-slide presentation. Team feedback defined the requested features.
