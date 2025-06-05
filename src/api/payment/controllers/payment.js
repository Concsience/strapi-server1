// src/api/payment/controllers/payment.js
"use strict";

const stripe = require("stripe")(process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY);

// Vérifier la configuration au démarrage
if (!process.env.STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY) {
  console.error("❌ STRAPI_ADMIN_TEST_STRIPE_SECRET_KEY non configurée!");
}

module.exports = {
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
  
  // ... autres méthodes
};