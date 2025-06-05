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

      const importBatch = await strapi.documents("api::image-import.image-import").create({
        data: { imageIds },
      });

      const jobs = await Promise.all(
        imageIds.map((id) =>
          strapi.documents("api::image-job.image-job").create({
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
            const metadataList = await strapi.documents("api::image-metadata.image-metadata").findMany({
              filters: { ImageId: id }
            });
            const metadata = metadataList[0];
            console.log(metadata, "======>");
            if (!metadata) throw new Error("Metadata not found");

            const productsheet = await strapi.documents("api::productsheet1.productsheet1").create({
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
            });
            console.log(productsheet, "======>");
            // const dimensions = extractDimensions(metadata?.artwork_metadata?.physicalDimensions);
            const art = await strapi.documents("api::artists-work.artists-work").create({
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
            });
            console.log(art, "======> art created");
            let artist = await strapi.documents("api::artist.artist").findMany({
              filters: { name: metadata.artist },
            });
            console.log(artist, "======> artist found");
            if (!artist || artist.length === 0) {
              artist = await strapi.documents("api::artist.artist").create({
                data: {
                  name: metadata.artist,
                  art: art.id,
                  publishedAt: new Date(),
                },
              });
              const update = await strapi.documents("api::artists-work.artists-work").update({
                documentId: art.documentId,
                data: { artist: artist.id }
              });
              console.log(update, "======> update1");
            } else {
              const update = await strapi.documents("api::artists-work.artists-work").update({
                documentId: art.documentId,
                data: { artist: artist?.[0]?.id }
              });
              console.log(update, artist?.[0]?.id, "======> update2");
            }

            await strapi.documents("api::image-job.image-job").update({
              documentId: job.documentId,
              data: { status: "done" }
            });
          } catch (err) {
            await strapi.documents("api::image-job.image-job").update({
              documentId: job.documentId,
              data: {
                status: "failed",
                errorMessage: err.message,
              }
            });
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
