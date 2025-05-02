const cron = require('node-cron');
const { runGoogleArtsScraper } = require('../utils/google-arts-scraper');
const { uploadImageFromUrl } = require('../utils/uploadImageFromUrl');
const { uploadTiles } = require('../utils/uploadTiles');
const axios = require('axios');
const { findFile } = require('../utils/artsCultureService');
const { computeSignedPath, resolveRelative } = require('../utils/computeSignedPath');

module.exports = {
  /**
   * Initialize cron jobs
   */
  init: ({ strapi }) => {

    // Run every minute to check and update RunJobs
    cron.schedule('* * * * *', async () => {
      try {
        console.log('Checking RunJobs status at:', new Date().toISOString());

        const entries = await strapi.entityService.findMany('api::google-scrapper.google-scrapper', {
          filters: {
            runJobs: false
          }
        });

        if (entries && entries.length > 0) {
          console.log(`Found ${entries.length} entries with RunJobs set to false. Processing them.`);

          for (const entry of entries) {
            try {
              await strapi.entityService.update('api::google-scrapper.google-scrapper', entry.id, {
                data: {
                  runJobs: true,
                  jobStartedAt: new Date()
                }
              });
              console.log(`Updated entry ID ${entry.id} RunJobs to true and started job`);
              const { searchQuery, maxImages, projectUrl } = entry;
              let finalUrl = null
              if (projectUrl) {
                finalUrl = projectUrl
              } else {
                finalUrl = 'https://artsandculture.google.com/search/asset?q=' + encodeURIComponent(searchQuery)
              }
              if (!finalUrl) {
                console.error(`No URL found for entry ID ${entry.id}`);
                await strapi.entityService.update('api::google-scrapper.google-scrapper', entry.id, {
                  data: { 
                    isCompleted: false,
                    jobFinishedAt: new Date(),
                    error: {
                      message: 'No URL found for entry ID ' + entry.id
                    }
                  }
                }); 
                continue;
              }
              console.log(`Running Google Arts scraper for entry ID ${entry.id} with query: ${searchQuery}, maxImages: ${maxImages}`);

              const result = await runGoogleArtsScraper(finalUrl, maxImages);

              if (result.success && result.items.length > 0) {
                let processedCount = 0;
                for (const item of result.items) {
                  try {
                    const sanitizedId = `img-${String(item.id).replace(/[^A-Za-z0-9-_.~]/g, '')}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                    console.log(sanitizedId, item.id)
                    const existing = await strapi.entityService.findMany('api::image-metadata.image-metadata', {
                      filters: { sourceUrl: item.sourceUrl },
                      limit: 1
                    });
                    if (existing && existing.length > 0) {
                      console.log(`Image with ImageId ${sanitizedId} already exists. Skipping.`);
                      continue;
                    }
                    const data = {
                      ImageId: sanitizedId,
                      title: item.title,
                      artist: item.artist,
                      imageUrl: item.imageUrl,
                      sourceUrl: item.sourceUrl,
                    }
                    const uploadedThumbnail = await uploadImageFromUrl(item.imageUrl, data, strapi,sanitizedId);
                    await strapi.entityService.create('api::image-metadata.image-metadata', {
                      data: {
                        ...data,
                        isCompleted: false,
                        isPending: true,
                        isStarted: false,
                        scraping_job: entry.id,
                        thumbnail: uploadedThumbnail || null,
                        publishedAt: new Date()
                      }
                    });
                    processedCount++;
                    await strapi.entityService.update('api::google-scrapper.google-scrapper', entry.id, {
                      data: {
                        totalRetrivedImages: processedCount
                      }
                    });
                  } catch (error) {
                    console.error(`Error creating image metadata for item ${item.id}:`, error);
                  }
                }
              }

              await strapi.entityService.update('api::google-scrapper.google-scrapper', entry.id, {
                data: {
                  isCompleted: true,
                  jobFinishedAt: new Date(),
                  totalRetrivedImages: result.items.length
                }
              });


              console.log(`Completed scraping for entry ID ${entry.id}. Found ${result.items.length} items.`);
        
              console.log('Scraping results:', JSON.stringify(result, null, 2));

            } catch (error) {   
              console.error(`Error processing entry ID ${entry.id}:`, error);

              await strapi.entityService.update('api::google-scrapper.google-scrapper', entry.id, {
                data: {
                  isCompleted: false,
                  jobFinishedAt: new Date()  
                }
              });
            }
          }
        } else {
          console.log('No entries found with RunJobs set to false');
        }
      } catch (error) {
        console.error('Error in RunJobs check cron job:', error);
      }
    });

    // Run every minute to process pending image metadata
    cron.schedule('* * * * *', async () => {
      try {
        console.log('Checking for pending image metadata at:', new Date().toISOString());
        const isRunning = await strapi.entityService.findMany('api::image-metadata.image-metadata', {
          filters: {
            isPending: true,
            isStarted: true,
          }, 
          limit: 1
        });
        if (isRunning && isRunning.length > 0) {
          console.log('Image metadata is already running');
          return;
        } 
        // Get pending image metadata entries
        const pendingEntries = await strapi.entityService.findMany('api::image-metadata.image-metadata', {
          filters: {
            isPending: true,
            isStarted: false
          },
          limit: 10 // Process up to 10 items at a time
        });

        if (pendingEntries && pendingEntries.length > 0) {
          console.log(`Found ${pendingEntries.length} pending image metadata entries. Processing them.`);

          for (const entry of pendingEntries) {
            try {
              // Mark as started        
              await strapi.entityService.update('api::image-metadata.image-metadata', entry.id, {
                data: {
                  isStarted: true,
                  startedAt: new Date()
                }
              });

              // Fetch source content
              if (entry.sourceUrl) {
                try {
                  const { filePath, infos, tileInfo } = await findFile(entry.sourceUrl);
                  console.log('Processing file:', { filePath, infos, tileInfo });

                  // Create tile info entry
                  const tileInfoEntry = await strapi.entityService.create('api::tile-info.tile-info', {
                    data: {
                      totalTiles: tileInfo.numTiles || 0,
                      scrapedTiles: 0,
                      width: tileInfo.width || 0,
                      height: tileInfo.height || 0,
                      tileSize: tileInfo.tileSize || 0,
                      maxZoomLevel: tileInfo.maxZoomLevel || 0,
                      originUrl: entry.sourceUrl,
                      gapDataToken: infos.token,
                      gapDataPath: infos.path,
                      fullPyramidDepth: tileInfo.fullPyramidDepth || 0,
                      image_metadata: entry.id,
                      publishedAt: new Date()
                    }
                  });

                  const tileUrls = {};
                  console.log(tileInfo.pyramidLevels)
                  for (const [levelIndex, level] of tileInfo.pyramidLevels.entries()) {
                    for (let x = 0; x < level.numTilesX; x++) {
                      for (let y = 0; y < level.numTilesY; y++) {
                        try {
                          const tilePath = await computeSignedPath(
                              infos.path,
                            infos.token,
                            x,
                            y,
                            levelIndex
                          );
                          const tileUrl = await resolveRelative("/" + tilePath, tileInfo.origin);
                          tileUrls[`${infos.token}/${x}/${y}/${levelIndex}`] = tileUrl;
                        } catch (err) {
                          console.error(`Failed to generate tile URL for level ${levelIndex}, x ${x}, y ${y}:`, err);
                        }
                      }
                    }
                    // Create PyramidLevel entry after finishing this level
                    await strapi.entityService.create('api::pyramid-level.pyramid-level', {
                      data: {
                        numTilesX: level.numTilesX,
                        numTilesY: level.numTilesY,
                        inverseScale: level.inverseScale,
                        emptyPelsX: level.emptyPelsX,
                        emptyPelsY: level.emptyPelsY,
                        width: level.width,
                        height: level.height,
                        tile_info: tileInfoEntry.id,
                        publishedAt: new Date()
                      }
                    });
                  }
                  console.log(`Generated ${Object.keys(tileUrls).length} tile URLs for image ${entry.ImageId}`);
                  await uploadTiles(tileUrls, entry.ImageId, strapi,tileInfoEntry.id);
                  // Update the image metadata entry with tile info reference and mark as completed
                  await strapi.entityService.update('api::image-metadata.image-metadata', entry.id, {
                    data: {
                      isCompleted: true,
                      isPending: false,
                      finishedAt: new Date(),
                      tileInfo: tileInfoEntry.id,
                      description: infos?.description || '',
                    }
                  });

                  console.log(`Successfully processed image metadata and tile info for entry ID ${entry.id}`);
                } catch (error) {
                  console.error(`Error fetching source content for entry ID ${entry.id}:`, error);
                  await strapi.entityService.update('api::image-metadata.image-metadata', entry.id, {
                    data: {
                      isCompleted: false,
                      isPending: false,
                      error: {
                        message: error.message,
                        stack: error.stack
                      }
                    }
                  });
                }                             
              } else {
                console.error(`No sourceUrl found for entry ID ${entry.id}`);
                await strapi.entityService.update('api::image-metadata.image-metadata', entry.id, {
                  data: {
                    isCompleted: false,
                    isPending: false,      
                    error: {
                      message: 'No sourceUrl found'
                    }
                  }
                });
              }           
            } catch (error) {
              console.error(`Error processing image metadata entry ID ${entry.id}:`, error);
            }
          }
        } else {
          console.log('No pending image metadata entries found');
        }
      } catch (error) {
        console.error('Error in pending image metadata processing cron job:', error);
      }
    });
  },
};        