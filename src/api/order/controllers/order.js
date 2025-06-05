"use strict";

// ✅ IMPORTANT : Charger les variables d'environnement en premier
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, "../../../../../.env") });

const axios = require("axios");

// ✅ Vérifier que la clé est maintenant disponible
console.log("🔑 Stripe key loaded:", !!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);

// ✅ Initialisation de Stripe
const stripe = require("stripe")(
  process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY
);


/**
 *  order controller
 */
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  
  // NEW: Create order without payment processing (payment already handled by frontend)
  async createWithoutPayment(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized("You are not authorized!");
    }

    const { total_price, shipping_cost, status, stripe_payment_id, stripe_payment_method_id } =
      ctx.request.body.data;

    console.log("🔍 Creating order without payment processing:", {
      total_price,
      shipping_cost,
      status,
      stripe_payment_id,
      user_id: user.id
    });

    try {
      const order = await strapi.service("api::order.order").create({
        data: {
          total_price: total_price,
          shipping_cost: shipping_cost || 0,
          status: status || "paid", // Default to paid since payment is already processed
          stripe_payment_id: stripe_payment_id, // Reference to the PaymentIntent
          user: user.id,
        },
      });

      console.log("✅ Order created successfully:", order.id);

      return ctx.send({
        success: true,
        message: "Order created successfully",
        order: order,
      });
    } catch (err) {
      console.error("❌ Error creating order:", err);
      ctx.throw(500, "An error occurred while creating the order.");
    }
  },

  async create(ctx) {
    // ✅ Vérifier que Stripe est bien initialisé
    if (!stripe || !process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY) {
      console.error("Stripe is not properly initialized!");
      return ctx.internalServerError("Payment service is not available");
    }

    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized("You are not authorized!");
    }

    const { totalprice, paymentMethodeId, address, shipping_cost } =
      ctx.request.body.data;

    try {
      const stripeCustomer = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      const order = await strapi.service("api::order.order").create({
        data: {
          total_price: totalprice,
          user: user.id,
          status: "pending",
        },
      });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round((totalprice + shipping_cost) * 100) || 0,
        currency: "eur",
        payment_method: paymentMethodeId,
        customer: stripeCustomer?.data?.[0].id,
        off_session: true,
        confirm: true,
        shipping: {
          name: address.nom + " " + address.prenom,
          address: {
            line1: address.addresse,
            city: address.ville,
            state: address.region,
            postal_code: address.codePostal,
          },
        },
        metadata: {
          orderId: order.id,
        },
      });

      const updatedOrder = await strapi
        .service("api::order.order")
        .update(order.id, {
          data: {
            stripe_payment_id: intent.id,
            shipping_cost: shipping_cost,
          },
        });

      return ctx.send({
        success: true,
        message: "Order created successfully",
        paymentIntent: intent,
        order: updatedOrder,
      });
    } catch (err) {
      if (err.type === "StripeCardError") {
        return ctx.send({
          success: false,
          message: "Payment failed. Please check your card details.",
          code: "CARD_ERROR",
        });
      }

      console.error("Stripe error:", err);
      ctx.throw(500, "An error occurred while processing the payment.");
    }
  },

  async stripeWebhook(ctx) {
    const sig = ctx.request.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      const rawBody = ctx.request.body[Symbol.for("unparsedBody")];
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
      console.error(
        `⚠️  Webhook signature verification failed: ${err.message}`
      );
      ctx.response.status = 400;
      return ctx.send(`Webhook Error: ${err.message}`);
    }

    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    const existingOrder = await strapi.documents("api::order.order").findOne({
      documentId: orderId,

      populate: {
        ordered_items: {
          populate: "*",
        },
        user: {
          populate: "*",
        },
      }
    });

    const orderedItem = await strapi.documents("api::ordered-item.ordered-item").findMany({
      filters: {
        order: {
          id: orderId,
        },
      },
    });

    let status;
    switch (event.type) {
      case "payment_intent.succeeded":
        status = "paid";

        const invoice = await stripe.invoices.create({
          customer: paymentIntent.customer,
          auto_advance: true,
          description: `Invoice for order #${existingOrder.id}`,
          metadata: { orderId: existingOrder.id },
          shipping_details: {
            name:
              existingOrder.user.addresses[0].nom +
              " " +
              existingOrder.user.addresses[0].prenom,
            address: {
              line1: existingOrder.user.addresses[0].addresse,
              city: existingOrder.user.addresses[0].ville,
              country: "FR",
            },
          },
          custom_fields: [
            {
              name: "SIRET",
              value: "93032314200016", // ✅ Corrigé: doit être une string
            },
            {
              name: "Code APE",
              value: "58.11Z",
            },
          ],
          footer: "TVA non applicable, article 293 B du CGI",
        });

        for (const item of orderedItem) {
          const hasArt = item.arttitle && item.arttitle.trim() !== "";
          const hasBook = item.book_title && item.book_title.trim() !== "";

          const description = hasArt
            ? `${item.arttitle} (${item.width}x${item.height}) - 3 ART`
            : hasBook
            ? `${item.book_title} - 5 ART`
            : "No title provided";

          await stripe.invoiceItems.create({
            customer: paymentIntent.customer,
            unit_amount: Math.round(item.price * 100),
            currency: "eur",
            description,
            quantity: item.quantity,
            invoice: invoice.id,
          });
        }

        await stripe.invoiceItems.create({
          customer: paymentIntent.customer,
          amount: Math.round(existingOrder.shipping_cost * 100),
          currency: "eur",
          description: "Shipping Cost",
          invoice: invoice.id,
        });

        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id
        );
        const invoicePdfUrl = finalizedInvoice.invoice_pdf;

        let invoicePdfBuffer = null;
        if (invoicePdfUrl) {
          const response = await axios.get(invoicePdfUrl, {
            responseType: "arraybuffer",
          });
          invoicePdfBuffer = response.data;
        }

        await strapi.documents("api::order.order").update({
          documentId: orderId,
          data: { stripe_invoice_id: invoice.id, status }
        });

        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: existingOrder.user.email,
            subject: "Payment Invoice from ARTEDUSA",
            text: `Hallo ${existingOrder.user.firstName}, your payment has been received.`,
            html: `
                <p>Hallo ${existingOrder.user.firstName},</p>
                <p>Thank you for your purchase. We have received your payment.</p>
                <p><strong>ID Order:</strong> ${existingOrder.id}</p>
                <p><strong>Total:</strong> €${
                  paymentIntent.amount_received / 100
                }</p>
                    `,
            attachments: invoicePdfBuffer
              ? [
                  {
                    filename: `invoice-${existingOrder.id}.pdf`,
                    content: invoicePdfBuffer,
                  },
                ]
              : [],
          });

        break;

      case "payment_intent.payment_failed":
        status = "failed";
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return (ctx.response.status = 200);
    }

    await strapi.documents("api::order.order").update({
      documentId: orderId,
      data: { status }
    });
    ctx.response.status = 200;
  },

  async createSetupIntent(ctx) {
    console.log("📨 createSetupIntent appelé");
    
    try {
      // Vérifier l'authentification
      const user = ctx.state.user;
      if (!user) {
        console.log("❌ Utilisateur non authentifié");
        return ctx.unauthorized("Authentication required");
      }

      console.log("📊 Création SetupIntent pour:", user.email);

      // Créer ou récupérer le customer Stripe
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log("✅ Customer existant trouvé:", customer.id);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            strapi_user_id: user.id.toString()
          }
        });
        console.log("✅ Nouveau customer créé:", customer.id);
      }

      // Créer le SetupIntent pour sauvegarder la carte
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        automatic_payment_methods: {
          enabled: true,
        },
        usage: 'off_session', // Permet d'utiliser la carte plus tard
        metadata: {
          user_id: user.id.toString(),
          user_email: user.email
        }
      });

      console.log("✅ SetupIntent créé:", setupIntent.id);

      // Retourner la réponse
      ctx.send({ 
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id 
      });

    } catch (error) {
      console.error("❌ Erreur dans createSetupIntent:", error);
      
      // Gérer les erreurs Stripe spécifiquement
      if (error.type === "StripeAuthenticationError") {
        ctx.throw(500, "Erreur de configuration Stripe");
      } else if (error.type === "StripeInvalidRequestError") {
        ctx.throw(400, error.message);
      } else {
        ctx.throw(500, "Erreur lors de la création du setup intent");
      }
    }
  },

  async createPaymentIntent(ctx) {
    console.log("🔍 [Strapi Controller] createPaymentIntent appelé");
    console.log("🔍 [Strapi Controller] Headers reçus:", Object.keys(ctx.request.headers || {}));
    console.log("🔍 [Strapi Controller] Authorization header:", ctx.request.headers?.authorization?.substring(0, 30) + "...");
    console.log("🔍 [Strapi Controller] Body reçu:", ctx.request.body);
    
    try {
      // Vérifier l'authentification
      const user = ctx.state.user;
      console.log("🔍 [Strapi Controller] User dans state:", !!user);
      console.log("🔍 [Strapi Controller] User details:", user ? { id: user.id, email: user.email } : "null");
      
      if (!user) {
        console.log("❌ [Strapi Controller] Utilisateur non authentifié");
        return ctx.unauthorized("Authentication required");
      }

      // Extraire et valider les données
      const { amount, currency, metadata } = ctx.request.body;
      
      console.log("📊 Données reçues:", {
        amount,
        currency,
        metadata,
        userEmail: user.email
      });

      // Validation
      if (!amount || amount <= 0) {
        return ctx.badRequest("Amount must be greater than 0");
      }

      if (!currency) {
        return ctx.badRequest("Currency is required");
      }

      // Créer ou récupérer le customer Stripe
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log("✅ Customer existant trouvé:", customer.id);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            strapi_user_id: user.id.toString()
          }
        });
        console.log("✅ Nouveau customer créé:", customer.id);
      }

      // Créer le PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        customer: customer.id,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          user_id: user.id.toString(),
          user_email: user.email,
          ...metadata
        }
      });

      console.log("✅ PaymentIntent créé:", paymentIntent.id);

      // Retourner la réponse
      ctx.send({ 
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id 
      });

    } catch (error) {
      console.error("❌ Erreur dans createPaymentIntent:", error);
      
      // Gérer les erreurs Stripe spécifiquement
      if (error.type === "StripeAuthenticationError") {
        ctx.throw(500, "Erreur de configuration Stripe");
      } else if (error.type === "StripeInvalidRequestError") {
        ctx.throw(400, error.message);
      } else {
        ctx.throw(500, "Erreur lors de la création du paiement");
      }
    }
  },
}));