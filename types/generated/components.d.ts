import type { Schema, Attribute } from '@strapi/strapi';

export interface SignupSignupform extends Schema.Component {
  collectionName: 'components_signup_signupforms';
  info: {
    displayName: 'signupform';
    icon: 'filter';
    description: '';
  };
  attributes: {
    email: Attribute.Email & Attribute.Required;
    password: Attribute.Password;
    surname: Attribute.String;
    firstName: Attribute.String;
    Nickname: Attribute.String;
    telephone: Attribute.String;
    createAcct: Attribute.String;
  };
}

export interface SignupSignUp extends Schema.Component {
  collectionName: 'components_signup_sign_ups';
  info: {
    displayName: 'SignUP';
    icon: 'filter';
    description: '';
  };
  attributes: {
    SignUpHero: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    herotext: Attribute.String;
    herotext1: Attribute.String;
    herotext2: Attribute.String;
    signupfield: Attribute.Component<'signup.signupform', true>;
  };
}

export interface SigninSignIn extends Schema.Component {
  collectionName: 'components_signin_sign_ins';
  info: {
    displayName: 'SignIN';
    icon: 'paperPlane';
    description: '';
  };
  attributes: {
    herotext1: Attribute.String;
    herotext2: Attribute.String;
    herotext3: Attribute.String;
    textfield: Attribute.Component<'signin.sign-in-form', true>;
    signInImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface SigninSignInForm extends Schema.Component {
  collectionName: 'components_signin_sign_in_forms';
  info: {
    displayName: 'signInForm';
  };
  attributes: {
    signInEmail: Attribute.Email;
    signInPassword: Attribute.Password;
    Connexion: Attribute.String;
    signInText: Attribute.String;
  };
}

export interface ProductcardProductcard extends Schema.Component {
  collectionName: 'components_productcard_productcards';
  info: {
    displayName: 'productcard';
    description: '';
  };
  attributes: {
    width: Attribute.String;
    height: Attribute.String;
    price: Attribute.String;
  };
}

export interface LongDescriptionsProductsheetdescriptions
  extends Schema.Component {
  collectionName: 'components_long_descriptions_productsheetdescriptions';
  info: {
    displayName: 'productsheetdescriptions';
  };
  attributes: {
    Historyofthework: Attribute.Text;
    TechnicalDetails: Attribute.Text;
    Citation: Attribute.Text;
    SignificationEtImpact: Attribute.Text;
    Provenance: Attribute.Text;
    AdditionalResources: Attribute.Text;
  };
}

export interface HeaderHeader extends Schema.Component {
  collectionName: 'components_header_headers';
  info: {
    displayName: 'Header';
    icon: 'filter';
    description: '';
  };
  attributes: {
    menu: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    websiteName: Attribute.String;
    lastcol: Attribute.Component<'header.col', true>;
  };
}

export interface HeaderCol extends Schema.Component {
  collectionName: 'components_header_cols';
  info: {
    displayName: 'col';
    icon: 'filter';
  };
  attributes: {
    text1: Attribute.String;
    text2: Attribute.String;
    text3: Attribute.String;
    text4: Attribute.String;
  };
}

export interface FooterFooter extends Schema.Component {
  collectionName: 'components_footer_footers';
  info: {
    displayName: 'Footer';
    icon: 'folder';
    description: '';
  };
  attributes: {
    columnText: Attribute.Component<'footer.first-column', true>;
    secondColumn: Attribute.Component<'footer.first-column', true>;
    thirdColumn: Attribute.Component<'footer.first-column', true>;
    columnImage: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface FooterFirstColumn extends Schema.Component {
  collectionName: 'components_footer_first_columns';
  info: {
    displayName: 'first-column';
    icon: 'filter';
    description: '';
  };
  attributes: {
    text1: Attribute.String;
    text2: Attribute.String;
    text3: Attribute.String;
    text4: Attribute.String;
    text5: Attribute.String;
    text6: Attribute.String;
    text7: Attribute.String;
  };
}

export interface HomepageHero5 extends Schema.Component {
  collectionName: 'components_homepage_hero5s';
  info: {
    displayName: 'hero5';
    icon: 'cube';
  };
  attributes: {
    hero5Image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    hero5label1: Attribute.String;
    hero5label2: Attribute.String;
  };
}

export interface HomepageHero4 extends Schema.Component {
  collectionName: 'components_homepage_hero4s';
  info: {
    displayName: 'hero4';
    icon: 'cube';
  };
  attributes: {
    hero4Image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    hero4Label1: Attribute.String;
    hero4label2: Attribute.String;
    hero4Label3: Attribute.String;
  };
}

export interface HomepageHero3 extends Schema.Component {
  collectionName: 'components_homepage_hero3s';
  info: {
    displayName: 'hero3';
    icon: 'cube';
  };
  attributes: {
    hero3image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    hero3label1: Attribute.String;
    hero3label2: Attribute.String;
  };
}

export interface HomepageHero2 extends Schema.Component {
  collectionName: 'components_homepage_hero2s';
  info: {
    displayName: 'hero2';
    icon: 'cube';
  };
  attributes: {
    hero2Image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    hero2Label: Attribute.String;
  };
}

export interface HomepageHero1 extends Schema.Component {
  collectionName: 'components_homepage_hero1s';
  info: {
    displayName: 'hero1';
    icon: 'cube';
    description: '';
  };
  attributes: {
    hero1Image: Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    hero1Text: Attribute.String;
    hero1Label2: Attribute.String;
    hero1Label3: Attribute.String;
    hero1label4: Attribute.String;
  };
}

export interface CartproductcardCartproductcard extends Schema.Component {
  collectionName: 'components_cartproductcard_cartproductcards';
  info: {
    displayName: 'cartproductcard';
    description: '';
  };
  attributes: {
    arttitle: Attribute.String;
    width: Attribute.String;
    height: Attribute.String;
    price: Attribute.String;
    art: Attribute.Relation<
      'cartproductcard.cartproductcard',
      'oneToOne',
      'api::artists-work.artists-work'
    >;
  };
}

export interface DescriptionsLongdescriptions extends Schema.Component {
  collectionName: 'components_descriptions_longdescriptions';
  info: {
    displayName: 'longdescriptions';
  };
  attributes: {
    Historyofthework: Attribute.Text;
    TechnicalDetails: Attribute.Text;
    Citation: Attribute.Text;
    SignificationEtImpact: Attribute.Text;
    Provenance: Attribute.Text;
    AdditionalResources: Attribute.Text;
  };
}

export interface DetailsDetails extends Schema.Component {
  collectionName: 'components_details_details';
  info: {
    displayName: 'details';
    icon: 'archive';
  };
  attributes: {
    Papier: Attribute.String;
    Couverture: Attribute.String;
    Datedeparution: Attribute.String;
    ISBN: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'signup.signupform': SignupSignupform;
      'signup.sign-up': SignupSignUp;
      'signin.sign-in': SigninSignIn;
      'signin.sign-in-form': SigninSignInForm;
      'productcard.productcard': ProductcardProductcard;
      'long-descriptions.productsheetdescriptions': LongDescriptionsProductsheetdescriptions;
      'header.header': HeaderHeader;
      'header.col': HeaderCol;
      'footer.footer': FooterFooter;
      'footer.first-column': FooterFirstColumn;
      'homepage.hero5': HomepageHero5;
      'homepage.hero4': HomepageHero4;
      'homepage.hero3': HomepageHero3;
      'homepage.hero2': HomepageHero2;
      'homepage.hero1': HomepageHero1;
      'cartproductcard.cartproductcard': CartproductcardCartproductcard;
      'descriptions.longdescriptions': DescriptionsLongdescriptions;
      'details.details': DetailsDetails;
    }
  }
}
