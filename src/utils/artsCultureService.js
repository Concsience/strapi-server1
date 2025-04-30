const axios = require('axios');
const { DOMParser } = require('xmldom');


const findFile = async (baseUrl) => {
  try {
    const response = await axios.get(baseUrl)       
    const text = response.data;
    
    const reg = /]\n?,"(\/\/[a-zA-Z0-9./_\-]+)",(?:"([^"]+)"|null)/m;
    const matches = text.match(reg);
    // console.dir(matches, { depth: null, maxArrayLength: null });
    console.log("Full matches:", JSON.stringify(matches, null, 2));
    
    if (!matches) {
      throw new Error("Unable to find arts and culture image metadata URL");
    }

    const url = 'https:' + matches[1];
    const path = new URL(url).pathname.slice(1);
    const token = matches[2] || "";
    console.log("URL:", url);
    console.log("Path:", path);
    console.log("Token:", token);
    
    // Get tile info for depth information
    const tileInfo = await getTileInfo(url+"=g");
  console.log("Complete Tile Info:", JSON.stringify(tileInfo, null, 2));     
    
    return {
      filePath:url + "=g",
      infos: { path, token },
      tileInfo
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to find file: ${error.message}`);
    }
    throw new Error('Failed to find file: Unknown error');
  }
};


const getTileInfo = async (url) => {
  try {
    const response = await axios.get(url);
    const text = response.data;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    const infos = xmlDoc.getElementsByTagName("TileInfo")[0];
    if (!infos) {
      throw new Error("Invalid XML info file");
    }

    const tileWidth = parseInt(infos.getAttribute("tile_width") || "0");
    const tileHeight = parseInt(infos.getAttribute("tile_height") || "0");
    const fullPyramidDepth = parseInt(infos.getAttribute("full_pyramid_depth") || "0");
    const timestamp = parseInt(infos.getAttribute("timestamp") || "0");
    const tilerVersionNumber = infos.getAttribute("tiler_version_number") || "";

    const pyramidLevels = Array.from(infos.childNodes)
      .filter(node => node.nodeType === 1) // Element nodes only
      .map((level) => {
        const xtiles = parseInt(level.getAttribute("num_tiles_x") || "0");
        const ytiles = parseInt(level.getAttribute("num_tiles_y") || "0");
        const emptyX = parseInt(level.getAttribute("empty_pels_x") || "0");
        const emptyY = parseInt(level.getAttribute("empty_pels_y") || "0");
        const inverseScale = parseInt(level.getAttribute("inverse_scale") || "0");

        return {
          numTilesX: xtiles,
          numTilesY: ytiles,
          inverseScale,
          emptyPelsX: emptyX,
          emptyPelsY: emptyY,
          width: xtiles * tileWidth - emptyX,
          height: ytiles * tileHeight - emptyY
        };
      });

    const result = {
      width: pyramidLevels[pyramidLevels.length - 1].width,
      height: pyramidLevels[pyramidLevels.length - 1].height,
      tileSize: tileWidth,
      numTiles: pyramidLevels.reduce((acc, level) => acc + (level.numTilesX * level.numTilesY), 0),
      maxZoomLevel: pyramidLevels.length - 1,
      origin: url,
      fullPyramidDepth,
      timestamp,
      tilerVersionNumber,
      pyramidLevels
    };

    return result;
  } catch (error) {
    console.error("Error in getTileInfo:", error);
    throw new Error(`Failed to get tile info: ${error.message}`);
  }
};



module.exports = {
  findFile,
  getTileInfo}; 