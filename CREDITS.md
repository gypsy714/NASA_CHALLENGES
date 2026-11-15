# Resource credits

## NASA resources used by the game

- **Mars 2020 Perseverance rover model** - NASA/Jet Propulsion Laboratory.
  https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/
  Local file: public/mars/perseverance.glb. The original GLB is included unchanged.
  The renderer clones and rigs it for gameplay. It does not generate or alter NASA
  insignia. Original NASA identifiers in the supplied asset remain source material,
  not generated branding or an endorsement of this project.
- **Mars image texture** - NASA/JPL-Caltech, Viking imagery processed at USGS.
  https://science.nasa.gov/3d-resources/mars/
  Local file: public/mars/mars.jpg. Used on the Mars globe, not as a local terrain map.
- **Mars 2020 mission overview** - NASA/JPL.
  https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/
  Reference for corrections, protected cruise, atmospheric entry, parachute and powered descent.
- **Mars gravity and atmosphere** - NASA Glenn Research Center.
  https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mars/
  https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mars-atmosphere-equation-english/
  Used as educational references. The implemented atmosphere is an approximation.
- **CGI Moon Kit** - NASA Scientific Visualization Studio, LRO camera/altimeter data.
  https://svs.gsfc.nasa.gov/4720/
  Existing moon-color.jpg and moon-height.jpg.

NASA media guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/
No NASA endorsement is implied. The new procedural capsule, carrier and landing
platform are original game artwork, not replicas of flight hardware.

## CC0 Mars surface materials

- Rocks Ground 05: https://polyhaven.com/a/rocks_ground_05
- Rock Boulder Dry: https://polyhaven.com/a/rock_boulder_dry
- License: https://polyhaven.com/license

Diffuse, OpenGL normal and roughness maps are included locally. They are
photographic materials from Earth, artistically tinted for a fictional Mars
terrain. They are not Martian measurements or NASA surface imagery. Terrain
and cliff geometry are procedural and AI-assisted.

## Existing assets

- Earth, cloud and grass images: Three.js example texture collection.
  https://github.com/mrdoob/three.js/tree/dev/examples/textures
- Piano music: 'Hymn' by Scott Buckley, CC BY 4.0.
  https://www.scottbuckley.com.au/library/hymn/
  https://creativecommons.org/licenses/by/4.0/
  See public/audio/CREDITS.md. The original recording is unchanged.
- Mission console: procedural Blender geometry. A matching source script was
  recovered from the supplied computer's Downloads/create_mission_console.py.
  Mesh and material names match the bundled GLB. Source included under tools/.
  This establishes a local procedural source, not an independently verified
  human authorship claim. The project has received broad ChatGPT/Codex assistance.

## Software

React (MIT), Three.js (MIT), React Three Fiber (MIT), Drei (MIT), Vite (MIT),
Lucide (ISC), and Draco decoder (Apache 2.0). Dependencies and versions are in
package.json and package-lock.json. Their original license files remain applicable.
The locally hosted Draco files come from the installed Three.js distribution.
https://github.com/google/draco

