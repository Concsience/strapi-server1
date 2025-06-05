async function getArtworkMetadata(text) {
    try {
      // Find the window.INIT_data assignment for the Asset
      const assetRegex = /window\.INIT_data\['Asset:([0-9a-f\-]+)'\]\s*=\s*(\[.*?\]);/s;
      const assetMatch = text.match(assetRegex);
      console.log("assetMatch", assetMatch)
      if (!assetMatch) {
        console.log("no assetMatch")
        return null;
      }
      if (!assetMatch?.[2]) {
        console.log("no assetMatch[2]")
        return null;
      }
      const assetArray = JSON.parse(assetMatch?.[2] || '');
      console.log("assetArray", assetArray)
      function getDetail(detailsArr, label) {
        if (!Array.isArray(detailsArr)) return undefined;
        const found = detailsArr.find((item) => item?.[0] === label);
        return found && found?.[1] && found?.[1]?.[0] ? found?.[1]?.[0]?.[0] : undefined;
      }
      let detailsArr = [];
      try {
        detailsArr = assetArray?.[2]?.[12] || [];
      } catch (e) {
        detailsArr = [];
      }
      let externalLink = undefined;
      const extLinkRaw = getDetail(detailsArr, "External Link");
      if (extLinkRaw && Array.isArray(extLinkRaw)) {
        externalLink = { name: extLinkRaw?.[0] || '', url: extLinkRaw?.[1] || '' };
      } else if (typeof extLinkRaw === 'string') {
        externalLink = { name: 'External Link', url: extLinkRaw || '' };
      }
      const meta = {
        title: assetArray?.[2]?.[2] || '',
        creator: assetArray?.[2]?.[6]?.[0] || '',
        dateCreated: assetArray?.[2]?.[3] || '',
        description: assetArray?.[2]?.[5] && assetArray?.[2]?.[5]?.[1] ? assetArray?.[2]?.[5]?.[1] : '',
        internalId: assetArray?.[1] || '',
        imageUrl: assetArray?.[2]?.[4] || '',
        token: assetArray?.[2]?.[1] || '',
        collection: assetArray?.[4]?.[0] || '',
        physicalDimensions: getDetail(detailsArr, "Physical Dimensions"),
        type: getDetail(detailsArr, "Type"),
        externalLink,
        medium: getDetail(detailsArr, "Medium"),
        inventoryNumber: getDetail(detailsArr, "Inventory Number"),
        isilNumber: getDetail(detailsArr, "ISIL Number"),
        copyrightImage: getDetail(detailsArr, "Rights"),
        artistDates: getDetail(detailsArr, "Creator Lifespan"),
        acquired: getDetail(detailsArr, "Provenance"),
        artist_dates: getDetail(detailsArr, "Artist Dates"),
        artist_biography: getDetail(detailsArr, "Artist Biography"),
        artist_nationality: getDetail(detailsArr, "Artist Nationality"),
        artist_gender: getDetail(detailsArr, "Artist Gender"),
        artist_birth_date: getDetail(detailsArr, "Artist Birth Date"),
        artist_death_date: getDetail(detailsArr, "Artist Death Date")
      };
      return meta;
    } catch (error) {
      console.log("error", error)
      return null;
    }
  }

  module.exports = { getArtworkMetadata };