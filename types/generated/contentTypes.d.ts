import type { Schema, Attribute } from '@strapi/strapi';

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    name: 'Permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    name: 'User';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    username: Attribute.String;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    registrationToken: Attribute.String & Attribute.Private;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    preferedLanguage: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    name: 'Role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    name: 'Api Token';
    singularName: 'api-token';
    pluralName: 'api-tokens';
    displayName: 'Api Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    name: 'API Token Permission';
    description: '';
    singularName: 'api-token-permission';
    pluralName: 'api-token-permissions';
    displayName: 'API Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    name: 'Transfer Token';
    singularName: 'transfer-token';
    pluralName: 'transfer-tokens';
    displayName: 'Transfer Token';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    lastUsedAt: Attribute.DateTime;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    expiresAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    name: 'Transfer Token Permission';
    description: '';
    singularName: 'transfer-token-permission';
    pluralName: 'transfer-token-permissions';
    displayName: 'Transfer Token Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    singularName: 'file';
    pluralName: 'files';
    displayName: 'File';
    description: '';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    alternativeText: Attribute.String;
    caption: Attribute.String;
    width: Attribute.Integer;
    height: Attribute.Integer;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    ext: Attribute.String;
    mime: Attribute.String & Attribute.Required;
    size: Attribute.Decimal & Attribute.Required;
    url: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    singularName: 'folder';
    pluralName: 'folders';
    displayName: 'Folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    singularName: 'release';
    pluralName: 'releases';
    displayName: 'Release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    timezone: Attribute.String;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    singularName: 'release-action';
    pluralName: 'release-actions';
    displayName: 'Release Action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    contentType: Attribute.String & Attribute.Required;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    isEntryValid: Attribute.Boolean;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    singularName: 'locale';
    pluralName: 'locales';
    collectionName: 'locales';
    displayName: 'Locale';
    description: '';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          min: 1;
          max: 50;
        },
        number
      >;
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    name: 'permission';
    description: '';
    singularName: 'permission';
    pluralName: 'permissions';
    displayName: 'Permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    name: 'role';
    description: '';
    singularName: 'role';
    pluralName: 'roles';
    displayName: 'Role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    description: Attribute.String;
    type: Attribute.String & Attribute.Unique;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    name: 'user';
    description: '';
    singularName: 'user';
    pluralName: 'users';
    displayName: 'User';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    resetPasswordToken: Attribute.String & Attribute.Private;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    firstName: Attribute.String;
    Surname: Attribute.String;
    telephone: Attribute.String;
    addresses: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::address.address'
    >;
    cart: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::cart.cart'
    >;
    orders: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::order.order'
    >;
    wishlist: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::wishlist.wishlist'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiActivitiestimelineActivitiestimeline
  extends Schema.CollectionType {
  collectionName: 'activitiestimelines';
  info: {
    singularName: 'activitiestimeline';
    pluralName: 'activitiestimelines';
    displayName: 'activitiestimeline';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    label: Attribute.String;
    artists: Attribute.Relation<
      'api::activitiestimeline.activitiestimeline',
      'manyToMany',
      'api::artist.artist'
    >;
    arts: Attribute.Relation<
      'api::activitiestimeline.activitiestimeline',
      'oneToMany',
      'api::artists-work.artists-work'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::activitiestimeline.activitiestimeline',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::activitiestimeline.activitiestimeline',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAddressAddress extends Schema.CollectionType {
  collectionName: 'addresses';
  info: {
    singularName: 'address';
    pluralName: 'addresses';
    displayName: 'Address';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    owner: Attribute.Relation<
      'api::address.address',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    nom: Attribute.String;
    prenom: Attribute.String;
    region: Attribute.String;
    addresse: Attribute.String;
    codePostal: Attribute.String;
    ville: Attribute.String;
    department: Attribute.String;
    telephone: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::address.address',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::address.address',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiArtistArtist extends Schema.CollectionType {
  collectionName: 'artists';
  info: {
    singularName: 'artist';
    pluralName: 'artists';
    displayName: 'Artist';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    name: Attribute.String;
    image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    description: Attribute.Text;
    art: Attribute.Relation<
      'api::artist.artist',
      'oneToMany',
      'api::artists-work.artists-work'
    >;
    DOB: Attribute.String;
    DOD: Attribute.String;
    backgroundImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    timeline_1s: Attribute.Relation<
      'api::artist.artist',
      'manyToMany',
      'api::timeline1.timeline1'
    >;
    activitiestimelines: Attribute.Relation<
      'api::artist.artist',
      'manyToMany',
      'api::activitiestimeline.activitiestimeline'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::artist.artist',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::artist.artist',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiArtistsWorkArtistsWork extends Schema.CollectionType {
  collectionName: 'artists_works';
  info: {
    singularName: 'artists-work';
    pluralName: 'artists-works';
    displayName: 'arts';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    artimage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    artname: Attribute.String;
    artist: Attribute.Relation<
      'api::artists-work.artists-work',
      'manyToOne',
      'api::artist.artist'
    >;
    popularityscore: Attribute.Integer;
    cart_items: Attribute.Relation<
      'api::artists-work.artists-work',
      'oneToMany',
      'api::cart-item.cart-item'
    >;
    ordered_items: Attribute.Relation<
      'api::artists-work.artists-work',
      'oneToMany',
      'api::ordered-item.ordered-item'
    >;
    original_width: Attribute.String;
    original_height: Attribute.String;
    base_price_per_cm_square: Attribute.String;
    productsheet: Attribute.Relation<
      'api::artists-work.artists-work',
      'oneToOne',
      'api::productsheet1.productsheet1'
    >;
    max_size: Attribute.String;
    wishlists: Attribute.Relation<
      'api::artists-work.artists-work',
      'manyToMany',
      'api::wishlist.wishlist'
    >;
    activitiestimeline: Attribute.Relation<
      'api::artists-work.artists-work',
      'manyToOne',
      'api::activitiestimeline.activitiestimeline'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::artists-work.artists-work',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::artists-work.artists-work',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiAuthorbookAuthorbook extends Schema.CollectionType {
  collectionName: 'authorbooks';
  info: {
    singularName: 'authorbook';
    pluralName: 'authorbooks';
    displayName: 'authorbook';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    bookImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    bookTitle: Attribute.String;
    author: Attribute.String;
    quote: Attribute.String;
    epoque: Attribute.String;
    language: Attribute.String;
    Reliure: Attribute.String;
    ISBN: Attribute.String;
    Datedeparution: Attribute.String;
    Couverture: Attribute.String;
    page: Attribute.String;
    format: Attribute.String;
    papier: Attribute.String;
    list_collection: Attribute.Relation<
      'api::authorbook.authorbook',
      'manyToOne',
      'api::list-collection.list-collection'
    >;
    price: Attribute.Integer;
    description: Attribute.Component<'descriptions.description-book'>;
    illustrator: Attribute.String;
    cart_items: Attribute.Relation<
      'api::authorbook.authorbook',
      'oneToMany',
      'api::cart-item.cart-item'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::authorbook.authorbook',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::authorbook.authorbook',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCartCart extends Schema.CollectionType {
  collectionName: 'carts';
  info: {
    singularName: 'cart';
    pluralName: 'carts';
    displayName: 'cart';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    user: Attribute.Relation<
      'api::cart.cart',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    cart_items: Attribute.Relation<
      'api::cart.cart',
      'manyToMany',
      'api::cart-item.cart-item'
    >;
    total_price: Attribute.Decimal;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::cart.cart', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    updatedBy: Attribute.Relation<'api::cart.cart', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiCartItemCartItem extends Schema.CollectionType {
  collectionName: 'cart_items';
  info: {
    singularName: 'cart-item';
    pluralName: 'cart-items';
    displayName: 'cartItem';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    arttitle: Attribute.String;
    width: Attribute.String;
    height: Attribute.String;
    art: Attribute.Relation<
      'api::cart-item.cart-item',
      'manyToOne',
      'api::artists-work.artists-work'
    >;
    carts: Attribute.Relation<
      'api::cart-item.cart-item',
      'manyToMany',
      'api::cart.cart'
    >;
    artistname: Attribute.String;
    paper_type: Attribute.Relation<
      'api::cart-item.cart-item',
      'manyToOne',
      'api::paper-type.paper-type'
    >;
    price: Attribute.Decimal;
    book: Attribute.Relation<
      'api::cart-item.cart-item',
      'manyToOne',
      'api::authorbook.authorbook'
    >;
    book_title: Attribute.String;
    author_name: Attribute.String;
    qty: Attribute.Integer;
    total_price: Attribute.Decimal;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cart-item.cart-item',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cart-item.cart-item',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCinemaCinema extends Schema.CollectionType {
  collectionName: 'cinemas';
  info: {
    singularName: 'cinema';
    pluralName: 'cinemas';
    displayName: 'cinema';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    title: Attribute.String;
    image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    description: Attribute.Text;
    timeline_7_art: Attribute.Relation<
      'api::cinema.cinema',
      'manyToOne',
      'api::timeline-7-art.timeline-7-art'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::cinema.cinema',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::cinema.cinema',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiFavoriteFavorite extends Schema.CollectionType {
  collectionName: 'favorites';
  info: {
    singularName: 'favorite';
    pluralName: 'favorites';
    displayName: 'favorite';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    user: Attribute.Relation<
      'api::favorite.favorite',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::favorite.favorite',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::favorite.favorite',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiFiveArtPageFiveArtPage extends Schema.SingleType {
  collectionName: 'five_art_pages';
  info: {
    singularName: 'five-art-page';
    pluralName: 'five-art-pages';
    displayName: 'FiveArtPage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    hero_title: Attribute.String;
    hero_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    category1: Attribute.Component<'seven-art-page.seven-art-page'>;
    category2: Attribute.Component<'seven-art-page.seven-art-page'>;
    category3: Attribute.Component<'seven-art-page.seven-art-page'>;
    discover1: Attribute.Component<'seven-art-page.discover'>;
    discover2: Attribute.Component<'seven-art-page.discover'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::five-art-page.five-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::five-art-page.five-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiGoogleScrapperGoogleScrapper extends Schema.CollectionType {
  collectionName: 'google_scrappers';
  info: {
    singularName: 'google-scrapper';
    pluralName: 'google-scrappers';
    displayName: 'ScrapingJob';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    runJobs: Attribute.Boolean;
    type: Attribute.String;
    searchQuery: Attribute.String;
    maxImages: Attribute.Integer;
    isCompleted: Attribute.Boolean;
    jobStartedAt: Attribute.DateTime;
    jobFinishedAt: Attribute.DateTime;
    totalRetrivedImages: Attribute.Integer;
    jobId: Attribute.UID;
    image_metadata: Attribute.Relation<
      'api::google-scrapper.google-scrapper',
      'oneToMany',
      'api::image-metadata.image-metadata'
    >;
    error: Attribute.JSON;
    projectUrl: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::google-scrapper.google-scrapper',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::google-scrapper.google-scrapper',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiHelpPageHelpPage extends Schema.SingleType {
  collectionName: 'help_pages';
  info: {
    singularName: 'help-page';
    pluralName: 'help-pages';
    displayName: 'HelpPage';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    left_image: Attribute.Media<'images'>;
    right_image: Attribute.Media<'images'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::help-page.help-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::help-page.help-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiHomepageHomepage extends Schema.SingleType {
  collectionName: 'homepages';
  info: {
    singularName: 'homepage';
    pluralName: 'homepages';
    displayName: 'Homepage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    pagecontent: Attribute.DynamicZone<
      [
        'homepage.hero5',
        'homepage.hero4',
        'homepage.hero3',
        'homepage.hero2',
        'homepage.hero1',
        'header.header',
        'header.col',
        'footer.footer',
        'footer.first-column'
      ]
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiImageMetadataImageMetadata extends Schema.CollectionType {
  collectionName: 'images_metadata';
  info: {
    singularName: 'image-metadata';
    pluralName: 'images-metadata';
    displayName: 'ImageMetadata';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    ImageId: Attribute.UID;
    title: Attribute.String;
    artist: Attribute.String;
    imageUrl: Attribute.String;
    sourceUrl: Attribute.String;
    isCompleted: Attribute.Boolean;
    isPending: Attribute.Boolean;
    startedAt: Attribute.DateTime;
    finishedAt: Attribute.DateTime;
    isStarted: Attribute.Boolean;
    scraping_job: Attribute.Relation<
      'api::image-metadata.image-metadata',
      'manyToOne',
      'api::google-scrapper.google-scrapper'
    >;
    thumbnail: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    error: Attribute.JSON;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::image-metadata.image-metadata',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::image-metadata.image-metadata',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiListCollectionListCollection extends Schema.CollectionType {
  collectionName: 'list_collections';
  info: {
    singularName: 'list-collection';
    pluralName: 'list-collections';
    displayName: 'ListCollection';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    name: Attribute.String;
    title: Attribute.String;
    image: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    authorbooks: Attribute.Relation<
      'api::list-collection.list-collection',
      'oneToMany',
      'api::authorbook.authorbook'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::list-collection.list-collection',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::list-collection.list-collection',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNosAuteurNosAuteur extends Schema.CollectionType {
  collectionName: 'nos_auteurs';
  info: {
    singularName: 'nos-auteur';
    pluralName: 'nos-auteurs';
    displayName: 'NosAuteur';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    title: Attribute.String;
    author: Attribute.String;
    image: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    date: Attribute.Date;
    description: Attribute.RichText;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::nos-auteur.nos-auteur',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::nos-auteur.nos-auteur',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiOnboardingOnboarding extends Schema.SingleType {
  collectionName: 'onboardings';
  info: {
    singularName: 'onboarding';
    pluralName: 'onboardings';
    displayName: 'Onboarding';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    title: Attribute.String;
    description: Attribute.Text;
    image: Attribute.Media<'images'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::onboarding.onboarding',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::onboarding.onboarding',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiOrderOrder extends Schema.CollectionType {
  collectionName: 'orders';
  info: {
    singularName: 'order';
    pluralName: 'orders';
    displayName: 'order';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    user: Attribute.Relation<
      'api::order.order',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    status: Attribute.String;
    ordered_items: Attribute.Relation<
      'api::order.order',
      'manyToMany',
      'api::ordered-item.ordered-item'
    >;
    total_price: Attribute.Decimal;
    stripe_payment_id: Attribute.String;
    stripe_invoice_id: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::order.order',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::order.order',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiOrderedItemOrderedItem extends Schema.CollectionType {
  collectionName: 'ordered_items';
  info: {
    singularName: 'ordered-item';
    pluralName: 'ordered-items';
    displayName: 'orderedItem';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    arttitle: Attribute.String;
    width: Attribute.String;
    height: Attribute.String;
    art: Attribute.Relation<
      'api::ordered-item.ordered-item',
      'manyToOne',
      'api::artists-work.artists-work'
    >;
    orders: Attribute.Relation<
      'api::ordered-item.ordered-item',
      'manyToMany',
      'api::order.order'
    >;
    artistname: Attribute.String;
    paper_types: Attribute.Relation<
      'api::ordered-item.ordered-item',
      'manyToMany',
      'api::paper-type.paper-type'
    >;
    price: Attribute.Decimal;
    quantity: Attribute.Integer;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::ordered-item.ordered-item',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::ordered-item.ordered-item',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPaperTypePaperType extends Schema.CollectionType {
  collectionName: 'paper_types';
  info: {
    singularName: 'paper-type';
    pluralName: 'paper-types';
    displayName: 'paper_type';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    paper_names: Attribute.String;
    paper_price_per_cm_square: Attribute.String;
    cart_items: Attribute.Relation<
      'api::paper-type.paper-type',
      'oneToMany',
      'api::cart-item.cart-item'
    >;
    ordered_items: Attribute.Relation<
      'api::paper-type.paper-type',
      'manyToMany',
      'api::ordered-item.ordered-item'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::paper-type.paper-type',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::paper-type.paper-type',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiProductSheetPageProductSheetPage extends Schema.SingleType {
  collectionName: 'product_sheet_pages';
  info: {
    singularName: 'product-sheet-page';
    pluralName: 'product-sheet-pages';
    displayName: 'ProductSheetPage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    paper_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    discover_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::product-sheet-page.product-sheet-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::product-sheet-page.product-sheet-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiProductsheet1Productsheet1 extends Schema.CollectionType {
  collectionName: 'productsheet1s';
  info: {
    singularName: 'productsheet1';
    pluralName: 'productsheet1s';
    displayName: 'productsheet';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    art: Attribute.Relation<
      'api::productsheet1.productsheet1',
      'oneToOne',
      'api::artists-work.artists-work'
    >;
    AboutTheWork: Attribute.Text;
    artname: Attribute.String;
    PersonalBackground: Attribute.Text;
    ArtMovement: Attribute.String;
    CreationPeriod: Attribute.String;
    PlaceOfCreation: Attribute.String;
    Dimensions: Attribute.String;
    TypeofWork: Attribute.String;
    MaterialsUsed: Attribute.String;
    Maintheme: Attribute.String;
    provenance: Attribute.Text;
    productsheetdescriptions: Attribute.Component<'long-descriptions.productsheetdescriptions'>;
    nationality: Attribute.String;
    creator: Attribute.String;
    logo_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    logo_name: Attribute.String;
    museum_location: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::productsheet1.productsheet1',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::productsheet1.productsheet1',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSevenArtPageSevenArtPage extends Schema.SingleType {
  collectionName: 'seven_art_pages';
  info: {
    singularName: 'seven-art-page';
    pluralName: 'seven-art-pages';
    displayName: 'SevenArtPage';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    hero_title: Attribute.String;
    hero_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios', true>;
    category1: Attribute.Component<'seven-art-page.seven-art-page', true>;
    category2: Attribute.Component<'seven-art-page.seven-art-page', true>;
    discover: Attribute.Component<'seven-art-page.discover'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::seven-art-page.seven-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::seven-art-page.seven-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSignInPageSignInPage extends Schema.SingleType {
  collectionName: 'sign_in_pages';
  info: {
    singularName: 'sign-in-page';
    pluralName: 'sign-in-pages';
    displayName: 'signInPage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    signInContent: Attribute.DynamicZone<
      [
        'signin.sign-in',
        'signin.sign-in-form',
        'footer.footer',
        'footer.first-column',
        'header.header',
        'header.col'
      ]
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::sign-in-page.sign-in-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::sign-in-page.sign-in-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiSignUpPageSignUpPage extends Schema.SingleType {
  collectionName: 'sign_up_pages';
  info: {
    singularName: 'sign-up-page';
    pluralName: 'sign-up-pages';
    displayName: 'signUpPage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    signUpContent: Attribute.DynamicZone<
      [
        'signup.signupform',
        'signup.sign-up',
        'header.header',
        'header.col',
        'footer.footer',
        'footer.first-column'
      ]
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::sign-up-page.sign-up-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::sign-up-page.sign-up-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiThreeArtPageThreeArtPage extends Schema.SingleType {
  collectionName: 'three_art_pages';
  info: {
    singularName: 'three-art-page';
    pluralName: 'three-art-pages';
    displayName: 'ThreeArtPage';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    hero_title: Attribute.String;
    hero_image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    category1: Attribute.Component<'seven-art-page.seven-art-page'>;
    category2: Attribute.Component<'seven-art-page.seven-art-page'>;
    category3: Attribute.Component<'seven-art-page.seven-art-page'>;
    category4: Attribute.Component<'seven-art-page.seven-art-page'>;
    discover: Attribute.Component<'seven-art-page.discover'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::three-art-page.three-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::three-art-page.three-art-page',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTimeline7ArtTimeline7Art extends Schema.CollectionType {
  collectionName: 'timeline_7_arts';
  info: {
    singularName: 'timeline-7-art';
    pluralName: 'timeline-7-arts';
    displayName: 'timeline_7_art';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    year: Attribute.String;
    cinemas: Attribute.Relation<
      'api::timeline-7-art.timeline-7-art',
      'oneToMany',
      'api::cinema.cinema'
    >;
    label: Attribute.String;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::timeline-7-art.timeline-7-art',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::timeline-7-art.timeline-7-art',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiTimeline1Timeline1 extends Schema.CollectionType {
  collectionName: 'timeline1s';
  info: {
    singularName: 'timeline1';
    pluralName: 'timeline1s';
    displayName: 'timeline';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    artists: Attribute.Relation<
      'api::timeline1.timeline1',
      'manyToMany',
      'api::artist.artist'
    >;
    year: Attribute.String;
    label: Attribute.Enumeration<
      [
        'Pr\u00E9histoire',
        'Antiquit\u00E9',
        'Moyen \u00C2ge',
        'Renaissance',
        'Baroque',
        'Rococo',
        'Romantisme',
        'Impressionnisme',
        'Art Moderne',
        'Art Contemporain'
      ]
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::timeline1.timeline1',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::timeline1.timeline1',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiWishlistWishlist extends Schema.CollectionType {
  collectionName: 'wishlists';
  info: {
    singularName: 'wishlist';
    pluralName: 'wishlists';
    displayName: 'wishlist';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    users_permissions_user: Attribute.Relation<
      'api::wishlist.wishlist',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    arts: Attribute.Relation<
      'api::wishlist.wishlist',
      'manyToMany',
      'api::artists-work.artists-work'
    >;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::wishlist.wishlist',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    updatedBy: Attribute.Relation<
      'api::wishlist.wishlist',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::permission': AdminPermission;
      'admin::user': AdminUser;
      'admin::role': AdminRole;
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'api::activitiestimeline.activitiestimeline': ApiActivitiestimelineActivitiestimeline;
      'api::address.address': ApiAddressAddress;
      'api::artist.artist': ApiArtistArtist;
      'api::artists-work.artists-work': ApiArtistsWorkArtistsWork;
      'api::authorbook.authorbook': ApiAuthorbookAuthorbook;
      'api::cart.cart': ApiCartCart;
      'api::cart-item.cart-item': ApiCartItemCartItem;
      'api::cinema.cinema': ApiCinemaCinema;
      'api::favorite.favorite': ApiFavoriteFavorite;
      'api::five-art-page.five-art-page': ApiFiveArtPageFiveArtPage;
      'api::google-scrapper.google-scrapper': ApiGoogleScrapperGoogleScrapper;
      'api::help-page.help-page': ApiHelpPageHelpPage;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::image-metadata.image-metadata': ApiImageMetadataImageMetadata;
      'api::list-collection.list-collection': ApiListCollectionListCollection;
      'api::nos-auteur.nos-auteur': ApiNosAuteurNosAuteur;
      'api::onboarding.onboarding': ApiOnboardingOnboarding;
      'api::order.order': ApiOrderOrder;
      'api::ordered-item.ordered-item': ApiOrderedItemOrderedItem;
      'api::paper-type.paper-type': ApiPaperTypePaperType;
      'api::product-sheet-page.product-sheet-page': ApiProductSheetPageProductSheetPage;
      'api::productsheet1.productsheet1': ApiProductsheet1Productsheet1;
      'api::seven-art-page.seven-art-page': ApiSevenArtPageSevenArtPage;
      'api::sign-in-page.sign-in-page': ApiSignInPageSignInPage;
      'api::sign-up-page.sign-up-page': ApiSignUpPageSignUpPage;
      'api::three-art-page.three-art-page': ApiThreeArtPageThreeArtPage;
      'api::timeline-7-art.timeline-7-art': ApiTimeline7ArtTimeline7Art;
      'api::timeline1.timeline1': ApiTimeline1Timeline1;
      'api::wishlist.wishlist': ApiWishlistWishlist;
    }
  }
}
