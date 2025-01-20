// E.g. `deno task dev ../plans/baseline_design.sh3d`

import { parseSh3d, Room, Wall, Furniture, Dimension } from "@parser/mod.ts";

function printRooms(rooms: Room[]) {
  console.log("\nRooms found:");
  console.log("----------------------------------------");
  console.log("Name".padEnd(20), "Area (m²)".padStart(10), "Level".padStart(8));
  console.log("----------------------------------------");
  
  rooms.forEach(room => {
    console.log(
      room.name.padEnd(20),
      room.area.toFixed(2).padStart(10),
      room.level.toString().padStart(8)
    );
  });
  
  console.log("----------------------------------------");
  console.log(`Total: ${rooms.length} rooms found\n`);
}

function printWalls(walls: Wall[]) {
  console.log("\nWalls found:");
  console.log("----------------------------------------");
  console.log("ID".padEnd(20), "Height".padStart(10), "Thickness".padStart(10));
  console.log("----------------------------------------");
  
  walls.forEach(wall => {
    console.log(
      wall.id.padEnd(20),
      wall.height.toFixed(2).padStart(10),
      wall.thickness.toFixed(2).padStart(10)
    );
  });
  
  console.log("----------------------------------------");
  console.log(`Total: ${walls.length} walls found\n`);
}

function printFurniture(furniture: Furniture[]) {
  console.log("\nFurniture found:");
  console.log("----------------------------------------");
  console.log("Name".padEnd(20), "Model".padEnd(20), "Width".padStart(8));
  console.log("----------------------------------------");
  
  furniture.forEach(piece => {
    console.log(
      piece.name.padEnd(20),
      piece.model.padEnd(20),
      piece.width.toFixed(2).padStart(8)
    );
  });
  
  console.log("----------------------------------------");
  console.log(`Total: ${furniture.length} furniture pieces found\n`);
}

function printDimensions(dimensions: Dimension[]) {
  console.log("\nDimensions found:");
  console.log("----------------------------------------");
  console.log("ID".padEnd(20), "Length".padStart(10));
  console.log("----------------------------------------");
  
  dimensions.forEach(dim => {
    const length = Math.sqrt(
      Math.pow(dim.xEnd - dim.xStart, 2) + 
      Math.pow(dim.yEnd - dim.yStart, 2)
    );
    console.log(
      dim.id.padEnd(20),
      length.toFixed(2).padStart(10)
    );
  });
  
  console.log("----------------------------------------");
  console.log(`Total: ${dimensions.length} dimensions found\n`);
}

async function main() {
  const filePath = Deno.args[0];
  
  if (!filePath) {
    console.error("Please provide the path to the .sh3d file");
    Deno.exit(1);
  }

  try {
    const homeData = await parseSh3d(filePath);
    printRooms(homeData.rooms);
    printWalls(homeData.walls);
    printFurniture(homeData.furniture);
    printDimensions(homeData.dimensions);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`);
    console.error(error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
