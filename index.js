const sharp = require('sharp')
const pSchematic = require('prismarine-schematic')
const { Vec3 } = require('vec3')
const fs = require('fs').promises
const path = require('path')

const inputImage = 'images/test-small.png'
const outputFolder = 'out'
const sectionSize = 16
const Version = '1.12'

const Block = require('prismarine-block')(Version)
const Obsidian = (require('minecraft-data')(Version)).blocksByName.obsidian
const Air = (require('minecraft-data')(Version)).blocksByName.air

async function start() {
  const { schematics, schematicsInfo } = await schematicSections({
    sectionSize: sectionSize,
    version: Version,
    inputImage: inputImage
  })
  await writeToJSON(schematics, schematicsInfo)
  console.info('Finished')
}

async function writeToJSON(schematics, info) {
  const folder = path.join(outputFolder, 'schematics')
  await fs.mkdir(folder, { recursive: true })
  await fs.writeFile(path.join(folder, 'info.json'), JSON.stringify(info))
  for (const s in schematics) {
    await fs.writeFile(path.join(folder, s.replace(/,/g, '_') + '.json'), schemToJSON(schematics[s], 2))
  }
}

async function schematicSections(options) {
  let sectionSize = options.sectionSize
  let version = options.version
  let inputImage = options.inputImage
  const { data: buf, /** @type {import('sharp').OutputInfo} */ info } = await getPixelBuffer(inputImage)
  const numXSections = Math.ceil(info.width / sectionSize)
  const numZSections = Math.ceil(info.height / sectionSize)

  console.info('Image', info)
  console.info('Number of sections X (Width)', numXSections)
  console.info('Number of sections Z (Height)', numZSections)

  let schematics = {}

  for (let sX = 0; sX < numXSections; sX++) { // Width
    for (let sZ = 0; sZ < numZSections; sZ++) { // Height
      let schem = new pSchematic.Schematic(version, new Vec3(sectionSize, 1, sectionSize), new Vec3(0, 0, 0), [], [])
      for (let dx = 0; dx < sectionSize; dx++) { // X
        for (let dz = 0; dz < sectionSize; dz++) { // Z
          let x = sX * sectionSize + dx
          let z = sZ * sectionSize + dz
          if (x > info.width || z > info.height) {
            schem.setBlock(new Vec3(dx, 0, dz), new Block(Air.id, 0, 0))
            continue
          }

          let pixelIndex = xzToIndex(x, z, info)
          let pixel = buf[pixelIndex]
          if (pixel < 200) {
            // console.info('Pixel set', pixel, pixelIndex)
            schem.setBlock(new Vec3(dx, 0, dz), new Block(Obsidian.id, 0, 0))
          } else {
            // console.info('Pixel not set', pixel, pixelIndex)
            schem.setBlock(new Vec3(dx, 0, dz), new Block(Air.id, 0, 0))
          } 
        }
      }
      schematics[`${sX},${sZ}`] = schem
    }
  }
  const schematicsInfo = {
    sectionsWidth: numXSections,
    sectionsHeight: numZSections,
    width: info.width,
    height: info.height,
    count: numXSections * numZSections
  }
  return { schematics, schematicsInfo }
}

function xzToIndex(x, z, info) {
  return x + z * info.width
}

async function getPixelBuffer(path) {
  const { data, info } = await sharp(path)
    .toColorspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, info }
}

function schemToJSON (schem, space) {
  return JSON.stringify({
    version: schem.version,
    size: {
      x: schem.size.x,
      y: schem.size.y,
      z: schem.size.z
    },
    offset: {
      x: schem.offset.x,
      y: schem.offset.y,
      z: schem.offset.z
    },
    palette: schem.palette,
    blocks: schem.blocks
  }, null, space)
}

start()
