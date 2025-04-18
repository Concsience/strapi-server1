const cron = require('node-cron');
const {runGoogleArtsScraper}  = require('../utils/google-arts-scraper');
const { uploadImageFromUrl } = require('../utils/uploadImageFromUrl');


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
              
              const searchQuery = entry.searchQuery || 'art';
              const maxImages = entry.maxImages || 50;
              
              console.log(`Running Google Arts scraper for entry ID ${entry.id} with query: ${searchQuery}, maxImages: ${maxImages}`);
              
              const result = await runGoogleArtsScraper(searchQuery, maxImages);

              if (result.success && result.items.length > 0) {
                let processedCount = 0;
                for (const item of result.items) {
                  try {
                    const sanitizedId = `img-${String(item.id).replace(/[^A-Za-z0-9-_.~]/g, '')}`;
                  const existing = await strapi.entityService.findMany('api::image-metadata.image-metadata', {
                    filters: { ImageId: sanitizedId },
                    limit: 1
                  });
                  if (existing && existing.length > 0) {
                    console.log(`Image with ImageId ${sanitizedId} already exists. Skipping.`);
                    continue;
                  }
                  const uploadedThumbnail = await uploadImageFromUrl(item.imageUrl);
                  await strapi.entityService.create('api::image-metadata.image-metadata', {
                    data: {
                      ImageId: sanitizedId,
                      title: item.title,
                      artist: item.artist,
                      imageUrl: item.imageUrl,
                      sourceUrl: item.sourceUrl,
                      isCompleted: false,
                      isPending: true,
                      isStarted: false,
                      scraping_job: entry.id,
                      thumbnail: uploadedThumbnail?.id || null,
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
  },
}; 