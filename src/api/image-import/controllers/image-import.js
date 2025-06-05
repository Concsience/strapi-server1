"use strict";

const extractDimensions = require("../../../utils/extractDimensions");

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::image-import.image-import",
  ({ strapi }) => ({
    async create(ctx) {
      const { data } = ctx.request.body;
      const { imageIds } = data;

      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return ctx.badRequest("Provide a non-empty list of imageIds");
      }

      const importBatch = await strapi.entityService.create(
        "api::image-import.image-import",
        {
          data: { imageIds },
        }
      );

      const jobs = await Promise.all(
        imageIds.map((id) =>
          strapi.entityService.create("api::image-job.image-job", {
            data: {
              imageId: id,
              status: "processing",
              importBatch: importBatch.id,
            },
          })
        )
      );

      // Background processing
      setImmediate(async () => {
        try {
        for (const [index, id] of imageIds.entries()) {
          const job = jobs[index];
          try {
            const metadata = await strapi.entityService.findOne(
              "api::image-metadata.image-metadata",
              id
            );
            console.log(metadata, "======>");
            if (!metadata) throw new Error("Metadata not found");

            const productsheet = await strapi.entityService.create(
              "api::productsheet1.productsheet1",
              {
                data: {
                  image_metadata: metadata.id,
                  artname: metadata.title|| null,
                  AboutTheWork: metadata?.artwork_metadata?.description|| null,
                   Dimensions: metadata?.artwork_metadata?.physicalDimensions|| null,
                   creator: metadata?.artist|| null,
                   TypeofWork:metadata?.artwork_metadata?.type|| null,
                  MaterialsUsed: metadata?.artwork_metadata?.medium|| null,
                  publishedAt: new Date(),
                },
              }
            );
            console.log(productsheet, "======>");
            // const dimensions = extractDimensions(metadata?.artwork_metadata?.physicalDimensions);
            const art = await strapi.entityService.create(
              "api::artists-work.artists-work",
              {
                data: {
                  artThumbnail: metadata?.thumbnail|| null,
                  artname: metadata.title,
                  productsheet: productsheet.id,
                  original_width:metadata?.artwork_metadata?.width||null,
                  original_height:metadata?.artwork_metadata?.height||null,
                  base_price_per_cm_square:metadata?.artwork_metadata?.base_price_per_cm_square ||"0.10",
                  max_size:metadata?.artwork_metadata?.maxSize || "30",
                  publishedAt: new Date(),
                },
              }
            );
            console.log(art, "======> art created");
            let artist = await strapi.entityService.findMany(
              "api::artist.artist",
              {
                filters: { name: metadata.artist },
              }
            );
            console.log(artist, "======> artist found");
            if (!artist || artist.length === 0) {
              artist = await strapi.entityService.create("api::artist.artist", {
                data: {
                  name: metadata.artist,
                  art: art.id,
                  publishedAt: new Date(),
                },
              });
              const update = await strapi.entityService.update(
                "api::artists-work.artists-work",
                art.id,
                {
                  data: { artist: artist.id },
                }
              );
              console.log(update, "======> update1");
            } else {
              const update = await strapi.entityService.update(
                "api::artists-work.artists-work",
                art.id,
                {
                  data: { artist: artist?.[0]?.id },
                }
              );
              console.log(update, artist?.[0]?.id, "======> update2");
            }

            await strapi.entityService.update(
              "api::image-job.image-job",
              job.id,
              {
                data: { status: "done" },
              }
            );
          } catch (err) {
            await strapi.entityService.update(
              "api::image-job.image-job",
              job.id,
              {
                data: {
                  status: "failed",
                  errorMessage: err.message,
                },
              }
            );
            console.error(err, "======> error");
            strapi.log.error(`Failed to process image ${id}: ${err}`);
          }
        }
        } catch (err) {
          console.log(err, "======> error");
          strapi.log.error(`Failed to process image : ${err.message}`);
        }
      });

      return ctx.send(
        { message: "Import started", importId: importBatch.id },
        202
      );
    },
  })
);
