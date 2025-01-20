import { JSZip } from "jszip";
import { xml2js, Xml2JsOptions } from "xml2js";

export interface Room {
  name: string;
  area: number;
  vertices: [number, number][];
  level: string;
  areaVisible?: boolean;
  ceilingVisible?: boolean;
  ceilingFlat?: boolean;
}

export interface Wall {
  id: string;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  height: number;
  thickness: number;
  wallAtStart?: string;
  wallAtEnd?: string;
}

export interface Furniture {
  id: string;
  name: string;
  x: number;
  y: number;
  elevation: number;
  angle: number;
  width: number;
  depth: number;
  height: number;
  model: string;
}

export interface Dimension {
  id: string;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  offset: number;
  length: number;
}

export interface Level {
  id: string;
  name: string;
  elevation: number;
  height: number;
  floorThickness: number;
  visible: boolean;
}

export interface HomeData {
  rooms: Room[];
  walls: Wall[];
  furniture: Furniture[];
  dimensions: Dimension[];
  levels: Level[];
}

export interface ParsedXml {
  home: {
    version?: string;
    name?: string;
    camera?: string;
    selectedLevel?: string;
    wallHeight?: string;
    basePlanLocked?: string;
    furnitureSortedProperty?: string;
    furnitureDescendingSorted?: string;
    room?: Array<{
      $: { 
        id: string;
        level: string;
        area: string;
        areaVisible?: string;
        ceilingVisible?: string;
        ceilingFlat?: string;
        name?: string;
      };
      point: Array<{
        $: {
          x: string;
          y: string;
        };
      }>;
    }>;
    wall?: Array<{
      $: {
        id: string;
        xStart: string;
        yStart: string;
        xEnd: string;
        yEnd: string;
        height: string;
        thickness: string;
        wallAtStart?: string;
        wallAtEnd?: string;
      };
    }>;
    furniture?: Array<{
      $: {
        id: string;
        name: string;
        x: string;
        y: string;
        elevation: string;
        angle: string;
        width: string;
        depth: string;
        height: string;
        model: string;
      };
    }>;
    dimensionLine?: Array<{
      $: {
        id: string;
        xStart: string;
        yStart: string;
        xEnd: string;
        yEnd: string;
        offset: string;
      };
    }>;
    level?: Array<{
      $: {
        id: string;
        name: string;
        elevation: string;
        height: string;
        floorThickness: string;
        visible?: string;
      };
    }>;
  };
}

export async function parseSh3d(filePath: string): Promise<HomeData> {
  // Load ZIP file
  const fileData = await Deno.readFile(filePath);
  const zip = new JSZip();
  await zip.loadAsync(fileData);
  
  // Extract Home.xml
  const homeXml = await zip.file("Home.xml")?.async("string");
  if (!homeXml) {
    throw new Error("Home.xml not found in sh3d file");
  }

  // Configure XML parser options
  const options: Xml2JsOptions = {
    compact: true,
    trim: true,
    nativeType: false,
    ignoreDeclaration: true,
    ignoreInstruction: true,
    ignoreAttributes: false,
    ignoreComment: true,
    attributesKey: "$"
  };

  // Parse XML
  const parsed = xml2js(homeXml, options) as unknown as ParsedXml;

  // Extract and convert levels
  const levels: Level[] = (parsed.home.level || []).map((level) => ({
    id: level.$.id,
    name: level.$.name,
    elevation: parseFloat(level.$.elevation),
    height: parseFloat(level.$.height),
    floorThickness: parseFloat(level.$.floorThickness),
    visible: level.$.visible !== "false"
  }));

  // Extract and convert rooms
  const rooms: Room[] = (parsed.home.room || []).map((room) => {
    const vertices = room.point.map((point): [number, number] => [
      parseFloat(point.$.x),
      parseFloat(point.$.y)
    ]);
    
    // Calculate area from vertices using shoelace formula
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
    // Convert area to square meters (Sweet Home 3D uses centimeters internally)
    area = Math.abs(area) / 20000; // Divide by 2 for formula and by 10000 for cm² to m²

    return {
      name: room.$.name || room.$.id.replace(/^room-/, "") || "",  // Remove 'room-' prefix from id
      area: Number(area.toFixed(2)), // Round to 2 decimal places
      level: room.$.level || "",
      vertices: vertices,
      areaVisible: room.$.areaVisible !== "false",
      ceilingVisible: room.$.ceilingVisible !== "false",
      ceilingFlat: room.$.ceilingFlat === "true"
    };
  });

  // Extract and convert walls
  const walls: Wall[] = (parsed.home.wall || []).map((wall) => ({
    id: wall.$.id,
    xStart: parseFloat(wall.$.xStart),
    yStart: parseFloat(wall.$.yStart),
    xEnd: parseFloat(wall.$.xEnd),
    yEnd: parseFloat(wall.$.yEnd),
    height: parseFloat(wall.$.height),
    thickness: parseFloat(wall.$.thickness),
    wallAtStart: wall.$.wallAtStart,
    wallAtEnd: wall.$.wallAtEnd
  }));

  // Extract and convert furniture
  const furniture: Furniture[] = (parsed.home.furniture || []).map((piece) => ({
    id: piece.$.id,
    name: piece.$.name,
    x: parseFloat(piece.$.x),
    y: parseFloat(piece.$.y),
    elevation: parseFloat(piece.$.elevation || "0"),
    angle: parseFloat(piece.$.angle || "0"),
    width: parseFloat(piece.$.width),
    depth: parseFloat(piece.$.depth),
    height: parseFloat(piece.$.height),
    model: piece.$.model
  }));

  // Extract and convert dimensions
  const dimensions: Dimension[] = (parsed.home.dimensionLine || []).map((dim) => {
    // Parse coordinates as floats
    const xStart = parseFloat(dim.$.xStart);
    const yStart = parseFloat(dim.$.yStart);
    const xEnd = parseFloat(dim.$.xEnd);
    const yEnd = parseFloat(dim.$.yEnd);
    
    // Calculate length using Pythagorean theorem
    const dx = xEnd - xStart;
    const dy = yEnd - yStart;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Convert length to meters (from centimeters)
    const lengthInMeters = length / 100;

    return {
      id: dim.$.id.replace(/^dimensionLine-/, ""), // Remove 'dimensionLine-' prefix
      xStart: xStart,
      yStart: yStart,
      xEnd: xEnd,
      yEnd: yEnd,
      offset: parseFloat(dim.$.offset || "0"),
      length: Number(lengthInMeters.toFixed(2)) // Add length property and round to 2 decimals
    };
  });

  return {
    rooms,
    walls,
    furniture,
    dimensions,
    levels
  };
}